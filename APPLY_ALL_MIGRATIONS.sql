-- ============================================================================
-- COMPREHENSIVE DATABASE MIGRATION FOR CONTACT INFO CAPTURE
-- Run this entire script in your Supabase SQL Editor
-- ============================================================================

-- Step 1: Add all contact information fields to users table
-- (Migrations 017 & 018 combined)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States',
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Step 2: Update existing users to have full_name from name field
UPDATE public.users
SET full_name = name
WHERE full_name IS NULL AND name IS NOT NULL;

-- Step 3: Update full_name to be generated from first_name and last_name if available
UPDATE public.users
SET full_name = CONCAT_WS(' ', first_name, last_name)
WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Step 4: Update the trigger function to capture OAuth data properly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  -- Extract name fields from OAuth metadata
  v_first_name := COALESCE(
    NEW.raw_user_meta_data->>'given_name',
    NEW.raw_user_meta_data->>'first_name',
    SPLIT_PART(NEW.raw_user_meta_data->>'name', ' ', 1)
  );

  v_last_name := COALESCE(
    NEW.raw_user_meta_data->>'family_name',
    NEW.raw_user_meta_data->>'last_name',
    NULLIF(SPLIT_PART(NEW.raw_user_meta_data->>'name', ' ', 2), '')
  );

  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    CONCAT_WS(' ', v_first_name, v_last_name),
    NEW.email
  );

  -- Extract phone from OAuth metadata
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'phone',
    NEW.phone
  );

  INSERT INTO public.users (
    id,
    email,
    name,
    full_name,
    first_name,
    last_name,
    phone,
    street_address,
    city,
    state,
    zip_code,
    status,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_full_name,
    v_first_name,
    v_last_name,
    v_phone,
    NEW.raw_user_meta_data->'address'->>'street_address',
    NEW.raw_user_meta_data->'address'->>'locality',
    NEW.raw_user_meta_data->'address'->>'region',
    NEW.raw_user_meta_data->'address'->>'postal_code',
    'REQUESTED', -- Default status for new users
    'USER'
  );

  -- Create audit log (if create_audit_log function exists)
  BEGIN
    PERFORM create_audit_log(
      NEW.id,
      'CREATED',
      'USER',
      NEW.id,
      jsonb_build_object(
        'email', NEW.email,
        'name', v_full_name,
        'first_name', v_first_name,
        'last_name', v_last_name
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if audit log function doesn't exist
    NULL;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Verify the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 6: Add comments explaining fields
COMMENT ON COLUMN public.users.first_name IS 'User''s first name from profile or OAuth provider';
COMMENT ON COLUMN public.users.last_name IS 'User''s last name from profile or OAuth provider';
COMMENT ON COLUMN public.users.full_name IS 'User''s full name from profile or OAuth provider';
COMMENT ON COLUMN public.users.phone IS 'User''s phone number';
COMMENT ON COLUMN public.users.company_name IS 'User''s company/organization name';
COMMENT ON COLUMN public.users.job_title IS 'User''s job title or position';
COMMENT ON COLUMN public.users.street_address IS 'User''s street address';
COMMENT ON COLUMN public.users.city IS 'User''s city';
COMMENT ON COLUMN public.users.state IS 'User''s state/province';
COMMENT ON COLUMN public.users.zip_code IS 'User''s ZIP/postal code';
COMMENT ON COLUMN public.users.country IS 'User''s country';
COMMENT ON COLUMN public.users.last_seen IS 'Last login timestamp';

-- ============================================================================
-- MIGRATION COMPLETE
-- You should now see all the new contact fields in your users table
-- ============================================================================

SELECT 'Migration completed successfully! New columns added:' as status,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name IN (
    'first_name', 'last_name', 'full_name', 'phone',
    'company_name', 'job_title', 'street_address',
    'city', 'state', 'zip_code', 'country', 'last_seen'
  )
ORDER BY column_name;
