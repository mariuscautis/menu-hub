-- ============================================================
-- Blacklist / booking restrictions + Stripe Connect support
-- ============================================================

-- 1. Stripe Connect account ID on restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded   BOOLEAN DEFAULT FALSE;

-- 2. Customer venue restrictions (block or require deposit)
CREATE TABLE IF NOT EXISTS customer_venue_restrictions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('blocked', 'fee_required')),
  fee_amount    NUMERIC(10,2),          -- only used when type = 'fee_required'
  fee_currency  TEXT DEFAULT 'GBP',
  reason        TEXT,                   -- internal note, never shown to customer
  created_by    UUID,                   -- staff/owner user id
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (customer_id, restaurant_id)
);

-- 3. Booking fee payments — audit trail of collected deposits
CREATE TABLE IF NOT EXISTS booking_fee_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id        UUID REFERENCES reservations(id) ON DELETE SET NULL,
  customer_id           UUID NOT NULL REFERENCES customers(id),
  restaurant_id         UUID NOT NULL REFERENCES restaurants(id),
  stripe_payment_intent TEXT NOT NULL,
  amount                NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'GBP',
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS — restrictions readable/writable by authenticated restaurant owners only
ALTER TABLE customer_venue_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_manage_restrictions"
ON customer_venue_restrictions
FOR ALL
TO authenticated
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
)
WITH CHECK (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "service_role_all_restrictions"
ON customer_venue_restrictions FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 5. RLS — booking fee payments
ALTER TABLE booking_fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers_view_fee_payments"
ON booking_fee_payments
FOR SELECT
TO authenticated
USING (
  restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "service_role_all_fee_payments"
ON booking_fee_payments FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- 6. Index for fast lookups in verify-otp
CREATE INDEX IF NOT EXISTS idx_restrictions_customer_restaurant
  ON customer_venue_restrictions (customer_id, restaurant_id);
