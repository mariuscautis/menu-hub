-- =============================================
-- Update Staff Leave Management System
-- =============================================
-- This update ensures all components are properly installed
-- Safe to run multiple times

-- 1. Ensure staff_leave_entitlements table exists with correct structure
CREATE TABLE IF NOT EXISTS staff_leave_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Annual Holiday Allowance (UK standard is 28 days including bank holidays)
  annual_holiday_days DECIMAL(5,2) NOT NULL DEFAULT 28.0,
  holiday_year_start DATE NOT NULL,

  -- Current Year Balances
  holiday_days_used DECIMAL(5,2) NOT NULL DEFAULT 0,
  holiday_days_remaining DECIMAL(5,2) GENERATED ALWAYS AS (annual_holiday_days - holiday_days_used) STORED,
  holiday_days_pending DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Sick Leave Tracking
  sick_days_this_year DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Carry Over
  carry_over_days DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Meta
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(staff_id),
  CHECK (annual_holiday_days >= 0),
  CHECK (holiday_days_used >= 0),
  CHECK (holiday_days_pending >= 0),
  CHECK (sick_days_this_year >= 0),
  CHECK (carry_over_days >= 0)
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_staff_leave_entitlements_staff') THEN
    CREATE INDEX idx_staff_leave_entitlements_staff ON staff_leave_entitlements(staff_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_staff_leave_entitlements_restaurant') THEN
    CREATE INDEX idx_staff_leave_entitlements_restaurant ON staff_leave_entitlements(restaurant_id);
  END IF;
END $$;

-- 2. Add new columns to shift_requests table
ALTER TABLE shift_requests
ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS days_requested DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS medical_certificate_provided BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_to_work_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sick_leave_notes TEXT;

-- 3. Create or replace working days calculation function
CREATE OR REPLACE FUNCTION calculate_working_days(start_date DATE, end_date DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  days INTEGER;
  weekends INTEGER;
  working_days DECIMAL(5,2);
BEGIN
  days := (end_date - start_date) + 1;
  weekends := (SELECT COUNT(*)
              FROM generate_series(start_date, end_date, '1 day'::interval) AS d
              WHERE EXTRACT(DOW FROM d) IN (0, 6));
  working_days := days - weekends;
  RETURN working_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Create or replace trigger function to auto-calculate days
CREATE OR REPLACE FUNCTION auto_calculate_days_requested()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_type = 'time_off' AND NEW.date_from IS NOT NULL AND NEW.date_to IS NOT NULL THEN
    NEW.days_requested := calculate_working_days(NEW.date_from, NEW.date_to);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_calculate_days_requested ON shift_requests;
CREATE TRIGGER trigger_calculate_days_requested
BEFORE INSERT OR UPDATE ON shift_requests
FOR EACH ROW
EXECUTE FUNCTION auto_calculate_days_requested();

-- 5. Create or replace leave balance update function
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

      -- Request approved
      IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        IF NEW.leave_type = 'annual_holiday' THEN
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            holiday_days_used = holiday_days_used + COALESCE(NEW.days_requested, 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        ELSIF NEW.leave_type IN ('sick_self_cert', 'sick_medical_cert') THEN
          UPDATE staff_leave_entitlements
          SET
            sick_days_this_year = sick_days_this_year + COALESCE(NEW.days_requested, 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;

      -- Request rejected
      ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        IF NEW.leave_type = 'annual_holiday' THEN
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        END IF;

      -- Request cancelled
      ELSIF NEW.status = 'cancelled' THEN
        IF OLD.status = 'pending' AND NEW.leave_type = 'annual_holiday' THEN
          UPDATE staff_leave_entitlements
          SET
            holiday_days_pending = GREATEST(holiday_days_pending - COALESCE(NEW.days_requested, 0), 0),
            updated_at = NOW()
          WHERE staff_id = NEW.staff_id;
        ELSIF OLD.status = 'approved' AND NEW.leave_type = 'annual_holiday' THEN
          UPDATE staff_leave_entitlements
          SET
            holiday_days_used = GREATEST(holiday_days_used - COALESCE(NEW.days_requested, 0), 0),
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

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_update_leave_balances ON shift_requests;
CREATE TRIGGER trigger_update_leave_balances
AFTER INSERT OR UPDATE ON shift_requests
FOR EACH ROW
EXECUTE FUNCTION update_leave_balances();

-- 6. Enable RLS and create policies
ALTER TABLE staff_leave_entitlements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff can view own entitlement" ON staff_leave_entitlements;
DROP POLICY IF EXISTS "Owners can manage entitlements" ON staff_leave_entitlements;

-- Recreate policies
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

CREATE POLICY "Owners can manage entitlements"
ON staff_leave_entitlements FOR ALL
USING (
  auth.uid() IN (
    SELECT owner_id FROM restaurants WHERE id = restaurant_id
  )
);

-- 7. Create or replace view
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
  (e.holiday_days_remaining - e.holiday_days_pending) AS holiday_days_available,
  e.sick_days_this_year,
  e.carry_over_days,
  e.updated_at AS entitlement_updated_at
FROM staff s
LEFT JOIN staff_leave_entitlements e ON s.id = e.staff_id
WHERE s.status = 'active';

-- 8. Create pro-rata calculation function
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
  year_end := holiday_year_start + INTERVAL '1 year' - INTERVAL '1 day';
  days_in_year := (year_end - holiday_year_start) + 1;

  IF holiday_year_start < CURRENT_DATE THEN
    days_remaining := GREATEST((year_end - CURRENT_DATE) + 1, 0);
  ELSE
    days_remaining := days_in_year;
  END IF;

  prorata_days := (full_annual_days * days_remaining::DECIMAL) / days_in_year::DECIMAL;
  RETURN ROUND(prorata_days, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Create reset leave year function
CREATE OR REPLACE FUNCTION reset_staff_leave_year(p_staff_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE staff_leave_entitlements
  SET
    holiday_days_used = 0,
    sick_days_this_year = 0,
    carry_over_days = LEAST(holiday_days_remaining, 5.0),
    holiday_year_start = holiday_year_start + INTERVAL '1 year',
    updated_at = NOW()
  WHERE staff_id = p_staff_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Grant permissions
GRANT SELECT ON staff_leave_balances TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_working_days TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_prorata_holidays TO authenticated;
GRANT EXECUTE ON FUNCTION reset_staff_leave_year TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Staff Leave Management System updated successfully!';
  RAISE NOTICE 'All triggers, functions, and policies are now in place.';
END $$;
