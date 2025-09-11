-- Users table for application users (not auth users)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'INVITED', 'PENDING')),
  method TEXT NOT NULL CHECK (method IN ('SYSTEM', 'MANUAL', 'INVITE', 'REQUEST')),
  has_password BOOLEAN DEFAULT false,
  features JSONB DEFAULT '{"companySearch": true, "companyEnrichment": true, "businessIntelligence": true}'::jsonb,
  created_by TEXT,
  join_date DATE DEFAULT CURRENT_DATE,
  last_login TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table for storing encrypted API keys
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT UNIQUE NOT NULL,
  encrypted_key TEXT,
  status TEXT DEFAULT 'Not Connected',
  last_tested TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company searches history
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  search_query TEXT NOT NULL,
  results_count INTEGER,
  search_params JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Policies for app_users
CREATE POLICY "Admins can view all users" ON app_users
  FOR SELECT USING (true);

CREATE POLICY "Admins can create users" ON app_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update users" ON app_users
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete users" ON app_users
  FOR DELETE USING (true);

-- Policies for api_keys (admin only)
CREATE POLICY "Admins can manage API keys" ON api_keys
  FOR ALL USING (true);

-- Policies for search_history
CREATE POLICY "Users can view their own searches" ON search_history
  FOR SELECT USING (true);

CREATE POLICY "Users can create searches" ON search_history
  FOR INSERT WITH CHECK (true);

-- Insert default system admin
INSERT INTO app_users (
  email,
  name,
  role,
  status,
  method,
  has_password,
  created_by,
  join_date,
  last_login
) VALUES (
  'admin@exitschool.com',
  'System Administrator',
  'ADMIN',
  'ACTIVE',
  'SYSTEM',
  true,
  'System',
  '2025-01-01',
  NOW()
) ON CONFLICT (email) DO NOTHING;