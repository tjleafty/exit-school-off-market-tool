-- Temporary fix: Make companies table work without searches dependency
-- This is a quick fix to get the system working again

-- Step 1: Add user_id directly to companies table for now
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Step 2: Update existing companies to have a default user_id
-- (This is temporary - in production you'd want to assign proper user IDs)
UPDATE public.companies 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Step 3: Update RLS policies to work directly with user_id
DROP POLICY IF EXISTS "Users can view companies from own searches" ON public.companies;
DROP POLICY IF EXISTS "Users can insert companies to own searches" ON public.companies;
DROP POLICY IF EXISTS "Users can update companies from own searches" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;

-- Step 4: Create simple policies based on user_id
CREATE POLICY "Users can view own companies" ON public.companies
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own companies" ON public.companies
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own companies" ON public.companies
  FOR UPDATE USING (user_id = auth.uid());

-- Step 5: Allow system operations for now
CREATE POLICY "System can manage companies" ON public.companies
  FOR ALL USING (true);

SELECT 'Temporary companies fix completed!' as status;