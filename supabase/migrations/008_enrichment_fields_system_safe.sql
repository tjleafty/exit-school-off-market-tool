-- Safe version of migration 008 that checks if objects already exist

-- Create enrichment tier enum (skip if exists)
DO $$ BEGIN
    CREATE TYPE enrichment_tier AS ENUM ('BASIC', 'ENHANCED', 'BOTH', 'NONE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create table to store all possible enrichment fields and their configuration
CREATE TABLE IF NOT EXISTS public.enrichment_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  field_category TEXT NOT NULL, -- 'contact', 'company', 'firmographics', 'social', 'location', 'financial'
  data_type TEXT NOT NULL, -- 'text', 'number', 'date', 'url', 'phone', 'email'
  tier enrichment_tier DEFAULT 'NONE',
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes (skip if exist)
CREATE INDEX IF NOT EXISTS idx_enrichment_fields_tier ON public.enrichment_fields(tier);
CREATE INDEX IF NOT EXISTS idx_enrichment_fields_category ON public.enrichment_fields(field_category);
CREATE INDEX IF NOT EXISTS idx_enrichment_fields_sort ON public.enrichment_fields(sort_order);

-- Add trigger for updated_at (skip if exists)
DO $$ BEGIN
    CREATE TRIGGER update_enrichment_fields_updated_at BEFORE UPDATE ON public.enrichment_fields
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update companies table to store comprehensive enrichment data as JSONB
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enrichment_tier TEXT DEFAULT 'BASIC';

-- Create index for enrichment data queries
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_data ON public.companies USING gin(enrichment_data);

-- Insert default field configurations (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.enrichment_fields LIMIT 1) THEN

    INSERT INTO public.enrichment_fields (field_name, display_name, field_category, data_type, tier, sort_order, description) VALUES
      -- Contact Information (Basic Tier)
      ('owner_last_name', 'Last Name', 'contact', 'text', 'BASIC', 1, 'Contact last name'),
      ('owner_first_name', 'First Name', 'contact', 'text', 'BASIC', 2, 'Contact first name'),
      ('job_title', 'Job Title', 'contact', 'text', 'BASIC', 3, 'Primary job title'),
      ('direct_phone', 'Direct Phone', 'contact', 'phone', 'BASIC', 4, 'Direct phone number'),
      ('email', 'Email Address', 'contact', 'email', 'BASIC', 5, 'Primary email address'),
      ('mobile_phone', 'Mobile Phone', 'contact', 'phone', 'ENHANCED', 6, 'Mobile phone number'),

      -- Contact Extended (Enhanced Tier)
      ('job_title_hierarchy_level', 'Job Title Hierarchy Level', 'contact', 'number', 'ENHANCED', 10, 'Numerical hierarchy level'),
      ('management_level', 'Management Level', 'contact', 'text', 'ENHANCED', 11, 'Management level description'),
      ('job_start_date', 'Job Start Date', 'contact', 'date', 'ENHANCED', 12, 'Date started current position'),
      ('job_function', 'Job Function', 'contact', 'text', 'ENHANCED', 13, 'Primary job function'),
      ('department', 'Department', 'contact', 'text', 'ENHANCED', 14, 'Department name'),
      ('linkedin_contact_url', 'LinkedIn Profile', 'contact', 'url', 'ENHANCED', 15, 'LinkedIn contact profile URL'),

      -- Company Basic Information (Basic Tier)
      ('company_name', 'Company Name', 'company', 'text', 'BASIC', 20, 'Official company name'),
      ('website', 'Website', 'company', 'url', 'BASIC', 21, 'Company website URL'),
      ('company_phone', 'Company Phone', 'company', 'phone', 'BASIC', 22, 'Main company phone number'),
      ('company_description', 'Description', 'company', 'text', 'BASIC', 23, 'Company description'),

      -- Company Extended (Enhanced Tier)
      ('zoominfo_company_id', 'ZoomInfo Company ID', 'company', 'text', 'ENHANCED', 30, 'ZoomInfo unique identifier'),
      ('founded_year', 'Founded Year', 'company', 'number', 'ENHANCED', 31, 'Year company was founded'),
      ('fax', 'Fax Number', 'company', 'phone', 'ENHANCED', 32, 'Company fax number'),
      ('ticker', 'Stock Ticker', 'company', 'text', 'ENHANCED', 33, 'Stock ticker symbol'),
      ('alexa_rank', 'Alexa Rank', 'company', 'number', 'ENHANCED', 34, 'Alexa website ranking'),
      ('zoominfo_profile_url', 'ZoomInfo Profile', 'company', 'url', 'ENHANCED', 35, 'ZoomInfo company profile URL'),
      ('certified_active', 'Certified Active', 'company', 'text', 'ENHANCED', 36, 'Certification status'),
      ('certification_date', 'Certification Date', 'company', 'date', 'ENHANCED', 37, 'Date of certification'),

      -- Financial Information (Enhanced Tier)
      ('revenue', 'Revenue (USD)', 'financial', 'number', 'ENHANCED', 40, 'Annual revenue in thousands USD'),
      ('revenue_range', 'Revenue Range', 'financial', 'text', 'BASIC', 41, 'Revenue range description'),
      ('marketing_budget', 'Marketing Budget', 'financial', 'number', 'ENHANCED', 42, 'Est. marketing department budget'),
      ('finance_budget', 'Finance Budget', 'financial', 'number', 'ENHANCED', 43, 'Est. finance department budget'),
      ('it_budget', 'IT Budget', 'financial', 'number', 'ENHANCED', 44, 'Est. IT department budget'),
      ('hr_budget', 'HR Budget', 'financial', 'number', 'ENHANCED', 45, 'Est. HR department budget'),
      ('total_funding', 'Total Funding', 'financial', 'number', 'ENHANCED', 46, 'Total funding amount in thousands'),
      ('recent_funding_amount', 'Recent Funding Amount', 'financial', 'number', 'ENHANCED', 47, 'Most recent funding amount'),
      ('recent_funding_round', 'Recent Funding Round', 'financial', 'text', 'ENHANCED', 48, 'Type of recent funding round'),
      ('recent_funding_date', 'Recent Funding Date', 'financial', 'date', 'ENHANCED', 49, 'Date of recent funding'),
      ('recent_investors', 'Recent Investors', 'financial', 'text', 'ENHANCED', 50, 'Recent investors'),
      ('all_investors', 'All Investors', 'financial', 'text', 'ENHANCED', 51, 'All investors'),

      -- Firmographics (Mixed Tier)
      ('employees', 'Employee Count', 'firmographics', 'number', 'BASIC', 60, 'Total number of employees'),
      ('employee_range', 'Employee Range', 'firmographics', 'text', 'BASIC', 61, 'Employee range description'),
      ('employee_growth_1yr', 'Employee Growth (1 Year)', 'firmographics', 'number', 'ENHANCED', 62, 'Past 1 year employee growth rate'),
      ('employee_growth_2yr', 'Employee Growth (2 Years)', 'firmographics', 'number', 'ENHANCED', 63, 'Past 2 year employee growth rate'),
      ('ownership_type', 'Ownership Type', 'firmographics', 'text', 'ENHANCED', 64, 'Company ownership type'),
      ('business_model', 'Business Model', 'firmographics', 'text', 'ENHANCED', 65, 'Business model (B2B/B2C)'),
      ('number_of_locations', 'Number of Locations', 'firmographics', 'number', 'ENHANCED', 66, 'Total number of locations'),

      -- Industry Classification (Basic Tier)
      ('primary_industry', 'Primary Industry', 'company', 'text', 'BASIC', 70, 'Primary industry classification'),
      ('primary_sub_industry', 'Primary Sub-Industry', 'company', 'text', 'BASIC', 71, 'Primary sub-industry'),
      ('all_industries', 'All Industries', 'company', 'text', 'ENHANCED', 72, 'All industry classifications'),
      ('all_sub_industries', 'All Sub-Industries', 'company', 'text', 'ENHANCED', 73, 'All sub-industry classifications'),
      ('industry_category', 'Industry Category', 'company', 'text', 'ENHANCED', 74, 'Hierarchical industry category'),
      ('sic_code_1', 'SIC Code (Primary)', 'company', 'text', 'ENHANCED', 75, 'Primary SIC code'),
      ('sic_codes', 'SIC Codes (All)', 'company', 'text', 'ENHANCED', 76, 'All SIC codes'),
      ('naics_code_1', 'NAICS Code (Primary)', 'company', 'text', 'ENHANCED', 77, 'Primary NAICS code'),
      ('naics_codes', 'NAICS Codes (All)', 'company', 'text', 'ENHANCED', 78, 'All NAICS codes'),

      -- Location Information (Basic Tier)
      ('street_address', 'Street Address', 'location', 'text', 'BASIC', 80, 'Company street address'),
      ('city', 'City', 'location', 'text', 'BASIC', 81, 'Company city'),
      ('state', 'State', 'location', 'text', 'BASIC', 82, 'Company state'),
      ('zip_code', 'Zip Code', 'location', 'text', 'BASIC', 83, 'Company zip code'),
      ('country', 'Country', 'location', 'text', 'BASIC', 84, 'Company country'),
      ('full_address', 'Full Address', 'location', 'text', 'BASIC', 85, 'Complete formatted address'),

      -- Social Media (Enhanced Tier)
      ('linkedin_company_url', 'LinkedIn Company', 'social', 'url', 'ENHANCED', 90, 'LinkedIn company page'),
      ('facebook_url', 'Facebook Page', 'social', 'url', 'ENHANCED', 91, 'Facebook company page'),
      ('twitter_url', 'Twitter Profile', 'social', 'url', 'ENHANCED', 92, 'Twitter company profile');

    RAISE NOTICE 'Inserted % enrichment fields', (SELECT COUNT(*) FROM public.enrichment_fields);
  ELSE
    RAISE NOTICE 'Enrichment fields already populated, skipping INSERT';
  END IF;
END $$;

-- Create view for easy field filtering by tier
CREATE OR REPLACE VIEW enrichment_fields_by_tier AS
SELECT
  field_category,
  tier,
  COUNT(*) as field_count,
  jsonb_agg(
    jsonb_build_object(
      'field_name', field_name,
      'display_name', display_name,
      'data_type', data_type,
      'sort_order', sort_order
    ) ORDER BY sort_order
  ) as fields
FROM enrichment_fields
WHERE tier != 'NONE'
GROUP BY field_category, tier
ORDER BY field_category, tier;

-- Verify the setup
DO $$
DECLARE
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO field_count FROM public.enrichment_fields;
  RAISE NOTICE '✓ Migration complete: % fields configured', field_count;
END $$;
