-- Takeaway System Migration
-- Adds fields for takeaway ordering functionality

-- Add takeaway_available column to menu_items table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'menu_items' AND column_name = 'takeaway_available'
  ) THEN
    ALTER TABLE menu_items ADD COLUMN takeaway_available BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add takeaway-related columns to orders table
DO $$
BEGIN
  -- order_type: 'dine_in' or 'takeaway'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'dine_in';
  END IF;

  -- pickup_code: 6-character code (e.g., ABC123)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN pickup_code VARCHAR(6);
  END IF;

  -- customer_email: for sending pickup notifications
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_email VARCHAR(255);
  END IF;

  -- customer_phone: optional phone number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_phone'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(50);
  END IF;

  -- ready_for_pickup: indicates order is ready to be collected
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'ready_for_pickup'
  ) THEN
    ALTER TABLE orders ADD COLUMN ready_for_pickup BOOLEAN DEFAULT false;
  END IF;

  -- pickup_notified_at: when the "ready for pickup" email was sent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_notified_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN pickup_notified_at TIMESTAMPTZ;
  END IF;

  -- picked_up_at: when the customer collected the order
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'picked_up_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN picked_up_at TIMESTAMPTZ;
  END IF;

  -- locale: customer's language preference for emails
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'locale'
  ) THEN
    ALTER TABLE orders ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
  END IF;
END $$;

-- Add locale to reservations table for booking emails
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservations' AND column_name = 'locale'
  ) THEN
    ALTER TABLE reservations ADD COLUMN locale VARCHAR(10) DEFAULT 'en';
  END IF;
END $$;

-- Create index on pickup_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_pickup_code ON orders(pickup_code) WHERE pickup_code IS NOT NULL;

-- Create index on order_type for filtering
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- Enable RLS policies for the new columns (they inherit existing orders policies)
-- No additional RLS changes needed as the existing orders table policies apply

COMMENT ON COLUMN menu_items.takeaway_available IS 'Whether this item is available for takeaway orders';
COMMENT ON COLUMN orders.order_type IS 'Type of order: dine_in or takeaway';
COMMENT ON COLUMN orders.pickup_code IS 'Unique 6-character code for takeaway order pickup (e.g., ABC123)';
COMMENT ON COLUMN orders.customer_email IS 'Customer email for takeaway order notifications';
COMMENT ON COLUMN orders.customer_phone IS 'Customer phone number (optional)';
COMMENT ON COLUMN orders.ready_for_pickup IS 'Whether the takeaway order is ready for collection';
COMMENT ON COLUMN orders.pickup_notified_at IS 'Timestamp when customer was notified order is ready';
COMMENT ON COLUMN orders.picked_up_at IS 'Timestamp when customer collected the order';
COMMENT ON COLUMN orders.locale IS 'Customer language preference for emails (en, ro, fr, it, es)';
COMMENT ON COLUMN reservations.locale IS 'Customer language preference for emails (en, ro, fr, it, es)';
