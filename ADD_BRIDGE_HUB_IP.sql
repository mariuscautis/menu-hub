-- Add bridge_hub_ip column to restaurants table
-- The VenoApp Bridge pushes its LAN IP here on setup.
-- The PWA uses this IP to connect directly when venobridge.local mDNS fails
-- (e.g. on Windows or Android browsers that don't resolve .local hostnames).

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bridge_hub_ip TEXT;

-- RPC: called by the Bridge to register its LAN IP + WS token together
CREATE OR REPLACE FUNCTION set_bridge_connection(
  p_bridge_code TEXT,
  p_token       TEXT,
  p_hub_ip      TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE restaurants
  SET bridge_ws_token = p_token,
      bridge_hub_ip   = p_hub_ip
  WHERE bridge_code = upper(replace(p_bridge_code, '-', ''));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
