-- Initial seed data for Exit School Off-Market Tool
-- This file will be run on `supabase db reset`

-- Note: Admin user should be created via Supabase Auth UI
-- Email: admin@exitschool.com
-- Then update user role to 'ADMIN' in the users table

-- Insert sample email templates
INSERT INTO public.email_templates (
  id,
  user_id,
  name,
  subject,
  content,
  variables
) VALUES 
  (
    gen_random_uuid(),
    NULL, -- System template (no user_id means it's available to all)
    'Initial Outreach Template',
    'Partnership Opportunity with {{company_name}}',
    'Hi {{owner_name}},

I hope this email finds you well. I came across {{company_name}} and was impressed by your work in {{industry}}.

I represent Exit School, and we specialize in helping businesses like yours maximize their potential through strategic partnerships and growth opportunities.

I''d love to schedule a brief 15-minute call to discuss how we might be able to help {{company_name}} achieve its goals.

Are you available for a quick chat this week?

Best regards,
{{sender_name}}',
    '["company_name", "owner_name", "industry", "sender_name"]'
  ),
  (
    gen_random_uuid(),
    NULL, -- System template
    'Follow-up Template',
    'Following up on {{company_name}} partnership',
    'Hi {{owner_name}},

I wanted to follow up on my previous email about partnership opportunities for {{company_name}}.

I understand you''re busy running your business, but I believe we have some valuable insights that could benefit {{company_name}}''s growth trajectory.

Would you be interested in a brief 10-minute call to explore this further?

Looking forward to hearing from you.

Best regards,
{{sender_name}}',
    '["company_name", "owner_name", "sender_name"]'
  );

-- Insert sample search data for development (will only work if admin user exists)
DO $$
DECLARE
  sample_user_id UUID;
  sample_search_id UUID;
  sample_company_id UUID;
BEGIN
  -- Only insert sample data if there's an admin user
  SELECT id INTO sample_user_id FROM public.users WHERE role = 'ADMIN' LIMIT 1;
  
  IF sample_user_id IS NOT NULL THEN
    -- Insert sample search
    INSERT INTO public.searches (id, user_id, name, industry, city, state)
    VALUES (gen_random_uuid(), sample_user_id, 'Tech Companies Austin', 'Software Development', 'Austin', 'TX')
    RETURNING id INTO sample_search_id;
    
    -- Insert sample companies
    INSERT INTO public.companies (
      id, search_id, place_id, name, address, phone, website, rating, review_count, selected
    ) VALUES 
      (
        gen_random_uuid(), sample_search_id, 'tech-corp-austin', 
        'TechCorp Solutions Austin', '123 Tech Street, Austin, TX 78701',
        '(512) 555-0123', 'https://techcorp-austin.com', 4.5, 87, true
      ),
      (
        gen_random_uuid(), sample_search_id, 'dataflow-analytics', 
        'DataFlow Analytics', '456 Data Ave, Austin, TX 78702',
        '(512) 555-0124', 'https://dataflow.io', 4.7, 124, false
      ),
      (
        gen_random_uuid(), sample_search_id, 'cloudscale-systems', 
        'CloudScale Systems', '789 Cloud Blvd, Austin, TX 78703',
        '(512) 555-0125', 'https://cloudscale.net', 4.2, 56, true
      )
    RETURNING id INTO sample_company_id;
    
    -- Insert sample enrichment
    INSERT INTO public.enrichments (
      company_id, status, owner_name, owner_email, employee_count, revenue, confidence
    ) VALUES (
      sample_company_id, 'COMPLETED', 'John Smith', 'john@techcorp-austin.com', 
      45, 2500000.00, 0.85
    );
  END IF;
END $$;

-- Update initial settings (created in migration but we can enhance it)
UPDATE public.settings SET 
  pricing_config = '{"enhanced": 99, "bi": 199, "setup_fee": 0}',
  email_config = '{"from_name": "Exit School", "from_email": "hello@exitschool.com", "reply_to": "support@exitschool.com"}',
  api_keys = '{}' -- Keep empty for security
WHERE id IN (SELECT id FROM public.settings LIMIT 1);

-- Create some audit log entries for testing
INSERT INTO public.audit_log (user_id, action, entity, metadata) VALUES
  (NULL, 'SYSTEM', 'DATABASE', '{"action": "initial_seed", "timestamp": "' || NOW() || '"}'),
  (NULL, 'CREATED', 'EMAIL_TEMPLATES', '{"count": 2, "type": "system_templates"}');