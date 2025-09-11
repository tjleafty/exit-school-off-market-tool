-- Companies table for storing discovered companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  sub_industry TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  employees_range TEXT,
  revenue_range TEXT,
  company_stage TEXT,
  description TEXT,
  founded_year INTEGER,
  linkedin_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  
  -- Enrichment fields
  is_enriched BOOLEAN DEFAULT false,
  enriched_at TIMESTAMP,
  enrichment_data JSONB,
  
  -- Contact information
  contacts JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  source TEXT,
  added_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicates
  UNIQUE(name, website)
);

-- Company lists for organizing searches
CREATE TABLE IF NOT EXISTS company_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for companies in lists
CREATE TABLE IF NOT EXISTS company_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES company_lists(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  notes TEXT,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, company_id)
);

-- Update search_history table to include more details
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS search_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS filters JSONB,
ADD COLUMN IF NOT EXISTS results JSONB;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(location);
CREATE INDEX IF NOT EXISTS idx_companies_enriched ON companies(is_enriched);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_company_lists_user ON company_lists(user_id);

-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_list_items ENABLE ROW LEVEL SECURITY;

-- Policies for companies (all authenticated users can view, only admins can modify)
CREATE POLICY "Users can view companies" ON companies
  FOR SELECT USING (true);

CREATE POLICY "Admins can create companies" ON companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update companies" ON companies
  FOR UPDATE USING (true);

-- Policies for company lists (users can manage their own lists)
CREATE POLICY "Users can view their own lists" ON company_lists
  FOR SELECT USING (true);

CREATE POLICY "Users can create lists" ON company_lists
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own lists" ON company_lists
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own lists" ON company_lists
  FOR DELETE USING (true);

-- Policies for list items
CREATE POLICY "Users can manage list items" ON company_list_items
  FOR ALL USING (true);