-- Drop existing table if it exists (to ensure clean setup)
DROP TABLE IF EXISTS companies CASCADE;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table for storing business data from Google Places
CREATE TABLE companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  formatted_address TEXT,
  location TEXT, -- Combined location string for display
  city TEXT,
  state TEXT,
  industry TEXT,
  phone TEXT,
  formatted_phone_number TEXT,
  international_phone_number TEXT,
  website TEXT,
  email TEXT,
  email_confidence TEXT,
  rating DECIMAL(2,1),
  user_ratings_total INTEGER,
  types JSONB,
  geometry JSONB,
  business_status TEXT,
  editorial_summary TEXT,
  total_reviews INTEGER,
  opening_hours JSONB,
  industry_categories TEXT[],
  is_enriched BOOLEAN DEFAULT FALSE,
  enriched_at TIMESTAMP WITH TIME ZONE,
  enrichment_source TEXT,
  employees_range TEXT,
  revenue_range TEXT,
  company_stage TEXT,
  founded_year INTEGER,
  linkedin_url TEXT,
  description TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_companies_place_id ON companies(place_id);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_city ON companies(city);
CREATE INDEX idx_companies_state ON companies(state);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_is_enriched ON companies(is_enriched);
CREATE INDEX idx_companies_created_at ON companies(created_at DESC);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow all authenticated users to read companies
CREATE POLICY "Companies are viewable by all authenticated users" 
  ON companies FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert companies
CREATE POLICY "Users can insert companies" 
  ON companies FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update companies
CREATE POLICY "Users can update companies" 
  ON companies FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Allow admin users to delete companies
CREATE POLICY "Admin users can delete companies" 
  ON companies FOR DELETE 
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'ADMIN'
    )
  );

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON companies TO authenticated;
GRANT SELECT ON companies TO anon;