-- Floor Plan Tables Migration
-- Creates tables for managing restaurant floor plans with multiple floors and decorative elements

-- Create floors table
CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  width INTEGER DEFAULT 1200,
  height INTEGER DEFAULT 800,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, level)
);

-- Create floor_elements table for decorative elements (walls, doors, etc.)
CREATE TABLE IF NOT EXISTS floor_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  element_type TEXT NOT NULL,
  x_position INTEGER NOT NULL DEFAULT 0,
  y_position INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 100,
  height INTEGER NOT NULL DEFAULT 100,
  rotation INTEGER DEFAULT 0,
  color TEXT DEFAULT '#e2e8f0',
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add floor_id to tables table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'floor_id'
  ) THEN
    ALTER TABLE tables ADD COLUMN floor_id UUID REFERENCES floors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add position and dimension columns to tables if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'x_position'
  ) THEN
    ALTER TABLE tables ADD COLUMN x_position INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'y_position'
  ) THEN
    ALTER TABLE tables ADD COLUMN y_position INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'width'
  ) THEN
    ALTER TABLE tables ADD COLUMN width INTEGER DEFAULT 80;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'height'
  ) THEN
    ALTER TABLE tables ADD COLUMN height INTEGER DEFAULT 80;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name = 'shape'
  ) THEN
    ALTER TABLE tables ADD COLUMN shape TEXT DEFAULT 'square';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_floors_restaurant_id ON floors(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_floor_elements_floor_id ON floor_elements(floor_id);
CREATE INDEX IF NOT EXISTS idx_tables_floor_id ON tables(floor_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_floors_updated_at ON floors;
CREATE TRIGGER update_floors_updated_at
    BEFORE UPDATE ON floors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_floor_elements_updated_at ON floor_elements;
CREATE TRIGGER update_floor_elements_updated_at
    BEFORE UPDATE ON floor_elements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE floors IS 'Stores different floor levels for restaurant floor plans';
COMMENT ON TABLE floor_elements IS 'Stores decorative elements like walls, doors, windows for floor plans';
COMMENT ON COLUMN tables.floor_id IS 'Reference to which floor this table belongs to';
COMMENT ON COLUMN tables.x_position IS 'X coordinate position on the floor plan canvas';
COMMENT ON COLUMN tables.y_position IS 'Y coordinate position on the floor plan canvas';
COMMENT ON COLUMN tables.shape IS 'Visual shape of the table: square, circle, or rectangle';
