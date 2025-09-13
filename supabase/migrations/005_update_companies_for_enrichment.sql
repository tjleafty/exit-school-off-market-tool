-- Migration to update companies table for enrichment functionality
-- This aligns the companies table with the enrichment API requirements

-- First, add missing columns to the companies table
ALTER TABLE public.companies 
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_confidence TEXT,
  ADD COLUMN IF NOT EXISTS formatted_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS international_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS user_ratings_total INTEGER,
  ADD COLUMN IF NOT EXISTS types JSONB,
  ADD COLUMN IF NOT EXISTS geometry JSONB,
  ADD COLUMN IF NOT EXISTS business_status TEXT,
  ADD COLUMN IF NOT EXISTS editorial_summary TEXT,
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB,
  ADD COLUMN IF NOT EXISTS industry_categories TEXT[],
  ADD COLUMN IF NOT EXISTS is_enriched BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_source TEXT,
  ADD COLUMN IF NOT EXISTS employees_range TEXT,
  ADD COLUMN IF NOT EXISTS revenue_range TEXT,
  ADD COLUMN IF NOT EXISTS company_stage TEXT,
  ADD COLUMN IF NOT EXISTS founded_year INTEGER,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing columns to match expected data types
-- Rename review_count to user_ratings_total if it doesn't exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'review_count') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'user_ratings_total') THEN
    ALTER TABLE public.companies RENAME COLUMN review_count TO user_ratings_total;
  END IF;
END $$;

-- Rename address to formatted_address if needed
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'address') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'formatted_address') THEN
    ALTER TABLE public.companies RENAME COLUMN address TO formatted_address;
  END IF;
END $$;

-- Create additional indexes for enrichment fields
CREATE INDEX IF NOT EXISTS idx_companies_city ON public.companies(city);
CREATE INDEX IF NOT EXISTS idx_companies_state ON public.companies(state);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON public.companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_is_enriched ON public.companies(is_enriched);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_updated_at ON public.companies(updated_at DESC);

-- Create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_companies_updated_at') THEN
    CREATE TRIGGER update_companies_updated_at 
      BEFORE UPDATE ON public.companies
      FOR EACH ROW 
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- Update location field for existing companies that have formatted_address but no location
UPDATE public.companies 
SET location = formatted_address 
WHERE location IS NULL AND formatted_address IS NOT NULL;

-- Set is_enriched to false for existing companies if not already set
UPDATE public.companies 
SET is_enriched = FALSE 
WHERE is_enriched IS NULL;

-- Add default timestamps for existing records
UPDATE public.companies 
SET updated_at = created_at 
WHERE updated_at IS NULL;