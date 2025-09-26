# Manual Database Setup

Since we need to create the database schema before creating the admin user, here are the SQL commands to run directly in your Supabase dashboard:

## Step 1: Run Database Migrations

Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/ibhjrxejiyvaiflfsufb) → **SQL Editor** and run these commands:

### Migration 1: Initial Schema

```sql
-- Users table for user profiles and roles
CREATE TABLE users (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  company_name text,
  role text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED')),
  email_verified boolean DEFAULT false,
  phone text,
  avatar_url text,
  bio text,
  website_url text,
  linkedin_url text,
  subscription_tier text DEFAULT 'FREE' CHECK (subscription_tier IN ('FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE')),
  subscription_status text DEFAULT 'ACTIVE' CHECK (subscription_status IN ('ACTIVE', 'CANCELLED', 'EXPIRED')),
  subscription_expires_at timestamp with time zone,
  last_seen timestamp with time zone,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Companies table for company discovery and intelligence
CREATE TABLE companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  domain text,
  description text,
  website_url text,
  linkedin_url text,
  industry text,
  sector text,
  size_category text,
  employee_count integer,
  annual_revenue bigint,
  founded_year integer,
  headquarters_address text,
  headquarters_city text,
  headquarters_state text,
  headquarters_country text DEFAULT 'US',
  phone text,
  email text,
  logo_url text,
  social_media jsonb DEFAULT '{}',
  technologies jsonb DEFAULT '[]',
  competitors jsonb DEFAULT '[]',
  funding_info jsonb DEFAULT '{}',
  financial_metrics jsonb DEFAULT '{}',
  key_personnel jsonb DEFAULT '[]',
  recent_news jsonb DEFAULT '[]',
  enrichment_status text DEFAULT 'PENDING' CHECK (enrichment_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  enrichment_last_updated timestamp with time zone,
  enrichment_sources jsonb DEFAULT '[]',
  data_quality_score integer DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  is_verified boolean DEFAULT false,
  notes text,
  tags jsonb DEFAULT '[]',
  custom_fields jsonb DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Searches table for tracking company discovery searches
CREATE TABLE searches (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  search_criteria jsonb NOT NULL DEFAULT '{}',
  total_results integer DEFAULT 0,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  error_message text,
  results_preview jsonb DEFAULT '[]',
  filters_applied jsonb DEFAULT '{}',
  sort_criteria jsonb DEFAULT '{}',
  export_formats jsonb DEFAULT '[]',
  is_favorite boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Junction table for search results
CREATE TABLE search_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  search_id uuid REFERENCES searches(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  relevance_score float DEFAULT 0,
  match_reasons jsonb DEFAULT '[]',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(search_id, company_id)
);

-- Enrichment jobs table for tracking data enrichment processes
CREATE TABLE enrichment_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL,
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  data_enriched jsonb DEFAULT '{}',
  raw_response jsonb DEFAULT '{}',
  error_message text,
  cost_credits integer DEFAULT 0,
  processing_time_ms integer,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Reports table for AI-generated company reports
CREATE TABLE reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  report_type text DEFAULT 'COMPREHENSIVE' CHECK (report_type IN ('QUICK', 'STANDARD', 'COMPREHENSIVE', 'CUSTOM')),
  tier text DEFAULT 'BASIC' CHECK (tier IN ('BASIC', 'ENHANCED', 'PREMIUM')),
  content jsonb NOT NULL DEFAULT '{}',
  summary text,
  key_insights jsonb DEFAULT '[]',
  recommendations jsonb DEFAULT '[]',
  data_sources jsonb DEFAULT '[]',
  generation_prompt text,
  word_count integer DEFAULT 0,
  status text DEFAULT 'GENERATING' CHECK (status IN ('GENERATING', 'COMPLETED', 'FAILED', 'ARCHIVED')),
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100),
  is_shared boolean DEFAULT false,
  shared_token text UNIQUE,
  download_count integer DEFAULT 0,
  last_accessed timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Email campaigns table for automated outreach
CREATE TABLE email_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  template_subject text NOT NULL,
  template_body text NOT NULL,
  from_name text NOT NULL,
  from_email text NOT NULL,
  reply_to_email text,
  status text DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED')),
  target_list_ids jsonb DEFAULT '[]',
  total_recipients integer DEFAULT 0,
  emails_sent integer DEFAULT 0,
  emails_delivered integer DEFAULT 0,
  emails_opened integer DEFAULT 0,
  emails_clicked integer DEFAULT 0,
  emails_bounced integer DEFAULT 0,
  emails_unsubscribed integer DEFAULT 0,
  send_rate_per_hour integer DEFAULT 10,
  personalization_fields jsonb DEFAULT '{}',
  tracking_enabled boolean DEFAULT true,
  unsubscribe_link text,
  scheduled_at timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Individual email logs table
CREATE TABLE email_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES email_campaigns(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  to_email text NOT NULL,
  to_name text,
  subject text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'BOUNCED', 'FAILED', 'UNSUBSCRIBED')),
  provider text,
  provider_message_id text,
  error_message text,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone,
  unsubscribed_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- System logs table for monitoring and debugging
CREATE TABLE system_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
  category text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  request_id text,
  timestamp timestamp with time zone DEFAULT now(),
  duration integer,
  tags text[],
  environment text DEFAULT 'production',
  created_at timestamp with time zone DEFAULT now()
);

-- Error logs table for detailed error tracking
CREATE TABLE error_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  stack text,
  component_stack text,
  timestamp timestamp with time zone NOT NULL,
  user_agent text,
  ip_address inet,
  url text,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  session_id text,
  build_id text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  tags jsonb DEFAULT '{}',
  context jsonb DEFAULT '{}',
  fingerprint text,
  environment text DEFAULT 'production',
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_created_at ON companies(created_at);
CREATE INDEX idx_companies_enrichment_status ON companies(enrichment_status);

CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_status ON searches(status);
CREATE INDEX idx_searches_created_at ON searches(created_at);

CREATE INDEX idx_search_results_search_id ON search_results(search_id);
CREATE INDEX idx_search_results_company_id ON search_results(company_id);

CREATE INDEX idx_enrichment_jobs_company_id ON enrichment_jobs(company_id);
CREATE INDEX idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX idx_enrichment_jobs_created_at ON enrichment_jobs(created_at);

CREATE INDEX idx_reports_company_id ON reports(company_id);
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_created_at ON reports(created_at);

CREATE INDEX idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_created_at ON email_campaigns(created_at);

CREATE INDEX idx_email_logs_campaign_id ON email_logs(campaign_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_category ON system_logs(category);
CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);

CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_fingerprint ON error_logs(fingerprint);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at);
```

### Migration 2: Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );

-- Companies table policies
CREATE POLICY "Active users can view companies" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Active users can insert companies" ON companies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update companies they created" ON companies
  FOR UPDATE USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins can update all companies" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );

-- Searches table policies
CREATE POLICY "Users can view own searches" ON searches
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can insert own searches" ON searches
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update own searches" ON searches
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Admins can view all searches" ON searches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );

-- Search results policies
CREATE POLICY "Users can view search results for own searches" ON search_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM searches 
      WHERE id = search_id AND user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can insert search results for own searches" ON search_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM searches 
      WHERE id = search_id AND user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

-- Enrichment jobs policies
CREATE POLICY "Users can view own enrichment jobs" ON enrichment_jobs
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can insert own enrichment jobs" ON enrichment_jobs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update own enrichment jobs" ON enrichment_jobs
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

-- Reports policies
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

-- Email campaigns policies
CREATE POLICY "Users can view own campaigns" ON email_campaigns
  FOR SELECT USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can insert own campaigns" ON email_campaigns
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

CREATE POLICY "Users can update own campaigns" ON email_campaigns
  FOR UPDATE USING (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

-- Email logs policies (read-only for users)
CREATE POLICY "Users can view email logs for own campaigns" ON email_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM email_campaigns 
      WHERE id = campaign_id AND user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND status = 'ACTIVE'
    )
  );

-- System logs policies (admin only)
CREATE POLICY "Admins can view system logs" ON system_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );

CREATE POLICY "System can insert logs" ON system_logs
  FOR INSERT WITH CHECK (true);

-- Error logs policies (admin only)
CREATE POLICY "Admins can view error logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );

CREATE POLICY "System can insert error logs" ON error_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update error logs" ON error_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
  );
```

### Migration 3: Functions and Triggers

```sql
-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_searches_updated_at BEFORE UPDATE ON searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrichment_jobs_updated_at BEFORE UPDATE ON enrichment_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, company_name, email_verified)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'company_name', split_part(split_part(new.email, '@', 2), '.', 1)),
    COALESCE(new.email_confirmed_at IS NOT NULL, false)
  );
  RETURN new;
END;
$$;

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update user last_seen
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.users
  SET last_seen = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Function to clean up old logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete system logs older than 90 days
  DELETE FROM system_logs 
  WHERE created_at < now() - interval '90 days';
  
  -- Delete debug and info logs older than 30 days
  DELETE FROM system_logs 
  WHERE level IN ('DEBUG', 'INFO') AND created_at < now() - interval '30 days';
  
  -- Delete resolved error logs older than 180 days
  DELETE FROM error_logs 
  WHERE resolved = true AND created_at < now() - interval '180 days';
END;
$$;
```

## Step 2: Run the Admin Creation Script

After running all the SQL above, go back to your terminal and run:

```bash
node scripts/create-admin.js
```

This should successfully create the admin user with:
- **Email:** `admin@exitschool.com`
- **Password:** `password`

## Step 3: Test Login

1. Go to your deployed application
2. Click "Sign In"
3. Use the admin credentials
4. You should see the dashboard with admin privileges

---

**Note:** If you prefer to use the Supabase CLI instead of manual SQL, you can:
1. Run `npx supabase login` to authenticate
2. Run `npx supabase link --project-ref ibhjrxejiyvaiflfsufb`
3. Run `npx supabase db push` to apply migrations automatically