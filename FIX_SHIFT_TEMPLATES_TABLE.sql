-- Drop the old shift_templates table structure
DROP TABLE IF EXISTS shift_templates CASCADE;

-- Recreate with the correct structure for storing multiple shifts in JSONB
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  shifts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_template_name UNIQUE(restaurant_id, name)
);

CREATE INDEX idx_shift_templates_restaurant ON shift_templates(restaurant_id);
CREATE INDEX idx_shift_templates_shifts ON shift_templates USING GIN (shifts);

COMMENT ON TABLE shift_templates IS 'Reusable shift templates for quick scheduling';
COMMENT ON COLUMN shift_templates.shifts IS 'Array of shift objects with day_of_week, shift_start, shift_end, role_required, department, break_duration';

-- Example of shifts JSONB structure:
-- [
--   {
--     "day_of_week": "monday",
--     "shift_start": "09:00",
--     "shift_end": "17:00",
--     "role_required": "Server",
--     "department": "kitchen",
--     "break_duration": 30
--   },
--   {
--     "day_of_week": "tuesday",
--     "shift_start": "09:00",
--     "shift_end": "17:00",
--     "role_required": "Chef",
--     "department": "kitchen",
--     "break_duration": 30
--   }
-- ]
