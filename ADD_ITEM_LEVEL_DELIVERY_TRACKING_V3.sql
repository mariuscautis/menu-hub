-- =============================================
-- Add Item-Level Delivery Tracking (v3)
-- =============================================
-- Tracks delivery at the order item level to support multi-department workflows
-- (e.g., bar items delivered separately from kitchen items)
-- Version 3: Works with menu_categories table (correct table name)

-- 1. Add delivery tracking columns to order_items table
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marked_ready_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_order_items_preparing_started_at ON order_items(preparing_started_at) WHERE preparing_started_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_marked_ready_at ON order_items(marked_ready_at) WHERE marked_ready_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_delivered_at ON order_items(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 3. Note: No automatic trigger for marked_ready_at
-- The frontend handles marking items ready per department manually
-- This gives full control to each department (kitchen, bar, etc.)

-- 4. Create view for item-level delivery analytics
-- Note: Joins to menu_categories table to get category name
CREATE OR REPLACE VIEW order_item_delivery_analytics AS
SELECT
  oi.id AS item_id,
  oi.order_id,
  o.restaurant_id,
  o.table_id,
  t.table_number,
  mi.name AS item_name,
  COALESCE(mc.name, 'other') AS item_category,
  oi.quantity,
  mi.price,
  o.created_at AS order_time,
  oi.marked_ready_at,
  oi.delivered_at,
  o.status AS order_status,
  -- Preparation time (order placed to item marked ready)
  CASE
    WHEN oi.marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (oi.marked_ready_at - o.created_at)) / 60
    ELSE NULL
  END AS preparation_minutes,
  -- Waiter response time (item ready to delivered)
  CASE
    WHEN oi.delivered_at IS NOT NULL AND oi.marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (oi.delivered_at - oi.marked_ready_at)) / 60
    ELSE NULL
  END AS waiter_response_minutes,
  -- Total delivery time (order placed to delivered)
  CASE
    WHEN oi.delivered_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (oi.delivered_at - o.created_at)) / 60
    ELSE NULL
  END AS total_delivery_minutes,
  DATE(o.created_at) AS order_date,
  EXTRACT(HOUR FROM o.created_at) AS order_hour
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
LEFT JOIN menu_categories mc ON mi.category_id = mc.id
WHERE o.status != 'cancelled';

-- 5. Grant permissions
GRANT SELECT ON order_item_delivery_analytics TO authenticated;

-- 6. Migrate existing order-level timestamps to item-level
-- Copy marked_ready_at and delivered_at from orders to their items
UPDATE order_items oi
SET
  marked_ready_at = o.marked_ready_at,
  delivered_at = o.delivered_at
FROM orders o
WHERE oi.order_id = o.id
  AND o.marked_ready_at IS NOT NULL
  AND oi.marked_ready_at IS NULL;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Item-level delivery tracking added successfully!';
  RAISE NOTICE 'New columns: order_items.preparing_started_at, marked_ready_at, delivered_at';
  RAISE NOTICE 'New view: order_item_delivery_analytics';
  RAISE NOTICE 'Migrated existing order timestamps to items';
  RAISE NOTICE 'Using menu_categories table for category names';
  RAISE NOTICE 'Note: Each department controls preparation and ready status independently';
END $$;
