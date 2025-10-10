-- Update RLS policies for companies table to support direct user_id column
-- This migration adds policies that allow users to manage companies by user_id
-- while keeping the existing search_id-based policies for backward compatibility

-- Drop existing companies policies that are search_id-based only
DROP POLICY IF EXISTS "Users can view companies from own searches" ON public.companies;
DROP POLICY IF EXISTS "Users can update companies from own searches" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;

-- Create new policies that support both search_id (legacy) and user_id (new approach)
CREATE POLICY "Users can view own companies" ON public.companies
  FOR SELECT USING (
    -- Allow if user_id matches (new approach)
    (auth.uid() = user_id AND is_active_user())
    OR
    -- Allow if company is from user's search (legacy approach)
    EXISTS (
      SELECT 1 FROM public.searches
      WHERE searches.id = companies.search_id
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Users can create own companies" ON public.companies
  FOR INSERT WITH CHECK (
    -- Allow if user_id matches (new approach)
    (auth.uid() = user_id AND is_active_user())
    OR
    -- Allow if company is for user's search (legacy approach)
    EXISTS (
      SELECT 1 FROM public.searches
      WHERE searches.id = companies.search_id
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Users can update own companies" ON public.companies
  FOR UPDATE USING (
    -- Allow if user_id matches (new approach)
    (auth.uid() = user_id AND is_active_user())
    OR
    -- Allow if company is from user's search (legacy approach)
    EXISTS (
      SELECT 1 FROM public.searches
      WHERE searches.id = companies.search_id
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Users can delete own companies" ON public.companies
  FOR DELETE USING (
    -- Allow if user_id matches (new approach)
    (auth.uid() = user_id AND is_active_user())
    OR
    -- Allow if company is from user's search (legacy approach)
    EXISTS (
      SELECT 1 FROM public.searches
      WHERE searches.id = companies.search_id
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Admins can manage all companies" ON public.companies
  FOR ALL USING (is_admin());

-- Add a service role bypass policy to ensure backend operations work
-- Note: This policy allows service role to bypass RLS entirely
CREATE POLICY "Service role can manage all companies" ON public.companies
  FOR ALL USING (
    -- Service role can do anything
    auth.jwt() ->> 'role' = 'service_role'
  );
