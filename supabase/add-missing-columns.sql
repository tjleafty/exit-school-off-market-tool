-- Add missing columns to companies table for CSV export compatibility
-- This fixes the PostgREST schema cache errors

-- Add missing columns that the APIs expect
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS owner_linkedin TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employees_range TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS revenue INTEGER;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS revenue_range TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS business_status TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email_confidence TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS formatted_phone_number TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS total_reviews INTEGER;

-- Update indexes for new columns
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);
CREATE INDEX IF NOT EXISTS idx_companies_owner_email ON public.companies(owner_email);
CREATE INDEX IF NOT EXISTS idx_companies_enriched_at ON public.companies(enriched_at);

-- Refresh PostgREST schema cache 
NOTIFY pgrst, 'reload schema';

-- Verification
SELECT 'Missing columns added successfully!' as status;