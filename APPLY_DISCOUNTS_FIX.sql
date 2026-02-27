-- ============================================================================
-- COMPREHENSIVE DISCOUNTS FIX - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- This script fixes two issues:
-- 1. Staff can't see discounts (RLS policy issue)
-- 2. Discounts not appearing in reports (missing column)
--
-- Copy this entire file and paste it into your Supabase SQL Editor, then run.
-- ============================================================================

-- STEP 1: Ensure discount_total column exists on orders table
-- This is required for reports to show discounts
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10,2) DEFAULT 0;

-- STEP 2: Fix RLS policy so staff can view discounts
-- The old policy used auth.uid() which doesn't work for PIN-based staff login
DROP POLICY IF EXISTS "Users can view discounts for their restaurant" ON discounts;
DROP POLICY IF EXISTS "Anyone can view active discounts by restaurant" ON discounts;

-- Create a permissive SELECT policy that works for all users
-- Discounts are filtered by restaurant_id in the application code
CREATE POLICY "Anyone can view active discounts by restaurant"
    ON discounts FOR SELECT
    USING (active = true);

-- STEP 3: Grant permissions to use RPC functions (if they exist)
-- These are needed for staff to apply discounts
DO $$
BEGIN
    -- Try to grant execute on apply_order_discount
    EXECUTE 'GRANT EXECUTE ON FUNCTION apply_order_discount TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION apply_order_discount TO anon';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function apply_order_discount does not exist - skipping grant';
END $$;

DO $$
BEGIN
    -- Try to grant execute on process_refund
    EXECUTE 'GRANT EXECUTE ON FUNCTION process_refund TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION process_refund TO anon';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function process_refund does not exist - skipping grant';
END $$;

DO $$
BEGIN
    -- Try to grant execute on void_order_item
    EXECUTE 'GRANT EXECUTE ON FUNCTION void_order_item TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION void_order_item TO anon';
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function void_order_item does not exist - skipping grant';
END $$;

-- STEP 4: Verify the changes
SELECT
    'discount_total column exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name = 'discount_total'
    ) THEN 'YES' ELSE 'NO' END AS check_1,

    'RLS policy exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'discounts' AND policyname = 'Anyone can view active discounts by restaurant'
    ) THEN 'YES' ELSE 'NO' END AS check_2;

-- ============================================================================
-- DONE! After running this script:
-- 1. Staff should be able to see discounts when processing payments
-- 2. Applied discounts should appear in reports
-- ============================================================================
