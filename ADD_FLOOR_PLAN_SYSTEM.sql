-- =============================================
-- Add Floor Plan System - Tables Layout Designer
-- =============================================
-- This migration adds support for:
-- - Multiple floors per restaurant
-- - Drag-and-drop table positioning
-- - Decorative elements (plants, walls, doors, etc.)
-- - Visual floor plan for waiters

-- =============================================
-- PART 1: Create Floors Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1, -- Floor number (1 = ground floor, 2 = first floor, etc.)
  width INTEGER NOT NULL DEFAULT 1200, -- Canvas width in pixels
  height INTEGER NOT NULL DEFAULT 800, -- Canvas height in pixels
  background_color VARCHAR(50) DEFAULT '#f8fafc', -- Default: slate-50
  background_image_url TEXT, -- Optional background image
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, level)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_floors_restaurant ON floors(restaurant_id);

-- Enable RLS
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;

-- Policies for floors
CREATE POLICY "Allow authenticated to view floors"
ON public.floors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow public to view floors"
ON public.floors FOR SELECT TO public USING (true);

CREATE POLICY "Allow owners to manage floors"
ON public.floors FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = floors.restaurant_id
    AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = floors.restaurant_id
    AND r.owner_id = auth.uid()
  )
);

-- =============================================
-- PART 2: Update Tables Table - Add Position Data
-- =============================================

-- Add floor plan positioning columns to tables
ALTER TABLE public.tables
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES floors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS x_position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS y_position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 80,
  ADD COLUMN IF NOT EXISTS shape VARCHAR(20) DEFAULT 'rectangle', -- 'rectangle', 'circle', 'square'
  ADD COLUMN IF NOT EXISTS rotation INTEGER DEFAULT 0; -- Rotation in degrees

-- Index for faster floor queries
CREATE INDEX IF NOT EXISTS idx_tables_floor ON tables(floor_id);

-- =============================================
-- PART 3: Create Decorative Elements Table
-- =============================================

CREATE TABLE IF NOT EXISTS public.floor_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  element_type VARCHAR(50) NOT NULL, -- 'wall', 'door', 'window', 'plant', 'counter', 'bar', 'stage', 'entrance', 'exit', 'stairs', 'restroom'
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  width INTEGER NOT NULL DEFAULT 100,
  height INTEGER NOT NULL DEFAULT 100,
  rotation INTEGER DEFAULT 0,
  color VARCHAR(50), -- Optional color override
  label TEXT, -- Optional label (e.g., "Main Entrance", "Kitchen Door")
  z_index INTEGER DEFAULT 0, -- Layering (tables are typically z-index 10)
  properties JSONB, -- Additional properties (e.g., {"isOpen": true} for doors)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster floor queries
CREATE INDEX IF NOT EXISTS idx_floor_elements_floor ON floor_elements(floor_id);

-- Enable RLS
ALTER TABLE public.floor_elements ENABLE ROW LEVEL SECURITY;

-- Policies for floor_elements
CREATE POLICY "Allow authenticated to view floor elements"
ON public.floor_elements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow public to view floor elements"
ON public.floor_elements FOR SELECT TO public USING (true);

CREATE POLICY "Allow owners to manage floor elements"
ON public.floor_elements FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM floors f
    JOIN restaurants r ON f.restaurant_id = r.id
    WHERE f.id = floor_elements.floor_id
    AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM floors f
    JOIN restaurants r ON f.restaurant_id = r.id
    WHERE f.id = floor_elements.floor_id
    AND r.owner_id = auth.uid()
  )
);

-- =============================================
-- PART 4: Create Default Floor for Existing Restaurants
-- =============================================

-- Create a default "Ground Floor" for each restaurant that has tables
INSERT INTO public.floors (restaurant_id, name, level)
SELECT DISTINCT r.id, 'Ground Floor', 1
FROM restaurants r
WHERE EXISTS (
  SELECT 1 FROM tables t WHERE t.restaurant_id = r.id
)
AND NOT EXISTS (
  SELECT 1 FROM floors f WHERE f.restaurant_id = r.id
);

-- Link existing tables to their restaurant's ground floor
WITH positioned_tables AS (
  SELECT
    t.id,
    f.id as floor_id,
    (ROW_NUMBER() OVER (PARTITION BY t.restaurant_id ORDER BY t.table_number) - 1) * 120 % 1000 as new_x,
    ((ROW_NUMBER() OVER (PARTITION BY t.restaurant_id ORDER BY t.table_number) - 1) / 8) * 120 as new_y
  FROM tables t
  JOIN floors f ON t.restaurant_id = f.restaurant_id
  WHERE f.level = 1 AND t.floor_id IS NULL
)
UPDATE public.tables
SET floor_id = pt.floor_id,
    x_position = pt.new_x,
    y_position = pt.new_y
FROM positioned_tables pt
WHERE tables.id = pt.id;

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Floor plan system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '1. floors table - Store multiple floors per restaurant';
  RAISE NOTICE '2. floor_elements table - Decorative elements (walls, plants, etc.)';
  RAISE NOTICE '3. Added position columns to tables (x, y, width, height, shape, rotation)';
  RAISE NOTICE '4. Created default ground floor for existing restaurants';
  RAISE NOTICE '5. Auto-positioned existing tables in a grid layout';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '- Access /dashboard/floor-plan to design your layout';
  RAISE NOTICE '- Drag and drop tables to match your real restaurant';
  RAISE NOTICE '- Add decorative elements for better visualization';
  RAISE NOTICE '- Create multiple floors if needed';
END $$;
