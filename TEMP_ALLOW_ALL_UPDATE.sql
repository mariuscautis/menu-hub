-- =============================================
-- TEMPORARY: Allow All to UPDATE order_items
-- =============================================
-- Match the permissive SELECT policy for testing

-- Drop the restrictive UPDATE policy
DROP POLICY IF EXISTS "Owners and staff can update order items" ON order_items;

-- Create a very permissive UPDATE policy for testing
-- This allows ANYONE to update ALL order_items
CREATE POLICY "Allow all to update order items"
ON order_items
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Verify all policies
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY cmd;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '⚠️  TEMPORARY permissive UPDATE policy created';
  RAISE NOTICE 'This allows ANYONE to update all order_items';
  RAISE NOTICE 'This is for TESTING ONLY';
  RAISE NOTICE '';
  RAISE NOTICE 'Current order_items policies:';
  RAISE NOTICE '- SELECT: public (all rows)';
  RAISE NOTICE '- UPDATE: public (all rows)';
  RAISE NOTICE '- INSERT: public (all rows)';
  RAISE NOTICE '- DELETE: public (specific conditions)';
  RAISE NOTICE '';
  RAISE NOTICE 'Test if staff can now use Start Preparing buttons';
  RAISE NOTICE 'If yes, we need to fix how staff authentication works';
END $$;
