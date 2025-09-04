-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is active
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND status IN ('ACTIVE', 'APPROVED')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (is_admin());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'USER'); -- Users cannot change their own role

CREATE POLICY "Admins can update any user" ON public.users
  FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (is_admin());

-- Invitations policies
CREATE POLICY "Admins can manage invitations" ON public.invitations
  FOR ALL USING (is_admin());

CREATE POLICY "Users can view own invitations" ON public.invitations
  FOR SELECT USING (user_id = auth.uid());

-- Searches policies  
CREATE POLICY "Users can view own searches" ON public.searches
  FOR SELECT USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own searches" ON public.searches
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can update own searches" ON public.searches
  FOR UPDATE USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can delete own searches" ON public.searches
  FOR DELETE USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can view all searches" ON public.searches
  FOR SELECT USING (is_admin());

-- Companies policies
CREATE POLICY "Users can view companies from own searches" ON public.companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.searches 
      WHERE searches.id = companies.search_id 
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Users can update companies from own searches" ON public.companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.searches 
      WHERE searches.id = companies.search_id 
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Admins can view all companies" ON public.companies
  FOR SELECT USING (is_admin());

-- Enrichments policies
CREATE POLICY "Users can view enrichments for own companies" ON public.enrichments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.companies 
      JOIN public.searches ON searches.id = companies.search_id
      WHERE companies.id = enrichments.company_id 
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Users can create enrichments for own companies" ON public.enrichments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies 
      JOIN public.searches ON searches.id = companies.search_id
      WHERE companies.id = enrichments.company_id 
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "System can update enrichments" ON public.enrichments
  FOR UPDATE USING (true); -- Allow system updates for enrichment process

CREATE POLICY "Admins can view all enrichments" ON public.enrichments
  FOR SELECT USING (is_admin());

-- Reports policies
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Users can create own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can view all reports" ON public.reports
  FOR SELECT USING (is_admin());

-- Campaigns policies
CREATE POLICY "Users can manage own campaigns" ON public.campaigns
  FOR ALL USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can view all campaigns" ON public.campaigns
  FOR SELECT USING (is_admin());

-- Outreach targets policies
CREATE POLICY "Users can manage outreach targets for own campaigns" ON public.outreach_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = outreach_targets.campaign_id 
      AND campaigns.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Admins can view all outreach targets" ON public.outreach_targets
  FOR SELECT USING (is_admin());

-- Email templates policies
CREATE POLICY "Users can manage own email templates" ON public.email_templates
  FOR ALL USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can view all email templates" ON public.email_templates
  FOR SELECT USING (is_admin());

-- Email logs policies
CREATE POLICY "Users can view email logs for own campaigns" ON public.email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.campaigns 
      WHERE campaigns.id = email_logs.campaign_id 
      AND campaigns.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "System can manage email logs" ON public.email_logs
  FOR ALL USING (true); -- Allow system to manage email logs

CREATE POLICY "Admins can view all email logs" ON public.email_logs
  FOR SELECT USING (is_admin());

-- Settings policies (admin only)
CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL USING (is_admin());

-- Audit log policies
CREATE POLICY "Users can view own audit logs" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id AND is_active_user());

CREATE POLICY "Admins can view all audit logs" ON public.audit_log
  FOR SELECT USING (is_admin());

CREATE POLICY "System can create audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true); -- Allow system to create audit logs

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;