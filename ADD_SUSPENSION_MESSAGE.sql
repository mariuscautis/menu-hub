-- Add suspension_message column to restaurants table
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS suspension_message text;
