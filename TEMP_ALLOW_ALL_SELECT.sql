-- =============================================
-- TEMPORARY: Allow All Authenticated to SELECT
-- =============================================
-- This is a temporary permissive policy to test if auth is the issue

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Owners and staff can view order items" ON order_items;

-- Create a very permissive policy for testing
-- This allows ANYONE authenticated to view ALL order_items
CREATE POLICY "Allow all authenticated to view order items"
ON order_items
FOR SELECT
TO public
USING (true);

-- Verify the policy
SELECT
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'order_items'
  AND cmd = 'SELECT';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '⚠️  TEMPORARY permissive SELECT policy created';
  RAISE NOTICE 'This allows ANYONE to view all order_items';
  RAISE NOTICE 'This is for TESTING ONLY';
  RAISE NOTICE '';
  RAISE NOTICE 'Test if staff can now see orders';
  RAISE NOTICE 'If yes, the issue is with auth.uid() not being set for staff';
  RAISE NOTICE 'We will create a proper policy after testing';
END $$;
