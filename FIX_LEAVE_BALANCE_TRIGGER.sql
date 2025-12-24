-- =============================================
-- Fix Leave Balance Trigger for Cancellations
-- =============================================
-- This ensures that days are properly returned when requests are cancelled

CREATE OR REPLACE FUNCTION update_leave_balances()
RETURNS TRIGGER AS $$
DECLARE
  entitlement_record RECORD;
BEGIN
  -- Only process time_off requests with leave_type
  IF NEW.request_type = 'time_off' AND NEW.leave_type IS NOT NULL THEN

    -- Get or create entitlement record
    SELECT * INTO entitlement_record
    FROM staff_leave_entitlements
    WHERE staff_id = NEW.staff_id;

    IF NOT FOUND THEN
      INSERT INTO staff_leave_entitlements (
        restaurant_id,
        staff_id,
        annual_holiday_days,
        holiday_year_start
      ) VALUES (
        NEW.restaurant_id,
        NEW.staff_id,
        28.0,
        CURRENT_DATE
      );

      SELECT * INTO entitlement_record
      FROM staff_leave_entitlements
      WHERE staff_id = NEW.staff_id;
    END IF;

    -- Handle status changes (only if OLD exists - not for INSERT)
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN

      -- Request approved (from pending)
      IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        IF NEW.leave_type = 'annual_holiday' THEN
          -- Move from pending to used
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            holiday_days_used = holiday_days_used + COALESCE(NEW.days_requested, 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        ELSIF NEW.leave_type IN ('sick_self_cert', 'sick_medical_cert') THEN
          -- Track sick days (no pending for sick leave)
          UPDATE staff_leave_entitlements
          SET
            sick_days_this_year = sick_days_this_year + COALESCE(NEW.days_requested, 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;

      -- Request rejected (from pending)
      ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        IF NEW.leave_type = 'annual_holiday' THEN
          -- Return pending days
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;

      -- Request cancelled
      ELSIF NEW.status = 'cancelled' THEN
        -- From pending - return pending days
        IF OLD.status = 'pending' AND NEW.leave_type = 'annual_holiday' THEN
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;

        -- From approved - return used days to available
        ELSIF OLD.status = 'approved' AND NEW.leave_type = 'annual_holiday' THEN
          UPDATE staff_leave_entitlements
          SET
            holiday_days_used = GREATEST(holiday_days_used - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;

        -- From approved sick leave - deduct sick days
        ELSIF OLD.status = 'approved' AND NEW.leave_type IN ('sick_self_cert', 'sick_medical_cert') THEN
          UPDATE staff_leave_entitlements
          SET
            sick_days_this_year = GREATEST(sick_days_this_year - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;
      END IF;
    END IF;

    -- New pending request for annual holiday - add to pending
    IF TG_OP = 'INSERT' AND NEW.status = 'pending' AND NEW.leave_type = 'annual_holiday' THEN
      UPDATE staff_leave_entitlements
      SET
        holiday_days_pending = holiday_days_pending + COALESCE(NEW.days_requested, 0),
        updated_at = NOW()
      WHERE staff_id = NEW.staff_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_update_leave_balances ON shift_requests;
CREATE TRIGGER trigger_update_leave_balances
AFTER INSERT OR UPDATE ON shift_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_balances();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Leave balance trigger updated!';
  RAISE NOTICE 'Cancellations now properly return days to staff allowances.';
  RAISE NOTICE '';
  RAISE NOTICE 'Behavior:';
  RAISE NOTICE '  - Pending → Cancelled: Returns pending days';
  RAISE NOTICE '  - Approved → Cancelled: Returns used days back to available';
  RAISE NOTICE '  - Rejected: Returns pending days';
  RAISE NOTICE '  - Approved sick leave cancelled: Deducts from sick days tracked';
END $$;
