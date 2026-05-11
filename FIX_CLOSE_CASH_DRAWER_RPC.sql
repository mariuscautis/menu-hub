-- Fix close_cash_drawer RPC: remove reference to non-existent tip_amount column
-- Run this in the Supabase SQL editor

-- Drop both overloaded versions before recreating
DROP FUNCTION IF EXISTS close_cash_drawer(UUID, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS close_cash_drawer(UUID, NUMERIC, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION close_cash_drawer(
  p_session_id UUID,
  p_closing_amount NUMERIC,
  p_closed_by_name TEXT,
  p_closed_by_id TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(variance NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opening_amount NUMERIC;
  v_cash_sales NUMERIC;
  v_cash_refunds NUMERIC;
  v_expected_amount NUMERIC;
  v_variance NUMERIC;
BEGIN
  -- Get the opening amount from the session
  SELECT opening_amount INTO v_opening_amount
  FROM cash_drawer_sessions
  WHERE id = p_session_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or already closed';
  END IF;

  -- Sum cash sales for this session (no tip_amount column — orders table uses tax_amount)
  SELECT COALESCE(SUM(total), 0) INTO v_cash_sales
  FROM orders
  WHERE cash_drawer_session_id = p_session_id
    AND payment_method = 'cash'
    AND paid = true;

  -- Sum cash refunds for this session
  SELECT COALESCE(SUM(refund_amount), 0) INTO v_cash_refunds
  FROM refunds
  WHERE cash_drawer_session_id = p_session_id
    AND refund_method = 'cash';

  -- Calculate expected and variance
  v_expected_amount := v_opening_amount + v_cash_sales - v_cash_refunds;
  v_variance := p_closing_amount - v_expected_amount;

  -- Close the session
  UPDATE cash_drawer_sessions SET
    status = 'closed',
    closing_amount = p_closing_amount,
    expected_amount = v_expected_amount,
    variance = v_variance,
    closed_at = NOW(),
    closed_by_name = p_closed_by_name,
    closed_by_id = p_closed_by_id,
    notes = p_notes
  WHERE id = p_session_id;

  RETURN QUERY SELECT v_variance;
END;
$$;
