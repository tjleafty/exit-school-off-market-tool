-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_entity TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_log (user_id, action, entity, entity_id, metadata)
  VALUES (p_user_id, p_action, p_entity, p_entity_id, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, full_name, status, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    'REQUESTED', -- Default status for new users
    'USER'
  );

  -- Create audit log
  PERFORM create_audit_log(
    NEW.id,
    'CREATED',
    'USER',
    NEW.id,
    jsonb_build_object('email', NEW.email, 'name', COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to create invitation
CREATE OR REPLACE FUNCTION create_invitation(
  p_user_id UUID,
  p_expires_hours INTEGER DEFAULT 168 -- 7 days
)
RETURNS TABLE(id UUID, token TEXT) AS $$
DECLARE
  invitation_id UUID;
  invitation_token TEXT;
BEGIN
  invitation_token := generate_invitation_token();
  
  INSERT INTO public.invitations (user_id, token, expires_at)
  VALUES (
    p_user_id,
    invitation_token,
    NOW() + (p_expires_hours || ' hours')::INTERVAL
  )
  RETURNING invitations.id INTO invitation_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    auth.uid(),
    'CREATED',
    'INVITATION',
    invitation_id,
    jsonb_build_object('user_id', p_user_id)
  );
  
  RETURN QUERY SELECT invitation_id, invitation_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Find and validate invitation
  SELECT * INTO invitation_record
  FROM public.invitations
  WHERE token = p_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;
    
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update invitation as accepted
  UPDATE public.invitations
  SET accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  -- Update user status
  UPDATE public.users
  SET status = 'APPROVED'
  WHERE id = invitation_record.user_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    invitation_record.user_id,
    'ACCEPTED',
    'INVITATION',
    invitation_record.id
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start enrichment process
CREATE OR REPLACE FUNCTION start_enrichment(p_company_id UUID)
RETURNS UUID AS $$
DECLARE
  enrichment_id UUID;
BEGIN
  -- Create or update enrichment record
  INSERT INTO public.enrichments (company_id, status)
  VALUES (p_company_id, 'PENDING')
  ON CONFLICT (company_id) 
  DO UPDATE SET 
    status = 'PENDING',
    updated_at = NOW()
  RETURNING id INTO enrichment_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    auth.uid(),
    'STARTED',
    'ENRICHMENT',
    enrichment_id,
    jsonb_build_object('company_id', p_company_id)
  );
  
  RETURN enrichment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update enrichment status
CREATE OR REPLACE FUNCTION update_enrichment_status(
  p_enrichment_id UUID,
  p_status enrich_status,
  p_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.enrichments
  SET 
    status = p_status,
    sources = CASE WHEN p_data IS NOT NULL THEN p_data ELSE sources END,
    updated_at = NOW()
  WHERE id = p_enrichment_id;
  
  IF FOUND THEN
    -- Create audit log
    PERFORM create_audit_log(
      NULL, -- System action
      'UPDATED',
      'ENRICHMENT',
      p_enrichment_id,
      jsonb_build_object('status', p_status)
    );
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create report
CREATE OR REPLACE FUNCTION create_report(
  p_company_id UUID,
  p_user_id UUID,
  p_tier report_tier,
  p_content_json JSONB,
  p_content_html TEXT DEFAULT NULL,
  p_pdf_path TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  report_id UUID;
BEGIN
  INSERT INTO public.reports (
    company_id,
    user_id,
    tier,
    content_json,
    content_html,
    pdf_path
  )
  VALUES (
    p_company_id,
    p_user_id,
    p_tier,
    p_content_json,
    p_content_html,
    p_pdf_path
  )
  RETURNING id INTO report_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    p_user_id,
    'CREATED',
    'REPORT',
    report_id,
    jsonb_build_object('company_id', p_company_id, 'tier', p_tier)
  );
  
  RETURN report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_searches', COUNT(DISTINCT s.id),
    'total_companies', COUNT(DISTINCT c.id),
    'selected_companies', COUNT(DISTINCT CASE WHEN c.selected THEN c.id END),
    'enrichments_completed', COUNT(DISTINCT CASE WHEN e.status = 'COMPLETED' THEN e.id END),
    'reports_generated', COUNT(DISTINCT r.id),
    'active_campaigns', COUNT(DISTINCT CASE WHEN cam.is_active THEN cam.id END)
  ) INTO stats
  FROM public.searches s
  LEFT JOIN public.companies c ON c.search_id = s.id
  LEFT JOIN public.enrichments e ON e.company_id = c.id
  LEFT JOIN public.reports r ON r.company_id = c.id AND r.user_id = p_user_id
  LEFT JOIN public.campaigns cam ON cam.user_id = p_user_id
  WHERE s.user_id = p_user_id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get system statistics (admin only)
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  SELECT jsonb_build_object(
    'total_users', COUNT(DISTINCT u.id),
    'active_users', COUNT(DISTINCT CASE WHEN u.status = 'ACTIVE' THEN u.id END),
    'pending_users', COUNT(DISTINCT CASE WHEN u.status IN ('REQUESTED', 'APPROVED') THEN u.id END),
    'total_searches', COUNT(DISTINCT s.id),
    'total_companies', COUNT(DISTINCT c.id),
    'enrichments_pending', COUNT(DISTINCT CASE WHEN e.status = 'PENDING' THEN e.id END),
    'enrichments_completed', COUNT(DISTINCT CASE WHEN e.status = 'COMPLETED' THEN e.id END),
    'reports_this_month', COUNT(DISTINCT CASE WHEN r.created_at >= date_trunc('month', NOW()) THEN r.id END),
    'active_campaigns', COUNT(DISTINCT CASE WHEN cam.is_active THEN cam.id END)
  ) INTO stats
  FROM public.users u
  LEFT JOIN public.searches s ON s.user_id = u.id
  LEFT JOIN public.companies c ON c.search_id = s.id
  LEFT JOIN public.enrichments e ON e.company_id = c.id
  LEFT JOIN public.reports r ON r.user_id = u.id
  LEFT JOIN public.campaigns cam ON cam.user_id = u.id;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.invitations
  WHERE expires_at < NOW() AND accepted_at IS NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;