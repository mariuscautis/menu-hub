-- ============================================
-- STAFF ROTA & SCHEDULING SYSTEM - HELPER FUNCTIONS
-- ============================================
-- This migration creates SQL functions for business logic and calculations

-- ============================================
-- 1. CHECK SHIFT CONFLICTS
-- ============================================
-- Checks if a staff member has conflicting shifts or insufficient rest period

CREATE OR REPLACE FUNCTION check_shift_conflicts(
  p_staff_id UUID,
  p_date DATE,
  p_shift_start TIME,
  p_shift_end TIME,
  p_shift_id UUID DEFAULT NULL  -- Exclude this shift ID when updating
)
RETURNS TABLE(
  has_conflict BOOLEAN,
  conflict_type VARCHAR(50),
  conflict_message TEXT
) AS $$
DECLARE
  v_conflict_count INTEGER;
  v_previous_shift_end TIMESTAMP;
  v_hours_since_last_shift DECIMAL;
BEGIN
  -- Check for overlapping shifts on the same day
  SELECT COUNT(*)
  INTO v_conflict_count
  FROM shifts
  WHERE staff_id = p_staff_id
    AND date = p_date
    AND status != 'cancelled'
    AND (p_shift_id IS NULL OR id != p_shift_id)
    AND (
      (shift_start, shift_end) OVERLAPS (p_shift_start, p_shift_end)
    );

  IF v_conflict_count > 0 THEN
    RETURN QUERY SELECT TRUE, 'overlap'::VARCHAR(50),
      'Staff member already has a shift during this time'::TEXT;
    RETURN;
  END IF;

  -- Check for 11-hour rest period (UK law)
  -- Get the end time of the most recent previous shift
  SELECT (s.date + s.shift_end)::TIMESTAMP
  INTO v_previous_shift_end
  FROM shifts s
  WHERE s.staff_id = p_staff_id
    AND s.status != 'cancelled'
    AND (p_shift_id IS NULL OR s.id != p_shift_id)
    AND (s.date < p_date OR (s.date = p_date AND s.shift_end < p_shift_start))
  ORDER BY s.date DESC, s.shift_end DESC
  LIMIT 1;

  IF v_previous_shift_end IS NOT NULL THEN
    v_hours_since_last_shift := EXTRACT(EPOCH FROM
      ((p_date + p_shift_start)::TIMESTAMP - v_previous_shift_end)
    ) / 3600;

    IF v_hours_since_last_shift < 11 THEN
      RETURN QUERY SELECT TRUE, 'rest_period'::VARCHAR(50),
        FORMAT('Only %.1f hours since last shift. Requires 11-hour rest period.', v_hours_since_last_shift)::TEXT;
      RETURN;
    END IF;
  END IF;

  -- No conflicts found
  RETURN QUERY SELECT FALSE, NULL::VARCHAR(50), NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_shift_conflicts IS 'Checks for shift conflicts and validates 11-hour rest period between shifts';

-- ============================================
-- 2. CALCULATE SHIFT HOURS
-- ============================================
-- Calculates worked hours for a shift including break deductions

CREATE OR REPLACE FUNCTION calculate_shift_hours(
  p_shift_start TIME,
  p_shift_end TIME,
  p_break_duration INTEGER DEFAULT 0
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_minutes INTEGER;
  v_worked_hours DECIMAL;
BEGIN
  -- Calculate total minutes between start and end
  v_total_minutes := EXTRACT(EPOCH FROM (p_shift_end - p_shift_start)) / 60;

  -- Subtract break duration
  v_total_minutes := v_total_minutes - COALESCE(p_break_duration, 0);

  -- Convert to hours (2 decimal places)
  v_worked_hours := ROUND((v_total_minutes::DECIMAL / 60), 2);

  RETURN v_worked_hours;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_shift_hours IS 'Calculates worked hours for a shift minus break duration';

-- ============================================
-- 3. CALCULATE OVERTIME HOURS
-- ============================================
-- Calculates regular and overtime hours for a staff member in a date range

CREATE OR REPLACE FUNCTION calculate_overtime(
  p_staff_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE(
  total_hours DECIMAL,
  regular_hours DECIMAL,
  overtime_hours DECIMAL,
  weekly_breakdown JSONB
) AS $$
DECLARE
  v_contract_hours DECIMAL;
  v_week_start DATE;
  v_week_hours DECIMAL;
  v_total_regular DECIMAL := 0;
  v_total_overtime DECIMAL := 0;
  v_total_hours DECIMAL := 0;
  v_breakdown JSONB := '[]'::JSONB;
  v_week_data JSONB;
BEGIN
  -- Get staff contract hours (default 40 if not set)
  SELECT COALESCE(contract_hours, 40.00)
  INTO v_contract_hours
  FROM staff
  WHERE id = p_staff_id;

  -- Calculate weekly hours and overtime
  FOR v_week_start IN
    SELECT DISTINCT date_trunc('week', s.date)::DATE
    FROM shifts s
    WHERE s.staff_id = p_staff_id
      AND s.date BETWEEN p_date_from AND p_date_to
      AND s.status = 'completed'
    ORDER BY date_trunc('week', s.date)::DATE
  LOOP
    -- Calculate total hours for this week
    SELECT COALESCE(SUM(calculate_shift_hours(shift_start, shift_end, break_duration)), 0)
    INTO v_week_hours
    FROM shifts
    WHERE staff_id = p_staff_id
      AND date >= v_week_start
      AND date < v_week_start + INTERVAL '7 days'
      AND status = 'completed';

    -- Calculate regular and overtime
    IF v_week_hours > v_contract_hours THEN
      v_total_regular := v_total_regular + v_contract_hours;
      v_total_overtime := v_total_overtime + (v_week_hours - v_contract_hours);
    ELSE
      v_total_regular := v_total_regular + v_week_hours;
    END IF;

    v_total_hours := v_total_hours + v_week_hours;

    -- Add to breakdown
    v_week_data := jsonb_build_object(
      'week_start', v_week_start,
      'total_hours', v_week_hours,
      'regular_hours', LEAST(v_week_hours, v_contract_hours),
      'overtime_hours', GREATEST(v_week_hours - v_contract_hours, 0)
    );
    v_breakdown := v_breakdown || v_week_data;
  END LOOP;

  RETURN QUERY SELECT v_total_hours, v_total_regular, v_total_overtime, v_breakdown;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_overtime IS 'Calculates regular and overtime hours based on staff contract hours';

-- ============================================
-- 4. GET AVAILABLE STAFF FOR SHIFT
-- ============================================
-- Returns staff members available for a specific shift time

CREATE OR REPLACE FUNCTION get_available_staff(
  p_restaurant_id UUID,
  p_date DATE,
  p_shift_start TIME,
  p_shift_end TIME,
  p_role_required VARCHAR(50) DEFAULT NULL,
  p_department VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE(
  staff_id UUID,
  staff_name VARCHAR(255),
  staff_role VARCHAR(50),
  hourly_rate DECIMAL,
  is_available BOOLEAN,
  unavailable_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.role,
    s.hourly_rate,
    CASE
      -- Check if staff has conflicting shift
      WHEN EXISTS (
        SELECT 1 FROM shifts sh
        WHERE sh.staff_id = s.id
          AND sh.date = p_date
          AND sh.status != 'cancelled'
          AND (sh.shift_start, sh.shift_end) OVERLAPS (p_shift_start, p_shift_end)
      ) THEN FALSE
      -- Check if staff has approved time-off
      WHEN EXISTS (
        SELECT 1 FROM shift_requests sr
        WHERE sr.staff_id = s.id
          AND sr.request_type = 'time_off'
          AND sr.status = 'approved'
          AND p_date BETWEEN sr.date_from AND sr.date_to
      ) THEN FALSE
      ELSE TRUE
    END AS is_available,
    CASE
      WHEN EXISTS (
        SELECT 1 FROM shifts sh
        WHERE sh.staff_id = s.id
          AND sh.date = p_date
          AND sh.status != 'cancelled'
          AND (sh.shift_start, sh.shift_end) OVERLAPS (p_shift_start, p_shift_end)
      ) THEN 'Already scheduled'
      WHEN EXISTS (
        SELECT 1 FROM shift_requests sr
        WHERE sr.staff_id = s.id
          AND sr.request_type = 'time_off'
          AND sr.status = 'approved'
          AND p_date BETWEEN sr.date_from AND sr.date_to
      ) THEN 'Time-off approved'
      ELSE NULL
    END AS unavailable_reason
  FROM staff s
  WHERE s.restaurant_id = p_restaurant_id
    AND s.status = 'active'
    AND (p_role_required IS NULL OR s.role = p_role_required)
    AND (p_department IS NULL OR s.department = p_department OR s.department = 'universal')
  ORDER BY is_available DESC, s.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_available_staff IS 'Returns available staff for a shift with conflict checking';

-- ============================================
-- 5. CALCULATE LABOR COST FOR SHIFT
-- ============================================
-- Calculates the labor cost for a shift including overtime rates

CREATE OR REPLACE FUNCTION calculate_shift_labor_cost(
  p_staff_id UUID,
  p_shift_start TIME,
  p_shift_end TIME,
  p_break_duration INTEGER DEFAULT 0,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  shift_hours DECIMAL,
  regular_hours DECIMAL,
  overtime_hours DECIMAL,
  hourly_rate DECIMAL,
  regular_cost DECIMAL,
  overtime_cost DECIMAL,
  total_cost DECIMAL
) AS $$
DECLARE
  v_shift_hours DECIMAL;
  v_hourly_rate DECIMAL;
  v_contract_hours DECIMAL;
  v_week_start DATE;
  v_week_hours DECIMAL;
  v_regular_hours DECIMAL;
  v_overtime_hours DECIMAL;
  v_regular_cost DECIMAL;
  v_overtime_cost DECIMAL;
  v_overtime_multiplier DECIMAL := 1.5;  -- 1.5x for overtime
BEGIN
  -- Get staff hourly rate and contract hours
  SELECT COALESCE(s.hourly_rate, 0), COALESCE(s.contract_hours, 40.00)
  INTO v_hourly_rate, v_contract_hours
  FROM staff s
  WHERE s.id = p_staff_id;

  -- Calculate shift hours
  v_shift_hours := calculate_shift_hours(p_shift_start, p_shift_end, p_break_duration);

  -- Get week start (Monday)
  v_week_start := date_trunc('week', p_date)::DATE;

  -- Calculate hours already worked this week
  SELECT COALESCE(SUM(calculate_shift_hours(shift_start, shift_end, break_duration)), 0)
  INTO v_week_hours
  FROM shifts
  WHERE staff_id = p_staff_id
    AND date >= v_week_start
    AND date < p_date
    AND status IN ('published', 'completed');

  -- Determine regular vs overtime hours for this shift
  IF v_week_hours >= v_contract_hours THEN
    -- All hours are overtime
    v_regular_hours := 0;
    v_overtime_hours := v_shift_hours;
  ELSIF v_week_hours + v_shift_hours > v_contract_hours THEN
    -- Some regular, some overtime
    v_regular_hours := v_contract_hours - v_week_hours;
    v_overtime_hours := v_shift_hours - v_regular_hours;
  ELSE
    -- All regular hours
    v_regular_hours := v_shift_hours;
    v_overtime_hours := 0;
  END IF;

  -- Calculate costs
  v_regular_cost := v_regular_hours * v_hourly_rate;
  v_overtime_cost := v_overtime_hours * v_hourly_rate * v_overtime_multiplier;

  RETURN QUERY SELECT
    v_shift_hours,
    v_regular_hours,
    v_overtime_hours,
    v_hourly_rate,
    v_regular_cost,
    v_overtime_cost,
    v_regular_cost + v_overtime_cost;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_shift_labor_cost IS 'Calculates labor cost for a shift with overtime at 1.5x rate';

-- ============================================
-- 6. UPDATE LABOR COST SUMMARY (TRIGGER FUNCTION)
-- ============================================
-- Automatically updates daily labor cost summary when shifts are completed

CREATE OR REPLACE FUNCTION update_labor_cost_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_cost_data RECORD;
BEGIN
  -- Only update when shift is completed
  IF NEW.status = 'completed' AND (TG_OP = 'INSERT' OR OLD.status != 'completed') THEN
    -- Calculate cost for this shift
    SELECT * INTO v_cost_data
    FROM calculate_shift_labor_cost(
      NEW.staff_id,
      NEW.shift_start,
      NEW.shift_end,
      NEW.break_duration,
      NEW.date
    );

    -- Insert or update summary record
    INSERT INTO labor_cost_summary (
      restaurant_id,
      date,
      department,
      total_hours,
      regular_hours,
      overtime_hours,
      total_cost,
      overtime_cost,
      shifts_completed
    )
    VALUES (
      NEW.restaurant_id,
      NEW.date,
      NEW.department,
      v_cost_data.shift_hours,
      v_cost_data.regular_hours,
      v_cost_data.overtime_hours,
      v_cost_data.total_cost,
      v_cost_data.overtime_cost,
      1
    )
    ON CONFLICT (restaurant_id, date, department)
    DO UPDATE SET
      total_hours = labor_cost_summary.total_hours + v_cost_data.shift_hours,
      regular_hours = labor_cost_summary.regular_hours + v_cost_data.regular_hours,
      overtime_hours = labor_cost_summary.overtime_hours + v_cost_data.overtime_hours,
      total_cost = labor_cost_summary.total_cost + v_cost_data.total_cost,
      overtime_cost = labor_cost_summary.overtime_cost + v_cost_data.overtime_cost,
      shifts_completed = labor_cost_summary.shifts_completed + 1,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic labor cost updates
DROP TRIGGER IF EXISTS trigger_update_labor_cost ON shifts;
CREATE TRIGGER trigger_update_labor_cost
  AFTER INSERT OR UPDATE OF status ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_labor_cost_summary();

COMMENT ON FUNCTION update_labor_cost_summary IS 'Trigger function to automatically update labor cost summary when shifts complete';

-- ============================================
-- 7. GET SHIFT COVERAGE ANALYSIS
-- ============================================
-- Analyzes shift coverage for a date range

CREATE OR REPLACE FUNCTION get_shift_coverage(
  p_restaurant_id UUID,
  p_date_from DATE,
  p_date_to DATE
)
RETURNS TABLE(
  date DATE,
  total_shifts INTEGER,
  filled_shifts INTEGER,
  unfilled_shifts INTEGER,
  coverage_percentage DECIMAL,
  departments JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH shift_stats AS (
    SELECT
      s.date,
      s.department,
      COUNT(*) as total,
      COUNT(s.staff_id) as filled,
      COUNT(*) - COUNT(s.staff_id) as unfilled
    FROM shifts s
    WHERE s.restaurant_id = p_restaurant_id
      AND s.date BETWEEN p_date_from AND p_date_to
      AND s.status IN ('published', 'draft')
    GROUP BY s.date, s.department
  )
  SELECT
    d.date,
    COALESCE(SUM(ss.total)::INTEGER, 0) as total_shifts,
    COALESCE(SUM(ss.filled)::INTEGER, 0) as filled_shifts,
    COALESCE(SUM(ss.unfilled)::INTEGER, 0) as unfilled_shifts,
    CASE
      WHEN SUM(ss.total) > 0 THEN ROUND((SUM(ss.filled)::DECIMAL / SUM(ss.total) * 100), 1)
      ELSE 0
    END as coverage_percentage,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'department', ss.department,
          'total', ss.total,
          'filled', ss.filled,
          'unfilled', ss.unfilled
        )
      ) FILTER (WHERE ss.department IS NOT NULL),
      '[]'::JSONB
    ) as departments
  FROM generate_series(p_date_from, p_date_to, '1 day'::INTERVAL) d(date)
  LEFT JOIN shift_stats ss ON ss.date = d.date
  GROUP BY d.date
  ORDER BY d.date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_shift_coverage IS 'Analyzes shift coverage and staffing levels for a date range';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Staff Rota & Scheduling helper functions created successfully!';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '- check_shift_conflicts(): Validates shift assignments and rest periods';
  RAISE NOTICE '- calculate_shift_hours(): Calculates worked hours minus breaks';
  RAISE NOTICE '- calculate_overtime(): Weekly overtime calculations';
  RAISE NOTICE '- get_available_staff(): Finds available staff for shifts';
  RAISE NOTICE '- calculate_shift_labor_cost(): Cost calculations with overtime';
  RAISE NOTICE '- update_labor_cost_summary(): Auto-updates cost tracking (trigger)';
  RAISE NOTICE '- get_shift_coverage(): Coverage analysis for date ranges';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Phase 1 (Database Foundation) is now COMPLETE!';
  RAISE NOTICE 'Next: Phase 2 - Create API routes for shifts, requests, attendance, templates, and analytics';
END $$;
