-- =============================================
-- Diagnostic Queries for Leave Management System
-- =============================================
-- Run these queries to check the current state

-- 1. Check if staff_leave_entitlements table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'staff_leave_entitlements'
) AS table_exists;

-- 2. Check if leave columns exist in shift_requests
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shift_requests'
AND column_name IN ('leave_type', 'days_requested', 'medical_certificate_provided', 'return_to_work_completed', 'sick_leave_notes')
ORDER BY column_name;

-- 3. Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'shift_requests'
AND trigger_name IN ('trigger_calculate_days_requested', 'trigger_update_leave_balances');

-- 4. Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_working_days', 'auto_calculate_days_requested', 'update_leave_balances', 'reset_staff_leave_year', 'calculate_prorata_holidays')
ORDER BY routine_name;

-- 5. Check sample shift request to see current data structure
SELECT id, request_type, status, leave_type, days_requested, date_from, date_to
FROM shift_requests
ORDER BY created_at DESC
LIMIT 5;

-- 6. Check if staff_leave_entitlements has any records
SELECT COUNT(*) as entitlement_count
FROM staff_leave_entitlements;

-- 7. Check for any staff without entitlements
SELECT s.id, s.name, s.email, s.role
FROM staff s
LEFT JOIN staff_leave_entitlements e ON s.id = e.staff_id
WHERE s.status = 'active' AND e.id IS NULL
LIMIT 10;
