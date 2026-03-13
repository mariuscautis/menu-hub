-- ============================================================
-- Customer Trust System Migration
-- Run this in the Supabase SQL editor
-- ============================================================

-- 1. Customer profiles (keyed by phone number)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  avg_rating NUMERIC(2,1) DEFAULT NULL,
  total_bookings INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);

-- 2. SMS OTP verification codes
CREATE TABLE IF NOT EXISTS sms_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  otp_hash TEXT NOT NULL,          -- bcrypt/sha256 hash of the 6-digit code
  expires_at TIMESTAMPTZ NOT NULL, -- 10 minutes from creation
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast phone lookups
CREATE INDEX IF NOT EXISTS sms_otps_phone_idx ON sms_otps (phone);

-- 3. Customer ratings (one per reservation, left by the manager)
CREATE TABLE IF NOT EXISTS customer_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (reservation_id) -- one rating per reservation
);

-- Index for fast customer rating lookups
CREATE INDEX IF NOT EXISTS customer_ratings_customer_idx ON customer_ratings (customer_id);

-- 4. Add customer_id FK to reservations
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS reservations_customer_id_idx ON reservations (customer_id);

-- 5. Function to recalculate avg_rating + total_bookings on customers table
CREATE OR REPLACE FUNCTION recalculate_customer_stats(p_customer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE customers SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 1)
      FROM customer_ratings
      WHERE customer_id = p_customer_id
    ),
    total_bookings = (
      SELECT COUNT(*)
      FROM reservations
      WHERE customer_id = p_customer_id
        AND status NOT IN ('cancelled', 'denied')
    )
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger: auto-update stats when a rating is inserted/updated/deleted
CREATE OR REPLACE FUNCTION trigger_recalculate_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_customer_stats(OLD.customer_id);
  ELSE
    PERFORM recalculate_customer_stats(NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_rating_change ON customer_ratings;
CREATE TRIGGER on_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON customer_ratings
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_customer_stats();

-- 7. RLS Policies — service role bypasses all, anon can insert OTPs only

-- customers: only service role can read/write
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON customers;
CREATE POLICY "Service role full access" ON customers
  USING (auth.role() = 'service_role');

-- sms_otps: only service role
ALTER TABLE sms_otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON sms_otps;
CREATE POLICY "Service role full access" ON sms_otps
  USING (auth.role() = 'service_role');

-- customer_ratings: only service role
ALTER TABLE customer_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON customer_ratings;
CREATE POLICY "Service role full access" ON customer_ratings
  USING (auth.role() = 'service_role');
