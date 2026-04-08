-- VenoApp Bridge pairing code
-- 8-character alphanumeric (A-Z, 0-9 excluding ambiguous chars: 0, O, 1, I, L)
-- Unique constraint enforced at DB level — absolute guarantee, no duplicates possible

-- Character set: 32 chars → 32^8 ≈ 1 trillion combinations
-- Format displayed to user: XXXX-XXXX

CREATE OR REPLACE FUNCTION generate_bridge_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code TEXT;
  done BOOLEAN := FALSE;
BEGIN
  WHILE NOT done LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Only accept if not already taken
    IF NOT EXISTS (SELECT 1 FROM restaurants WHERE bridge_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Add column, generate unique codes for all existing restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS bridge_code TEXT;

UPDATE restaurants
SET bridge_code = generate_bridge_code()
WHERE bridge_code IS NULL;

-- Now enforce uniqueness and not-null going forward
ALTER TABLE restaurants
  ALTER COLUMN bridge_code SET NOT NULL,
  ADD CONSTRAINT restaurants_bridge_code_unique UNIQUE (bridge_code);

-- Trigger: auto-assign a bridge_code on new restaurant insert
CREATE OR REPLACE FUNCTION assign_bridge_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.bridge_code IS NULL THEN
    NEW.bridge_code := generate_bridge_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_bridge_code ON restaurants;
CREATE TRIGGER trg_assign_bridge_code
  BEFORE INSERT ON restaurants
  FOR EACH ROW EXECUTE FUNCTION assign_bridge_code();

-- RPC function: Bridge calls this with the code to get restaurant_id + settings
-- Returns only what the Bridge needs — no sensitive data exposed
CREATE OR REPLACE FUNCTION get_restaurant_by_bridge_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  r restaurants%ROWTYPE;
BEGIN
  SELECT * INTO r
  FROM restaurants
  WHERE bridge_code = upper(replace(p_code, '-', ''));

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Invalid bridge code');
  END IF;

  RETURN json_build_object(
    'restaurant_id', r.id,
    'name',          r.name,
    'bridge_code',   r.bridge_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
