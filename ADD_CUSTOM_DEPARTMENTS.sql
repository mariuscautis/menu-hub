-- Add custom departments column to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '["kitchen", "bar", "universal"]'::jsonb;

COMMENT ON COLUMN restaurants.departments IS 'Custom department list for this restaurant. Each restaurant can define their own departments (e.g., kitchen, bar, cleaning, delivery).';

-- Update existing restaurants to have the default departments
UPDATE restaurants
SET departments = '["kitchen", "bar", "universal"]'::jsonb
WHERE departments IS NULL;

-- Remove CHECK constraints on department fields to allow custom values
-- For staff table
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_department_check;

-- For shifts table
ALTER TABLE shifts DROP CONSTRAINT IF EXISTS shifts_department_check;

-- Add a more flexible constraint that just ensures department is not empty if provided
ALTER TABLE staff
ADD CONSTRAINT staff_department_not_empty
CHECK (department IS NULL OR length(trim(department)) > 0);

ALTER TABLE shifts
ADD CONSTRAINT shifts_department_not_empty
CHECK (department IS NULL OR length(trim(department)) > 0);
