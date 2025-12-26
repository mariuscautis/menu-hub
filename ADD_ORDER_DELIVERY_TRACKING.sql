-- =============================================
-- Add Order Delivery Tracking
-- =============================================
-- Track when orders are marked as ready and delivered to tables

-- 1. Add delivery tracking columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS marked_ready_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS preparation_duration_minutes INTEGER GENERATED ALWAYS AS (
  CASE
    WHEN marked_ready_at IS NOT NULL AND created_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (marked_ready_at - created_at)) / 60
    ELSE NULL
  END
) STORED,
ADD COLUMN IF NOT EXISTS delivery_duration_minutes INTEGER GENERATED ALWAYS AS (
  CASE
    WHEN delivered_at IS NOT NULL AND created_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (delivered_at - created_at)) / 60
    ELSE NULL
  END
) STORED;

-- 2. Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON orders(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_marked_ready_at ON orders(marked_ready_at) WHERE marked_ready_at IS NOT NULL;

-- 3. Create function to auto-update marked_ready_at when status changes to 'ready'
CREATE OR REPLACE FUNCTION update_order_ready_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'ready', set marked_ready_at timestamp
  IF NEW.status = 'ready' AND (OLD.status IS NULL OR OLD.status != 'ready') THEN
    NEW.marked_ready_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for auto-updating marked_ready_at
DROP TRIGGER IF EXISTS trigger_update_order_ready_timestamp ON orders;
CREATE TRIGGER trigger_update_order_ready_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_ready_timestamp();

-- 5. Create view for order delivery analytics
CREATE OR REPLACE VIEW order_delivery_analytics AS
SELECT
  o.id,
  o.restaurant_id,
  o.table_id,
  t.table_number,
  o.created_at AS order_time,
  o.marked_ready_at,
  o.delivered_at,
  o.preparation_duration_minutes,
  o.delivery_duration_minutes,
  o.total AS order_total,
  o.status,
  DATE(o.created_at) AS order_date,
  EXTRACT(HOUR FROM o.created_at) AS order_hour,
  -- Time between order ready and delivered (waiter response time)
  CASE
    WHEN delivered_at IS NOT NULL AND marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (delivered_at - marked_ready_at)) / 60
    ELSE NULL
  END AS waiter_response_minutes
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
WHERE o.status != 'cancelled';

-- 6. Grant permissions
GRANT SELECT ON order_delivery_analytics TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Order delivery tracking added successfully!';
  RAISE NOTICE 'New columns: marked_ready_at, delivered_at, preparation_duration_minutes, delivery_duration_minutes';
  RAISE NOTICE 'New view: order_delivery_analytics';
END $$;
