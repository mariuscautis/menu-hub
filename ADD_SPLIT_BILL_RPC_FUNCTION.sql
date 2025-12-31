-- RPC function to process split bill payment (bypasses RLS for PIN-based staff logins)
-- This allows staff members who log in via PIN to create split bill records

CREATE OR REPLACE FUNCTION process_split_bill_payment(
  p_restaurant_id UUID,
  p_table_id UUID,
  p_split_name TEXT,
  p_total_amount DECIMAL(10,2),
  p_payment_method TEXT,
  p_paid_by TEXT,
  p_split_bill_items JSONB, -- Array of {order_item_id, quantity, price, item_total}
  p_paid_by_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_split_bill_id UUID;
  v_item JSONB;
BEGIN
  -- Create the split bill record
  INSERT INTO split_bills (
    restaurant_id,
    table_id,
    split_name,
    total_amount,
    payment_method,
    payment_status,
    paid_by,
    paid_by_user_id,
    paid_at
  ) VALUES (
    p_restaurant_id,
    p_table_id,
    p_split_name,
    p_total_amount,
    p_payment_method,
    'completed',
    p_paid_by,
    p_paid_by_user_id,
    NOW()
  )
  RETURNING id INTO v_split_bill_id;

  -- Insert all split bill items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_split_bill_items)
  LOOP
    INSERT INTO split_bill_items (
      split_bill_id,
      order_item_id,
      quantity,
      price,
      item_total
    ) VALUES (
      v_split_bill_id,
      (v_item->>'order_item_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::DECIMAL(10,2),
      (v_item->>'item_total')::DECIMAL(10,2)
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'split_bill_id', v_split_bill_id,
    'message', 'Split bill payment processed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION process_split_bill_payment IS 'Processes split bill payment, bypassing RLS for PIN-based staff logins';
