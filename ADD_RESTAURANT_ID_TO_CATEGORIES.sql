-- Add restaurant_id column to menu_categories table

-- Add the column if it doesn't exist
ALTER TABLE menu_categories
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);

-- Add sort_order column if it doesn't exist
ALTER TABLE menu_categories
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add description column if it doesn't exist
ALTER TABLE menu_categories
ADD COLUMN IF NOT EXISTS description TEXT;
