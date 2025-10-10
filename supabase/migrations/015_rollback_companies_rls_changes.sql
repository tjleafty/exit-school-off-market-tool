-- Rollback migration 014 - revert to original RLS policies for companies table
-- The proper fix is using supabaseAdmin in API routes, not changing RLS policies

-- Drop the policies we added in migration 014
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can create own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage all companies" ON public.companies;

-- Create the helper functions if they don't exist
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status IN ('ACTIVE', 'APPROVED')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore the original RLS policies from migration 002
CREATE POLICY "Users can view companies from own searches" ON public.companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.searches
      WHERE searches.id = companies.search_id
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Users can update companies from own searches" ON public.companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.searches
      WHERE searches.id = companies.search_id
      AND searches.user_id = auth.uid()
      AND is_active_user()
    )
  );

CREATE POLICY "Admins can view all companies" ON public.companies
  FOR SELECT USING (is_admin());
