-- Fix cash drawer session stamping on cash orders
-- The client-side stamp was silently failing; this trigger handles it server-side,
-- atomically, whenever an order is marked paid with payment_method = 'cash'.
--
-- Run this in the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger function: auto-stamp the open cash drawer session onto cash orders
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION auto_stamp_cash_drawer_session()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Only act when an order transitions to paid=true with payment_method='cash'
  -- and doesn't already have a session stamped
  IF NEW.paid = true
     AND NEW.payment_method = 'cash'
     AND NEW.cash_drawer_session_id IS NULL
     AND NEW.restaurant_id IS NOT NULL
     AND (OLD.paid IS DISTINCT FROM true OR OLD.payment_method IS DISTINCT FROM 'cash')
  THEN
    -- Find the currently open cash drawer session for this restaurant
    SELECT id INTO v_session_id
    FROM cash_drawer_sessions
    WHERE restaurant_id = NEW.restaurant_id
      AND status = 'open'
    LIMIT 1;

    IF v_session_id IS NOT NULL THEN
      NEW.cash_drawer_session_id := v_session_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_stamp_cash_drawer_session ON orders;

CREATE TRIGGER trg_stamp_cash_drawer_session
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_stamp_cash_drawer_session();

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: stamp existing paid cash orders that are missing a session link
-- Matches orders to the session that was open at the time of payment
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE orders o
SET cash_drawer_session_id = (
  SELECT s.id
  FROM cash_drawer_sessions s
  WHERE s.restaurant_id = o.restaurant_id
    AND s.status IN ('open', 'closed')
    AND o.created_at >= s.opened_at
    AND (s.closed_at IS NULL OR o.created_at <= s.closed_at)
  ORDER BY s.opened_at DESC
  LIMIT 1
)
WHERE o.paid = true
  AND o.payment_method = 'cash'
  AND o.cash_drawer_session_id IS NULL
  AND EXISTS (
    SELECT 1 FROM cash_drawer_sessions s
    WHERE s.restaurant_id = o.restaurant_id
  );
