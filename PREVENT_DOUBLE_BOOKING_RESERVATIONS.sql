-- Add double-booking prevention trigger for reservations
-- This prevents the same table from being booked for overlapping time periods

-- Create the function that checks for reservation conflicts
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
DECLARE
  new_start_time TIMESTAMP;
  new_end_time TIMESTAMP;
  existing_start_time TIMESTAMP;
  existing_end_time TIMESTAMP;
  default_duration_minutes INTEGER := 120; -- Default 2 hours per reservation
BEGIN
  -- Combine NEW record's date and time to create start timestamp
  new_start_time := NEW.reservation_date::TIMESTAMP + NEW.reservation_time::TIME;
  new_end_time := new_start_time + (default_duration_minutes || ' minutes')::INTERVAL;

  -- Check if there's an overlapping reservation for the same table
  FOR existing_start_time, existing_end_time IN
    SELECT
      reservation_date::TIMESTAMP + reservation_time::TIME,
      reservation_date::TIMESTAMP + reservation_time::TIME + (default_duration_minutes || ' minutes')::INTERVAL
    FROM reservations
    WHERE table_id = NEW.table_id
    AND restaurant_id = NEW.restaurant_id
    AND status IN ('pending', 'confirmed')  -- Only check active reservations
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)  -- Exclude current record on updates
  LOOP
    -- Check for time overlap
    -- Two time ranges overlap if: start1 < end2 AND end1 > start2
    IF new_start_time < existing_end_time AND new_end_time > existing_start_time THEN
      RAISE EXCEPTION 'This table is already reserved for the selected time. Please choose a different table or time slot.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that runs before insert or update
DROP TRIGGER IF EXISTS prevent_double_booking ON reservations;

CREATE TRIGGER prevent_double_booking
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION check_reservation_conflict();

-- Add a helpful comment
COMMENT ON FUNCTION check_reservation_conflict() IS 'Prevents double-booking by checking for overlapping reservations on the same table';
