-- RPC function to confirm a reservation (bypasses RLS for staff)
CREATE OR REPLACE FUNCTION confirm_reservation(
  p_reservation_id UUID,
  p_table_id UUID,
  p_confirmed_by_staff_name TEXT,
  p_confirmed_by_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_user_restaurant_id UUID;
  v_is_owner BOOLEAN := false;
  v_is_staff BOOLEAN := false;
BEGIN
  -- Get the restaurant_id from the reservation
  SELECT restaurant_id INTO v_restaurant_id
  FROM reservations
  WHERE id = p_reservation_id;

  IF v_restaurant_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reservation not found'
    );
  END IF;

  -- If user_id is provided, check authorization
  IF p_confirmed_by_user_id IS NOT NULL THEN
    -- Check if user is owner of this restaurant
    SELECT EXISTS(
      SELECT 1 FROM restaurants
      WHERE id = v_restaurant_id AND owner_id = p_confirmed_by_user_id
    ) INTO v_is_owner;

    -- Check if user is staff at this restaurant (by user_id)
    IF NOT v_is_owner THEN
      SELECT EXISTS(
        SELECT 1 FROM staff
        WHERE restaurant_id = v_restaurant_id
        AND user_id = p_confirmed_by_user_id
        AND status = 'active'
      ) INTO v_is_staff;
    END IF;

    -- Also check if the user_id is actually a staff.id (for PIN-based logins)
    IF NOT v_is_owner AND NOT v_is_staff THEN
      SELECT EXISTS(
        SELECT 1 FROM staff
        WHERE restaurant_id = v_restaurant_id
        AND id = p_confirmed_by_user_id
        AND status = 'active'
      ) INTO v_is_staff;
    END IF;
  ELSE
    -- If no user_id provided, this is a PIN-based staff login
    -- We trust the staff_name parameter since they got through PIN auth
    v_is_staff := true;
  END IF;

  -- User must be either owner or staff
  IF NOT v_is_owner AND NOT v_is_staff THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: You must be owner or staff of this restaurant'
    );
  END IF;

  -- Verify the table belongs to the same restaurant
  SELECT restaurant_id INTO v_user_restaurant_id
  FROM tables
  WHERE id = p_table_id;

  IF v_user_restaurant_id IS NULL OR v_user_restaurant_id != v_restaurant_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid table for this restaurant'
    );
  END IF;

  -- Update the reservation
  UPDATE reservations
  SET
    status = 'confirmed',
    table_id = p_table_id,
    confirmed_by_staff_name = p_confirmed_by_staff_name,
    confirmed_by_user_id = p_confirmed_by_user_id,
    confirmed_at = NOW()
  WHERE id = p_reservation_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Reservation confirmed successfully'
  );
END;
$$;

-- RPC function to deny a reservation (bypasses RLS for staff)
CREATE OR REPLACE FUNCTION deny_reservation(
  p_reservation_id UUID,
  p_denial_reason TEXT,
  p_denied_by_staff_name TEXT,
  p_denied_by_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_is_owner BOOLEAN := false;
  v_is_staff BOOLEAN := false;
BEGIN
  -- Get the restaurant_id from the reservation
  SELECT restaurant_id INTO v_restaurant_id
  FROM reservations
  WHERE id = p_reservation_id;

  IF v_restaurant_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Reservation not found'
    );
  END IF;

  -- If user_id is provided, check authorization
  IF p_denied_by_user_id IS NOT NULL THEN
    -- Check if user is owner of this restaurant
    SELECT EXISTS(
      SELECT 1 FROM restaurants
      WHERE id = v_restaurant_id AND owner_id = p_denied_by_user_id
    ) INTO v_is_owner;

    -- Check if user is staff at this restaurant (by user_id)
    IF NOT v_is_owner THEN
      SELECT EXISTS(
        SELECT 1 FROM staff
        WHERE restaurant_id = v_restaurant_id
        AND user_id = p_denied_by_user_id
        AND status = 'active'
      ) INTO v_is_staff;
    END IF;

    -- Also check if the user_id is actually a staff.id (for PIN-based logins)
    IF NOT v_is_owner AND NOT v_is_staff THEN
      SELECT EXISTS(
        SELECT 1 FROM staff
        WHERE restaurant_id = v_restaurant_id
        AND id = p_denied_by_user_id
        AND status = 'active'
      ) INTO v_is_staff;
    END IF;
  ELSE
    -- If no user_id provided, this is a PIN-based staff login
    -- We trust the staff_name parameter since they got through PIN auth
    v_is_staff := true;
  END IF;

  -- User must be either owner or staff
  IF NOT v_is_owner AND NOT v_is_staff THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: You must be owner or staff of this restaurant'
    );
  END IF;

  -- Update the reservation
  UPDATE reservations
  SET
    status = 'denied',
    denied_reason = p_denial_reason,
    denied_by_staff_name = p_denied_by_staff_name,
    denied_by_user_id = p_denied_by_user_id,
    denied_at = NOW()
  WHERE id = p_reservation_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Reservation denied successfully'
  );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION confirm_reservation TO authenticated;
GRANT EXECUTE ON FUNCTION deny_reservation TO authenticated;
