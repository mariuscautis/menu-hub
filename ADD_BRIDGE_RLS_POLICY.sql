-- Allow the Bridge app (using anon key) to update bridge_ws_token and bridge_hub_ip
-- on its own restaurant row, identified by bridge_code.
-- This is safe: the Bridge can only update the row matching its own code,
-- and only these two columns (enforced by the SECURITY DEFINER function).

-- Make sure the set_bridge_connection function exists and is correct:
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

-- Grant execute on the function to the anon role so the Bridge can call it
GRANT EXECUTE ON FUNCTION set_bridge_connection(TEXT, TEXT, TEXT) TO anon;
