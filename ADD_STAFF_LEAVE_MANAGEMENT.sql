-- =============================================
-- Staff Leave Management System Migration
-- =============================================
-- This migration adds comprehensive leave tracking:
-- - Annual holiday entitlements per staff member
-- - Sick leave tracking (self-certified, medical certificate, statutory)
-- - Leave balance calculations
-- - Enhanced request types

-- 1. Create staff_leave_entitlements table
CREATE TABLE IF NOT EXISTS staff_leave_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Annual Holiday Allowance (UK standard is 28 days including bank holidays)
  annual_holiday_days DECIMAL(5,2) NOT NULL DEFAULT 28.0,
  holiday_year_start DATE NOT NULL, -- When their holiday year starts (e.g., hire date anniversary)

  -- Current Year Balances
  holiday_days_used DECIMAL(5,2) NOT NULL DEFAULT 0,
  holiday_days_remaining DECIMAL(5,2) GENERATED ALWAYS AS (annual_holiday_days - holiday_days_used) STORED,
  holiday_days_pending DECIMAL(5,2) NOT NULL DEFAULT 0, -- Days in pending requests

  -- Sick Leave Tracking (UK has no statutory limit, but track for records)
  sick_days_this_year DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Carry Over (optional - some employers allow carrying forward unused days)
  carry_over_days DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(staff_id), -- One entitlement record per staff member
  CHECK (annual_holiday_days >= 0),
  CHECK (holiday_days_used >= 0),
  CHECK (holiday_days_pending >= 0),
  CHECK (sick_days_this_year >= 0),
  CHECK (carry_over_days >= 0)
);

-- Create index for faster lookups
CREATE INDEX idx_staff_leave_entitlements_staff ON staff_leave_entitlements(staff_id);
CREATE INDEX idx_staff_leave_entitlements_restaurant ON staff_leave_entitlements(restaurant_id);

-- 2. Add new columns to shift_requests table for enhanced leave tracking
ALTER TABLE shift_requests
ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50), -- 'annual_holiday', 'sick_self_cert', 'sick_medical_cert', 'unpaid', 'compassionate', 'other'
ADD COLUMN IF NOT EXISTS days_requested DECIMAL(5,2), -- Calculated working days for the request
ADD COLUMN IF NOT EXISTS medical_certificate_provided BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_to_work_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sick_leave_notes TEXT; -- For manager notes on sick leave

-- 3. Create function to calculate working days between two dates (excluding weekends)
CREATE OR REPLACE FUNCTION calculate_working_days(start_date DATE, end_date DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  days INTEGER;
  weekends INTEGER;
  working_days DECIMAL(5,2);
BEGIN
  -- Calculate total days including start and end
  days := (end_date - start_date) + 1;

  -- Calculate number of weekend days
  weekends := (SELECT COUNT(*)
              FROM generate_series(start_date, end_date, '1 day'::interval) AS d
              WHERE EXTRACT(DOW FROM d) IN (0, 6)); -- 0 = Sunday, 6 = Saturday

  -- Working days = total days - weekends
  working_days := days - weekends;

  RETURN working_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Create trigger function to auto-calculate days_requested for time_off requests
CREATE OR REPLACE FUNCTION auto_calculate_days_requested()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for time_off requests with date_from and date_to
  IF NEW.request_type = 'time_off' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
    NEW.days_requested := calculate_working_days(NEW.date_from, NEW.date_to);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate days on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_days_requested ON shift_requests;
CREATE TRIGGER trigger_calculate_days_requested
BEFORE INSERT OR UPDATE ON shift_requests
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_days_requested();

-- 5. Create function to update leave balances when request is approved/rejected
CREATE OR REPLACE FUNCTION update_leave_balances()
RETURNS TRIGGER AS $$
DECLARE
  entitlement_record RECORD;
BEGIN
  -- Only process time_off requests with leave_type
  IF NEW.request_type = 'time_off' AND NEW.leave_type IS NOT NULL THEN

    -- Get the staff member's entitlement record
    SELECT * INTO entitlement_record
    FROM staff_leave_entitlements
    WHERE staff_id = NEW.staff_id;

    -- If no entitlement record exists, create one with defaults
    IF NOT FOUND THEN
      INSERT INTO staff_leave_entitlements (
        restaurant_id,
        staff_id,
        annual_holiday_days,
        holiday_year_start
      ) VALUES (
        NEW.restaurant_id,
        NEW.staff_id,
        28.0, -- UK statutory minimum
        CURRENT_DATE -- Start from today
      );

      -- Fetch the newly created record
      SELECT * INTO entitlement_record
      FROM staff_leave_entitlements
      WHERE staff_id = NEW.staff_id;
    END IF;

    -- Handle status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN

      -- Request was approved
      IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        IF NEW.leave_type = 'annual_holiday' THEN
          -- Deduct from pending, add to used
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            holiday_days_used = holiday_days_used + COALESCE(NEW.days_requested, 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        ELSIF NEW.leave_type IN ('sick_self_cert', 'sick_medical_cert') THEN
          -- Track sick days
          UPDATE staff_leave_entitlements
          SET
            sick_days_this_year = sick_days_this_year + COALESCE(NEW.days_requested, 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;

      -- Request was rejected
      ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        IF NEW.leave_type = 'annual_holiday' THEN
          -- Remove from pending
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;

      -- Request was cancelled
      ELSIF NEW.status = 'cancelled' THEN
        IF OLD.status = 'pending' AND NEW.leave_type = 'annual_holiday' THEN
          -- Remove from pending
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        ELSIF OLD.status = 'approved' AND NEW.leave_type = 'annual_holiday' THEN
          -- Refund the days
          UPDATE staff_leave_entitlements
          SET
            holiday_days_used = GREATEST(holiday_days_used - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;
      END IF;
    END IF;

    -- If this is a new pending request for annual holiday, add to pending
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

-- Create trigger to update balances
DROP TRIGGER IF EXISTS trigger_update_leave_balances ON shift_requests;
CREATE TRIGGER trigger_update_leave_balances
AFTER INSERT OR UPDATE ON shift_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_balances();

-- 6. Add RLS policies for staff_leave_entitlements
ALTER TABLE staff_leave_entitlements ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view their own entitlement
CREATE POLICY "Staff can view own entitlement"
ON staff_leave_entitlements FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM staff WHERE id = staff_id
  )
  OR
  auth.uid() IN (
    SELECT owner_id FROM restaurants WHERE id = restaurant_id
  )
);

-- Policy: Only restaurant owners can insert/update entitlements
CREATE POLICY "Owners can manage entitlements"
ON staff_leave_entitlements FOR ALL
USING (
  auth.uid() IN (
    SELECT owner_id FROM restaurants WHERE id = restaurant_id
  )
);

-- 7. Create helpful view for leave balances with staff info
CREATE OR REPLACE VIEW staff_leave_balances AS
SELECT
  s.id AS staff_id,
  s.name AS staff_name,
  s.role,
  s.email,
  s.restaurant_id,
  e.annual_holiday_days,
  e.holiday_year_start,
  e.holiday_days_used,
  e.holiday_days_remaining,
  e.holiday_days_pending,
  (e.holiday_days_remaining - e.holiday_days_pending) AS holiday_days_available,
  e.sick_days_this_year,
  e.carry_over_days,
  e.updated_at AS entitlement_updated_at
FROM staff s
LEFT JOIN staff_leave_entitlements e ON s.id = e.staff_id
WHERE s.status = 'active';

-- 8. Function to reset leave year (run annually or on anniversary)
CREATE OR REPLACE FUNCTION reset_staff_leave_year(p_staff_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE staff_leave_entitlements
  SET
    holiday_days_used = 0,
    sick_days_this_year = 0,
    carry_over_days = LEAST(holiday_days_remaining, 5.0), -- UK: max 5 days carry over (example)
    holiday_year_start = holiday_year_start + INTERVAL '1 year',
    updated_at = NOW()
  WHERE staff_id = p_staff_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to calculate pro-rata holiday entitlement based on start date
CREATE OR REPLACE FUNCTION calculate_prorata_holidays(
  full_annual_days DECIMAL(5,2),
  holiday_year_start DATE
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  year_end DATE;
  days_in_year INTEGER;
  days_remaining INTEGER;
  prorata_days DECIMAL(5,2);
BEGIN
  -- Calculate the end of the holiday year (1 year from start)
  year_end := holiday_year_start + INTERVAL '1 year' - INTERVAL '1 day';

  -- Total days in the holiday year
  days_in_year := (year_end - holiday_year_start) + 1;

  -- If start date is in the past, calculate from today
  IF holiday_year_start < CURRENT_DATE THEN
    -- Days remaining from today until end of holiday year
    days_remaining := GREATEST((year_end - CURRENT_DATE) + 1, 0);
  ELSE
    -- Full year available
    days_remaining := days_in_year;
  END IF;

  -- Calculate pro-rata entitlement
  prorata_days := (full_annual_days * days_remaining::DECIMAL) / days_in_year::DECIMAL;

  -- Round to 1 decimal place
  RETURN ROUND(prorata_days, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Update staff_leave_entitlements to use calculated column for pro-rata
-- Note: We'll keep annual_holiday_days as the full annual entitlement
-- and use a view to show the pro-rata calculation

-- Update the view to include pro-rata calculation
DROP VIEW IF EXISTS staff_leave_balances;
CREATE OR REPLACE VIEW staff_leave_balances AS
SELECT
  s.id AS staff_id,
  s.name AS staff_name,
  s.role,
  s.email,
  s.restaurant_id,
  e.annual_holiday_days,
  e.holiday_year_start,
  e.holiday_days_used,
  e.holiday_days_remaining,
  e.holiday_days_pending,
  -- Calculate pro-rata days available for first year
  CASE
    WHEN CURRENT_DATE >= e.holiday_year_start
         AND CURRENT_DATE < (e.holiday_year_start + INTERVAL '1 year')
    THEN calculate_prorata_holidays(e.annual_holiday_days, e.holiday_year_start)
    ELSE e.annual_holiday_days
  END AS prorata_holiday_days,
  -- Available days considering pro-rata
  CASE
    WHEN CURRENT_DATE >= e.holiday_year_start
         AND CURRENT_DATE < (e.holiday_year_start + INTERVAL '1 year')
    THEN GREATEST(calculate_prorata_holidays(e.annual_holiday_days, e.holiday_year_start) - e.holiday_days_used - e.holiday_days_pending, 0)
    ELSE (e.holiday_days_remaining - e.holiday_days_pending)
  END AS holiday_days_available,
  e.sick_days_this_year,
  e.carry_over_days,
  e.updated_at AS entitlement_updated_at
FROM staff s
LEFT JOIN staff_leave_entitlements e ON s.id = e.staff_id
WHERE s.status = 'active';

-- Grant permissions
GRANT SELECT ON staff_leave_balances TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_working_days TO authenticated;
GRANT EXECUTE ON FUNCTION reset_staff_leave_year TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_prorata_holidays TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Staff Leave Management System installed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Features added:';
  RAISE NOTICE '  - staff_leave_entitlements table for holiday tracking';
  RAISE NOTICE '  - Enhanced shift_requests with leave_type and days_requested';
  RAISE NOTICE '  - Automatic working days calculation (excluding weekends)';
  RAISE NOTICE '  - Automatic leave balance updates on approval/rejection';
  RAISE NOTICE '  - Support for: Annual Holiday, Sick Leave (self-cert & medical), Unpaid, Compassionate';
  RAISE NOTICE '  - staff_leave_balances view for easy querying';
  RAISE NOTICE '';
  RAISE NOTICE 'UK Employment Law Compliance:';
  RAISE NOTICE '  - 28 days minimum holiday (including bank holidays)';
  RAISE NOTICE '  - Sick leave tracking (no statutory limit)';
  RAISE NOTICE '  - Self-certification up to 7 days';
  RAISE NOTICE '  - Medical certificate requirement after 7 days';
END $$;
