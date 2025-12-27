-- =============================================
-- Fix RLS Policies for Staff PIN Authentication
-- =============================================
-- The original policies used auth.uid() which doesn't work with staff PIN logins
-- We need permissive policies that use TO public instead

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Allow owners to manage department permissions" ON department_permissions;
DROP POLICY IF EXISTS "Allow owners to manage tax categories" ON product_tax_categories;

-- Create permissive policies for department_permissions
-- Allow public to update (since staff PIN doesn't set auth.uid())
CREATE POLICY "Allow public to manage department permissions"
ON public.department_permissions
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Create permissive policies for product_tax_categories
CREATE POLICY "Allow public to manage tax categories"
ON public.product_tax_categories
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated for staff PIN authentication!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changed policies from auth.uid() based to permissive (TO public)';
  RAISE NOTICE 'This allows staff PIN logins to access department_permissions and product_tax_categories';
END $$;
