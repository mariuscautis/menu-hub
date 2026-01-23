-- Migration: Add email_language and address columns to restaurants table
-- Run this in Supabase SQL Editor if the columns don't exist yet

-- Add email_language column to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS email_language TEXT DEFAULT 'en';

-- Add address column to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add a check constraint to ensure only valid language codes
-- First, drop the constraint if it exists to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'email_language_check'
  ) THEN
    ALTER TABLE restaurants
    ADD CONSTRAINT email_language_check
    CHECK (email_language IN ('en', 'ro', 'es', 'fr', 'it'));
  END IF;
END $$;

-- Add comments explaining the columns
COMMENT ON COLUMN restaurants.email_language IS 'Language code for customer emails (en, ro, es, fr, it). Defaults to English.';
COMMENT ON COLUMN restaurants.address IS 'Physical address of the restaurant, displayed to customers.';

-- Optional: Set existing restaurants to 'en' if they don't have a value
UPDATE restaurants
SET email_language = 'en'
WHERE email_language IS NULL;
