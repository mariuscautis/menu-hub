-- Track when a payment failure occurred, to enforce a 3-day grace period
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz;
