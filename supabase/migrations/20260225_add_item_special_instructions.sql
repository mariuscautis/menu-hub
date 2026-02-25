-- Add special_instructions support to menu items and orders
--
-- This migration adds:
-- 1. requires_special_instructions (boolean) to menu_items - allows restaurant managers
--    to mark items that need customer input (e.g., steak cooking preference)
-- 2. special_instructions_label (text) to menu_items - optional custom label for the input
--    (e.g., "How would you like it cooked?" instead of default "Special instructions")
-- 3. special_instructions (text) to order_items - stores the customer's input per item
--
-- Run this migration in your Supabase SQL editor or via the CLI:
--   supabase db push

-- Add requires_special_instructions column to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS requires_special_instructions BOOLEAN DEFAULT FALSE;

-- Add custom label for the special instructions input
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS special_instructions_label TEXT;

-- Add special_instructions column to order_items for storing customer input
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Create index for efficient filtering of items that require instructions
CREATE INDEX IF NOT EXISTS idx_menu_items_requires_instructions
  ON menu_items (restaurant_id, requires_special_instructions)
  WHERE requires_special_instructions = TRUE;
