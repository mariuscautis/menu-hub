-- ============================================================
-- SMS Billing: usage tracking + per-venue billing settings
-- ============================================================

-- 1. Add SMS billing columns to restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS sms_billing_enabled   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_billing_rate_pence INT     DEFAULT 20;  -- pence per SMS, default 20p

-- 2. SMS usage log — one row per OTP successfully sent
CREATE TABLE IF NOT EXISTS sms_usage_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,             -- recipient (normalised)
  sent_at       TIMESTAMPTZ DEFAULT now(),
  billing_month TEXT NOT NULL              -- e.g. '2026-03', set on insert
);

-- Index for fast month-based billing queries
CREATE INDEX IF NOT EXISTS idx_sms_usage_log_billing
  ON sms_usage_log (restaurant_id, billing_month);

-- 3. Billing run audit — records each monthly billing run
CREATE TABLE IF NOT EXISTS sms_billing_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_month TEXT NOT NULL,             -- e.g. '2026-02'
  ran_at        TIMESTAMPTZ DEFAULT now(),
  run_by        UUID,                      -- admin user_id
  results       JSONB DEFAULT '[]'         -- array of { restaurant_id, name, sms_count, amount_pence, stripe_invoice_item_id, error }
);

-- 4. RLS: service role only
ALTER TABLE sms_usage_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_billing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_sms_usage"
  ON sms_usage_log FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_all_sms_billing_runs"
  ON sms_billing_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
