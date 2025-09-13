-- CORRECTED PRODUCTION DATABASE FIX COMMANDS
-- Run these commands in Supabase SQL Editor to fix all enrichment issues

-- Step 1: Remove problematic user_id constraint (causing violation errors)
ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_user_id_check;

-- Step 2: Add a proper UUID constraint (cast to text for regex)
ALTER TABLE companies ADD CONSTRAINT companies_user_id_check 
CHECK (user_id IS NULL OR user_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- Step 3: Ensure all enrichment columns exist (from migration 005)
DO $$ 
BEGIN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='email') THEN
        ALTER TABLE companies ADD COLUMN email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='enriched_at') THEN
        ALTER TABLE companies ADD COLUMN enriched_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='owner_name') THEN
        ALTER TABLE companies ADD COLUMN owner_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='employee_count') THEN
        ALTER TABLE companies ADD COLUMN employee_count INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='revenue') THEN
        ALTER TABLE companies ADD COLUMN revenue DECIMAL(15,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='email_confidence') THEN
        ALTER TABLE companies ADD COLUMN email_confidence TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='enrichment_source') THEN
        ALTER TABLE companies ADD COLUMN enrichment_source TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='is_enriched') THEN
        ALTER TABLE companies ADD COLUMN is_enriched BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='employees_range') THEN
        ALTER TABLE companies ADD COLUMN employees_range TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='revenue_range') THEN
        ALTER TABLE companies ADD COLUMN revenue_range TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='formatted_address') THEN
        ALTER TABLE companies ADD COLUMN formatted_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='business_status') THEN
        ALTER TABLE companies ADD COLUMN business_status TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='total_reviews') THEN
        ALTER TABLE companies ADD COLUMN total_reviews INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='companies' AND column_name='industry_categories') THEN
        ALTER TABLE companies ADD COLUMN industry_categories TEXT[];
    END IF;
END $$;

-- Step 4: Set up automatic schema refresh system (from migration 006)
CREATE OR REPLACE FUNCTION public.refresh_postgrest_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the PostgREST schema cache
  NOTIFY pgrst, 'reload schema';
  
  -- Log the refresh for debugging
  RAISE NOTICE 'PostgREST schema cache refreshed at %', NOW();
END;
$$;

-- Create a manual refresh function for API use
CREATE OR REPLACE FUNCTION public.manual_schema_refresh()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.refresh_postgrest_schema();
  
  RETURN json_build_object(
    'success', true,
    'message', 'Schema cache refreshed successfully',
    'timestamp', NOW()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.refresh_postgrest_schema() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.manual_schema_refresh() TO authenticated, anon;

-- Step 5: Verify all columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name IN ('email', 'enriched_at', 'owner_name', 'employee_count', 'revenue', 'email_confidence', 'enrichment_source', 'is_enriched')
ORDER BY column_name;

-- Step 6: FORCE refresh PostgREST schema cache
SELECT public.refresh_postgrest_schema();

-- Success message
SELECT 'Database setup complete! All enrichment columns added and schema cache refreshed.' as status;