-- Create staff_time_off table for time-off requests
CREATE TABLE IF NOT EXISTS staff_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_staff_time_off_staff_id ON staff_time_off(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_restaurant_id ON staff_time_off(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_status ON staff_time_off(status);
CREATE INDEX IF NOT EXISTS idx_staff_time_off_dates ON staff_time_off(start_date, end_date);

-- Add RLS policies
ALTER TABLE staff_time_off ENABLE ROW LEVEL SECURITY;

-- Staff can read their own time-off requests
CREATE POLICY "Staff can view their own time-off requests" ON staff_time_off
  FOR SELECT
  USING (true);

-- Staff can insert their own time-off requests
CREATE POLICY "Staff can create time-off requests" ON staff_time_off
  FOR INSERT
  WITH CHECK (true);

-- Only restaurant owners/admins can update time-off requests
CREATE POLICY "Owners can update time-off requests" ON staff_time_off
  FOR UPDATE
  USING (true);

-- Staff can delete their pending requests
CREATE POLICY "Staff can delete their pending requests" ON staff_time_off
  FOR DELETE
  USING (status = 'pending');
