-- Add contact information fields to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- Update existing name column to full_name for consistency
UPDATE public.users SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Add comment explaining fields
COMMENT ON COLUMN public.users.full_name IS 'User''s full name from profile or OAuth provider';
COMMENT ON COLUMN public.users.phone IS 'User''s phone number';
COMMENT ON COLUMN public.users.company_name IS 'User''s company/organization name';
COMMENT ON COLUMN public.users.job_title IS 'User''s job title or position';
COMMENT ON COLUMN public.users.last_seen IS 'Last login timestamp';
