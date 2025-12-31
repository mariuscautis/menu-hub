-- Add RLS policies for staff members to access split bills
-- This allows both restaurant owners AND staff to create and manage split bills

-- Drop existing policies and recreate with staff access
DROP POLICY IF EXISTS "Restaurant owners can view their split bills" ON split_bills;
DROP POLICY IF EXISTS "Restaurant owners can insert split bills" ON split_bills;
DROP POLICY IF EXISTS "Restaurant owners can update their split bills" ON split_bills;
DROP POLICY IF EXISTS "Restaurant owners can delete their split bills" ON split_bills;

DROP POLICY IF EXISTS "Restaurant owners can view their split bill items" ON split_bill_items;
DROP POLICY IF EXISTS "Restaurant owners can insert split bill items" ON split_bill_items;
DROP POLICY IF EXISTS "Restaurant owners can update their split bill items" ON split_bill_items;
DROP POLICY IF EXISTS "Restaurant owners can delete their split bill items" ON split_bill_items;

-- RLS Policies for split_bills (allows both owners and staff)
CREATE POLICY "Owners and staff can view split bills"
  ON split_bills FOR SELECT
  USING (
    restaurant_id IN (
      -- Restaurant owners
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      -- Staff members (by user_id)
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
      UNION
      -- Staff members (by staff.id for PIN logins)
      SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners and staff can insert split bills"
  ON split_bills FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      -- Restaurant owners
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      -- Staff members (by user_id)
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
      UNION
      -- Staff members (by staff.id for PIN logins)
      SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners and staff can update split bills"
  ON split_bills FOR UPDATE
  USING (
    restaurant_id IN (
      -- Restaurant owners
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      -- Staff members (by user_id)
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
      UNION
      -- Staff members (by staff.id for PIN logins)
      SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Owners and staff can delete split bills"
  ON split_bills FOR DELETE
  USING (
    restaurant_id IN (
      -- Restaurant owners
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
      UNION
      -- Staff members (by user_id)
      SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
      UNION
      -- Staff members (by staff.id for PIN logins)
      SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for split_bill_items (allows both owners and staff)
CREATE POLICY "Owners and staff can view split bill items"
  ON split_bill_items FOR SELECT
  USING (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        -- Restaurant owners
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
        UNION
        -- Staff members (by user_id)
        SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        UNION
        -- Staff members (by staff.id for PIN logins)
        SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Owners and staff can insert split bill items"
  ON split_bill_items FOR INSERT
  WITH CHECK (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        -- Restaurant owners
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
        UNION
        -- Staff members (by user_id)
        SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        UNION
        -- Staff members (by staff.id for PIN logins)
        SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Owners and staff can update split bill items"
  ON split_bill_items FOR UPDATE
  USING (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        -- Restaurant owners
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
        UNION
        -- Staff members (by user_id)
        SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        UNION
        -- Staff members (by staff.id for PIN logins)
        SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Owners and staff can delete split bill items"
  ON split_bill_items FOR DELETE
  USING (
    split_bill_id IN (
      SELECT id FROM split_bills WHERE restaurant_id IN (
        -- Restaurant owners
        SELECT id FROM restaurants WHERE owner_id = auth.uid()
        UNION
        -- Staff members (by user_id)
        SELECT restaurant_id FROM staff WHERE user_id = auth.uid() AND status = 'active'
        UNION
        -- Staff members (by staff.id for PIN logins)
        SELECT restaurant_id FROM staff WHERE id = auth.uid() AND status = 'active'
      )
    )
  );
