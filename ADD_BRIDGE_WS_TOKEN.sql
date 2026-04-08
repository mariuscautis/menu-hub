-- Add bridge_ws_token column to restaurants table
-- The VenoApp Bridge pushes its WebSocket auth token here on setup.
-- The PWA reads it to authenticate with the local Bridge WebSocket server.

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bridge_ws_token TEXT;

-- RPC: called by the Bridge to register its WS auth token
-- Only the bridge that owns this restaurant (verified via bridge_code) can update it.
CREATE OR REPLACE FUNCTION set_bridge_ws_token(p_bridge_code TEXT, p_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE restaurants
  SET bridge_ws_token = p_token
  WHERE bridge_code = upper(replace(p_bridge_code, '-', ''));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
