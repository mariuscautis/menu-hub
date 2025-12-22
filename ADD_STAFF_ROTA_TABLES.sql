-- ============================================
-- STAFF ROTA & SCHEDULING SYSTEM - DATABASE SCHEMA
-- ============================================
-- This migration creates all tables needed for staff scheduling

-- 1. EXTEND EXISTING STAFF TABLE
-- Add fields for contract hours, pay rate, and preferences
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS contract_hours DECIMAL(5,2) DEFAULT 40.00 CHECK (contract_hours >= 0 AND contract_hours <= 168),
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8,2) CHECK (hourly_rate >= 0),
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN staff.contract_hours IS 'Contracted weekly hours (used for overtime calculation)';
COMMENT ON COLUMN staff.hourly_rate IS 'Hourly pay rate in restaurant currency';
COMMENT ON COLUMN staff.preferences IS 'JSON object storing shift preferences, work days, etc.';
COMMENT ON COLUMN staff.availability IS 'JSON object with weekly availability pattern and exceptions';

-- 2. SHIFTS TABLE
-- Core table for all scheduled shifts
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,

  -- Timing
  date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  break_duration INTEGER DEFAULT 30 CHECK (break_duration >= 0 AND break_duration <= 180),

  -- Classification
  role_required VARCHAR(50) NOT NULL,
  department VARCHAR(20) CHECK (department IN ('kitchen', 'bar', 'universal')),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed', 'cancelled')),

  -- Additional info
  notes TEXT,

  -- Template support
  is_template BOOLEAN DEFAULT FALSE,
  template_name VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_shift_times CHECK (shift_end > shift_start)
);

CREATE INDEX idx_shifts_restaurant_date ON shifts(restaurant_id, date);
CREATE INDEX idx_shifts_staff_date ON shifts(staff_id, date);
CREATE INDEX idx_shifts_status ON shifts(restaurant_id, status);
CREATE INDEX idx_shifts_department ON shifts(restaurant_id, department);

COMMENT ON TABLE shifts IS 'Staff shift scheduling with assignments';
COMMENT ON COLUMN shifts.status IS 'draft=not published, published=visible to staff, completed=shift finished, cancelled=shift cancelled';
COMMENT ON COLUMN shifts.break_duration IS 'Unpaid break duration in minutes';

-- 3. SHIFT REQUESTS TABLE
-- Time-off, shift swaps, and cover requests
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  -- Request type and status
  request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('time_off', 'swap', 'cover')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  -- For time-off requests
  date_from DATE,
  date_to DATE,
  reason TEXT,

  -- For shift swaps
  shift_id UUID REFERENCES shifts(id) ON DELETE CASCADE,
  swap_with_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  swap_shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL,

  -- Approval workflow
  approved_by UUID REFERENCES staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (date_to IS NULL OR date_to >= date_from)
);

CREATE INDEX idx_shift_requests_restaurant ON shift_requests(restaurant_id, status);
CREATE INDEX idx_shift_requests_staff ON shift_requests(staff_id, status);
CREATE INDEX idx_shift_requests_type ON shift_requests(restaurant_id, request_type, status);

COMMENT ON TABLE shift_requests IS 'Staff requests for time-off, shift swaps, and cover';
COMMENT ON COLUMN shift_requests.request_type IS 'time_off=holiday request, swap=exchange shifts with colleague, cover=request someone cover their shift';

-- 4. ATTENDANCE TABLE
-- Clock-in/out tracking and attendance records
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,

  -- Scheduled times (from shift)
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,

  -- Actual times
  clock_in TIMESTAMP,
  clock_out TIMESTAMP,

  -- Break tracking
  break_start TIMESTAMP,
  break_end TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'present', 'late', 'absent', 'early_leave')),

  -- Additional info
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_clock_times CHECK (clock_out IS NULL OR clock_out > clock_in),
  CONSTRAINT valid_break_times CHECK (break_end IS NULL OR break_end > break_start)
);

CREATE INDEX idx_attendance_restaurant ON attendance(restaurant_id);
CREATE INDEX idx_attendance_staff_date ON attendance(staff_id, clock_in);
CREATE INDEX idx_attendance_shift ON attendance(shift_id);
CREATE INDEX idx_attendance_status ON attendance(restaurant_id, status);

COMMENT ON TABLE attendance IS 'Clock-in/out tracking and attendance records';
COMMENT ON COLUMN attendance.status IS 'scheduled=not started, present=clocked in on time, late=clocked in late, absent=no show, early_leave=left early';

-- 5. SHIFT TEMPLATES TABLE
-- Reusable shift templates for quick scheduling
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Template info
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Schedule pattern
  day_of_week INTEGER CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)),
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  break_duration INTEGER DEFAULT 30,

  -- Shift details
  role_required VARCHAR(50) NOT NULL,
  department VARCHAR(20),
  staff_count INTEGER DEFAULT 1 CHECK (staff_count > 0),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_template_times CHECK (shift_end > shift_start)
);

CREATE INDEX idx_shift_templates_restaurant ON shift_templates(restaurant_id);
CREATE INDEX idx_shift_templates_day ON shift_templates(restaurant_id, day_of_week);

COMMENT ON TABLE shift_templates IS 'Reusable shift templates for quick scheduling';
COMMENT ON COLUMN shift_templates.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday, NULL=any day';
COMMENT ON COLUMN shift_templates.staff_count IS 'Number of staff needed for this shift';

-- 6. LABOR COST TRACKING TABLE (for analytics)
CREATE TABLE IF NOT EXISTS labor_cost_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,

  -- Period
  date DATE NOT NULL,
  department VARCHAR(20),

  -- Metrics
  total_hours DECIMAL(8,2) DEFAULT 0,
  regular_hours DECIMAL(8,2) DEFAULT 0,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0,
  overtime_cost DECIMAL(10,2) DEFAULT 0,

  -- Coverage
  shifts_scheduled INTEGER DEFAULT 0,
  shifts_filled INTEGER DEFAULT 0,
  shifts_completed INTEGER DEFAULT 0,

  -- Attendance
  staff_late INTEGER DEFAULT 0,
  staff_absent INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(restaurant_id, date, department)
);

CREATE INDEX idx_labor_cost_restaurant_date ON labor_cost_summary(restaurant_id, date);

COMMENT ON TABLE labor_cost_summary IS 'Daily labor cost and metrics summary for analytics';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Staff Rota & Scheduling tables created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run ADD_STAFF_ROTA_RLS.sql for Row Level Security policies';
  RAISE NOTICE '2. Run ADD_STAFF_ROTA_FUNCTIONS.sql for helper functions';
END $$;
