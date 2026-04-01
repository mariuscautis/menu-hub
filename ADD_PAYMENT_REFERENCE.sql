-- Add payment_reference column to orders table
-- Used to store custom payment references from external POS terminals
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_reference TEXT DEFAULT NULL;

COMMENT ON COLUMN orders.payment_reference IS 'Optional custom reference from an external POS/bank terminal (e.g. approval code) entered by staff at the time of payment.';
