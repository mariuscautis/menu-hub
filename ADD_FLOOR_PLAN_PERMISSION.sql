-- =============================================
-- Add Floor Plan Permission to Departments
-- =============================================
-- This allows restaurant managers to grant specific departments
-- access to view the floor plan and place orders from it

-- Add floor_plan permission to department_permissions table
-- This permission allows staff to view the floor plan and place orders from tables
ALTER TABLE public.department_permissions
  ADD COLUMN IF NOT EXISTS floor_plan BOOLEAN DEFAULT false;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Floor plan permission added to departments!';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage:';
  RAISE NOTICE '1. Go to Departments & Permissions in the dashboard';
  RAISE NOTICE '2. Enable "Floor Plan" permission for departments that need table access';
  RAISE NOTICE '3. Staff members in those departments can now view the floor plan';
  RAISE NOTICE '4. Staff can tap tables to view orders or place new orders';
  RAISE NOTICE '';
  RAISE NOTICE 'Note: Only restaurant owners/managers can edit the floor plan layout';
END $$;
