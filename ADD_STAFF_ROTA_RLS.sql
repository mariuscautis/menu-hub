-- ============================================
-- STAFF ROTA & SCHEDULING SYSTEM - RLS POLICIES
-- ============================================
-- This migration creates Row Level Security policies for staff scheduling tables
-- Follows existing pattern: owners and admin staff get full access, regular staff get limited access

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_cost_summary ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. SHIFTS TABLE POLICIES
-- ============================================

-- Policy: Owners and admin staff can manage all shifts
CREATE POLICY "Owners and admin staff can manage shifts"
  ON shifts FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shifts.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- Policy: Staff can view their own assigned shifts
CREATE POLICY "Staff can view their own shifts"
  ON shifts FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = shifts.staff_id
        AND s.user_id = auth.uid()
        AND s.status = 'active'
    )
  );

-- Policy: Staff can view all published shifts in their restaurant (for swaps/coverage)
CREATE POLICY "Staff can view published shifts in their restaurant"
  ON shifts FOR SELECT TO public
  USING (
    shifts.status = 'published' AND EXISTS (
      SELECT 1 FROM staff s
      WHERE s.restaurant_id = shifts.restaurant_id
        AND s.user_id = auth.uid()
        AND s.status = 'active'
    )
  );

-- ============================================
-- 3. SHIFT REQUESTS TABLE POLICIES
-- ============================================

-- Policy: Staff can create and view their own requests
CREATE POLICY "Staff can manage their own shift requests"
  ON shift_requests FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = shift_requests.staff_id
        AND s.user_id = auth.uid()
        AND s.status = 'active'
    )
  );

-- Policy: Owners and admin staff can view all requests
CREATE POLICY "Owners and admin staff can view all shift requests"
  ON shift_requests FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shift_requests.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- Policy: Owners and admin staff can approve/reject requests
CREATE POLICY "Owners and admin staff can manage shift requests"
  ON shift_requests FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shift_requests.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- Policy: Owners and admin staff can delete requests
CREATE POLICY "Owners and admin staff can delete shift requests"
  ON shift_requests FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shift_requests.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- ============================================
-- 4. ATTENDANCE TABLE POLICIES
-- ============================================

-- Policy: Staff can manage their own attendance (clock in/out)
CREATE POLICY "Staff can manage their own attendance"
  ON attendance FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.id = attendance.staff_id
        AND s.user_id = auth.uid()
        AND s.status = 'active'
    )
  );

-- Policy: Owners and admin staff can view all attendance
CREATE POLICY "Owners and admin staff can view all attendance"
  ON attendance FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = attendance.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- Policy: Owners and admin staff can manage attendance records
CREATE POLICY "Owners and admin staff can manage attendance"
  ON attendance FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = attendance.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- ============================================
-- 5. SHIFT TEMPLATES TABLE POLICIES
-- ============================================

-- Policy: Only owners and admin staff can manage templates
CREATE POLICY "Owners and admin staff can manage shift templates"
  ON shift_templates FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = shift_templates.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- ============================================
-- 6. LABOR COST SUMMARY TABLE POLICIES
-- ============================================

-- Policy: Only owners and admin staff can view analytics data
CREATE POLICY "Owners and admin staff can view labor cost summary"
  ON labor_cost_summary FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = labor_cost_summary.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- Policy: System can insert/update analytics data (for automated calculations)
CREATE POLICY "System can manage labor cost summary"
  ON labor_cost_summary FOR ALL TO public
  USING (
    EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = labor_cost_summary.restaurant_id
        AND (r.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.restaurant_id = r.id
            AND s.user_id = auth.uid()
            AND s.role = 'admin'
            AND s.status = 'active'
        ))
    )
  );

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Staff Rota & Scheduling RLS policies created successfully!';
  RAISE NOTICE 'Security rules:';
  RAISE NOTICE '- Owners and admin staff: Full access to all rota data';
  RAISE NOTICE '- Regular staff: Can view own shifts, manage own requests/attendance';
  RAISE NOTICE '- Staff can view published shifts (for swap/coverage purposes)';
  RAISE NOTICE 'Next step: Run ADD_STAFF_ROTA_FUNCTIONS.sql for helper functions';
END $$;
