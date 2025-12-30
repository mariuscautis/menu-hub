-- Add columns for tracking reservation denials/cancellations
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS denied_reason TEXT,
ADD COLUMN IF NOT EXISTS denied_by_staff_name TEXT,
ADD COLUMN IF NOT EXISTS denied_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS denied_at TIMESTAMPTZ;

-- Add comments to explain the columns
COMMENT ON COLUMN reservations.denied_reason IS 'Reason provided when the reservation was denied or cancelled';
COMMENT ON COLUMN reservations.denied_by_staff_name IS 'Name of the staff member who denied/cancelled the reservation';
COMMENT ON COLUMN reservations.denied_by_user_id IS 'User ID of the staff member who denied/cancelled (if auth-based login)';
COMMENT ON COLUMN reservations.denied_at IS 'Timestamp when the reservation was denied or cancelled';
