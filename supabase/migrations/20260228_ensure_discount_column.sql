-- ============================================================================
-- ENSURE DISCOUNT_TOTAL COLUMN EXISTS ON ORDERS
-- ============================================================================
-- This migration ensures the discount_total column exists on the orders table
-- for tracking discounts applied to orders. This is needed for reports to
-- display discount data correctly.
-- ============================================================================

-- Add discount_total column to orders if it doesn't exist
-- This stores the total discount amount applied to the order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10,2) DEFAULT 0;

-- Add an index for efficient queries on orders with discounts
CREATE INDEX IF NOT EXISTS idx_orders_discount_total
    ON orders(restaurant_id, discount_total)
    WHERE discount_total > 0;
