-- Add global booking fee columns to restaurants table
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS global_booking_fee_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS global_booking_fee_amount  NUMERIC(10,2) DEFAULT NULL;
