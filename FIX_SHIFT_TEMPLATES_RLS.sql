-- Enable RLS on shift_templates
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Owners can manage templates" ON shift_templates;
DROP POLICY IF EXISTS "Staff can view templates" ON shift_templates;

-- Policy: Owners can manage their restaurant's templates
CREATE POLICY "Owners can manage templates"
  ON shift_templates
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Policy: Staff can view templates for their restaurant
CREATE POLICY "Staff can view templates"
  ON shift_templates
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM staff WHERE id = auth.uid()
    )
  );
