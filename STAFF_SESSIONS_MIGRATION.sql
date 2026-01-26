-- Staff Sessions Migration
-- This creates the staff_sessions table for tracking device logins and enabling remote session management

-- Create the staff_sessions table
CREATE TABLE IF NOT EXISTS staff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE, -- NULL for owner sessions
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- For owner sessions
  session_token VARCHAR(64) NOT NULL UNIQUE,
  device_id VARCHAR(64) NOT NULL,
  device_name VARCHAR(255), -- e.g., "Chrome on macOS", "Safari on iOS"
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  is_blocked BOOLEAN DEFAULT FALSE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_staff_sessions_restaurant_id ON staff_sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_staff_id ON staff_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_user_id ON staff_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_session_token ON staff_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_device_id ON staff_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_is_blocked ON staff_sessions(is_blocked);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires_at ON staff_sessions(expires_at);

-- Enable Row Level Security
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Restaurant owners can view and manage all sessions for their restaurant
CREATE POLICY "Restaurant owners can manage sessions" ON staff_sessions
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
    )
  );

-- Policy: Staff can view their own sessions
CREATE POLICY "Staff can view own sessions" ON staff_sessions
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Policy: Allow anonymous inserts for session creation during login (service role will handle this)
-- Note: In production, session creation should go through the API with service role key

-- Function to clean up expired sessions (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM staff_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for the staff_sessions table (for live updates in the dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE staff_sessions;

-- Comment on table
COMMENT ON TABLE staff_sessions IS 'Tracks active device sessions for staff and owner logins, enabling remote session management';
COMMENT ON COLUMN staff_sessions.session_token IS 'Unique token stored in localStorage to identify the session';
COMMENT ON COLUMN staff_sessions.device_id IS 'Unique device identifier (fingerprint or UUID stored in localStorage)';
COMMENT ON COLUMN staff_sessions.is_blocked IS 'When true, the session is blocked and the user will be logged out';
