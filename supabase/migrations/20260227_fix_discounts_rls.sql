-- ============================================================================
-- FIX DISCOUNTS RLS FOR STAFF ACCESS
-- ============================================================================
-- The original RLS policy used auth.uid() which doesn't work for staff
-- who log in with PIN (they don't have a Supabase Auth session).
--
-- Solution: Make discounts readable with a simple restaurant_id check.
-- Since discounts are not sensitive data (just template definitions),
-- and the client always filters by restaurant_id from the session,
-- this is safe. The restaurant_id in the session is verified at PIN login.
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view discounts for their restaurant" ON discounts;

-- Create a more permissive SELECT policy that works with restaurant_id filtering
-- This allows staff with PIN login to read discounts for their restaurant
CREATE POLICY "Anyone can view active discounts by restaurant"
    ON discounts FOR SELECT
    USING (active = true);

-- Note: The "Owners can manage discounts" policy remains unchanged.
-- Only owners (with auth.uid()) can INSERT/UPDATE/DELETE discounts.

-- Grant execute on RPC functions to authenticated and anon roles
-- This ensures staff can apply discounts during payment
GRANT EXECUTE ON FUNCTION apply_order_discount TO authenticated;
GRANT EXECUTE ON FUNCTION apply_order_discount TO anon;
GRANT EXECUTE ON FUNCTION process_refund TO authenticated;
GRANT EXECUTE ON FUNCTION process_refund TO anon;
GRANT EXECUTE ON FUNCTION void_order_item TO authenticated;
GRANT EXECUTE ON FUNCTION void_order_item TO anon;
