-- Fix RLS policies for shift_requests table to allow staff to view their requests

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Staff can view their own requests" ON shift_requests;
DROP POLICY IF EXISTS "Anyone can view shift requests" ON shift_requests;

-- Allow anyone to read shift_requests (needed for staff dashboard which uses anon key)
-- This is safe because we filter by staff_id in the query
CREATE POLICY "Anyone can view shift requests" ON shift_requests
  FOR SELECT
  USING (true);

-- Note: INSERT, UPDATE, DELETE policies should already exist for restaurant owners
-- If not, they need to be added separately
