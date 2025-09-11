-- Fix Companies Table for Add to List Feature
-- This creates a standalone companies table that matches the API expectations

-- Drop existing conflicting table if it exists
DROP TABLE IF EXISTS public.companies CASCADE;

-- Create the companies table that matches our API expectations
CREATE TABLE public.companies (
  id SERIAL PRIMARY KEY,
  place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  formatted_address TEXT,
  location TEXT,
  city TEXT,
  state TEXT,
  industry TEXT,
  phone TEXT,
  website TEXT,
  rating DECIMAL(3,1),
  user_ratings_total INTEGER,
  types TEXT,
  geometry TEXT,
  is_enriched BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_companies_place_id ON public.companies(place_id);
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_companies_is_enriched ON public.companies(is_enriched);
CREATE INDEX idx_companies_industry ON public.companies(industry);
CREATE INDEX idx_companies_location ON public.companies(location);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all operations for now
-- (We'll restrict this later when we add user authentication)
CREATE POLICY "Allow all operations on companies" ON public.companies
  FOR ALL USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.companies TO anon;
GRANT USAGE, SELECT ON SEQUENCE companies_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE companies_id_seq TO anon;

-- Insert a test record to verify the table works
INSERT INTO public.companies (
  place_id, 
  name, 
  formatted_address, 
  location, 
  is_enriched
) VALUES (
  'test_setup_' || extract(epoch from now()),
  'Test Company (Setup Verification)',
  'Test Address',
  'Test Location',
  false
) ON CONFLICT (place_id) DO NOTHING;

-- Verify table creation
SELECT 
  'Companies table created successfully!' as status,
  count(*) as record_count
FROM public.companies;