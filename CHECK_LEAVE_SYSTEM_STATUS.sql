-- =============================================
-- Simple Status Check for Leave Management System
-- =============================================

-- Check 1: Does staff_leave_entitlements table exist?
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'staff_leave_entitlements') THEN
    RAISE NOTICE '✅ staff_leave_entitlements table EXISTS';
  ELSE
    RAISE NOTICE '❌ staff_leave_entitlements table MISSING - Need to run migration';
  END IF;
END $$;

-- Check 2: Do leave columns exist in shift_requests?
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'shift_requests'
  AND column_name IN ('leave_type', 'days_requested', 'medical_certificate_provided');

  IF col_count = 3 THEN
    RAISE NOTICE '✅ Leave columns in shift_requests EXIST';
  ELSE
    RAISE NOTICE '❌ Leave columns MISSING (found % of 3) - Need to run migration', col_count;
  END IF;
END $$;

-- Check 3: Do triggers exist?
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'shift_requests'
  AND trigger_name IN ('trigger_calculate_days_requested', 'trigger_update_leave_balances');

  IF trigger_count = 2 THEN
    RAISE NOTICE '✅ Both triggers EXIST';
  ELSE
    RAISE NOTICE '❌ Triggers MISSING (found % of 2) - Need to run migration', trigger_count;
  END IF;
END $$;

-- Check 4: Do functions exist?
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_name IN ('calculate_working_days', 'auto_calculate_days_requested', 'update_leave_balances');

  IF func_count = 3 THEN
    RAISE NOTICE '✅ All required functions EXIST';
  ELSE
    RAISE NOTICE '❌ Functions MISSING (found % of 3) - Need to run migration', func_count;
  END IF;
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'NEXT STEP: Run UPDATE_STAFF_LEAVE_MANAGEMENT.sql';
  RAISE NOTICE '================================================';
END $$;
