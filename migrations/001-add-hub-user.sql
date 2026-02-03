-- Migration: Add Hub User Functionality
-- Description: Adds is_hub column to staff table to designate local hub coordinators
-- Date: 2024-02-03

-- Add is_hub column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_hub BOOLEAN DEFAULT FALSE;
COMMENT ON COLUMN staff.is_hub IS 'Designates this staff member as the local hub coordinator';

-- Create unique constraint: only one hub user per restaurant
CREATE UNIQUE INDEX IF NOT EXISTS one_hub_per_restaurant
ON staff (restaurant_id)
WHERE is_hub = true;

-- Verify the migration
SELECT
  'Migration complete!' as status,
  COUNT(*) as total_staff,
  COUNT(*) FILTER (WHERE is_hub = true) as hub_users
FROM staff;
