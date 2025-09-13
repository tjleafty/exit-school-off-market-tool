-- QUICK FIX: Run this in Supabase SQL Editor for immediate enrichment repair

-- 1. Remove the problematic constraint entirely
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_check;

-- 2. Add the missing columns that are causing schema cache errors
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employee_count INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS revenue DECIMAL(15,2);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_confidence TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS enrichment_source TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_enriched BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS employees_range TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS revenue_range TEXT;

-- 3. Force refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- That's it! Try enrichment now.