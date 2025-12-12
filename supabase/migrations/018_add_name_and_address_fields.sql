-- Add first name, last name, and address fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS street_address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United States';

-- Update full_name to be generated from first_name and last_name if not set
UPDATE public.users
SET full_name = CONCAT_WS(' ', first_name, last_name)
WHERE full_name IS NULL AND (first_name IS NOT NULL OR last_name IS NOT NULL);

-- Add comments explaining fields
COMMENT ON COLUMN public.users.first_name IS 'User''s first name from profile or OAuth provider';
COMMENT ON COLUMN public.users.last_name IS 'User''s last name from profile or OAuth provider';
COMMENT ON COLUMN public.users.street_address IS 'User''s street address';
COMMENT ON COLUMN public.users.city IS 'User''s city';
COMMENT ON COLUMN public.users.state IS 'User''s state/province';
COMMENT ON COLUMN public.users.zip_code IS 'User''s ZIP/postal code';
COMMENT ON COLUMN public.users.country IS 'User''s country';
