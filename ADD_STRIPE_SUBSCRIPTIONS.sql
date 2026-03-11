-- Add Stripe subscription columns to restaurants table
-- Run this in the Supabase SQL editor

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id       TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status   TEXT DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS subscription_plans    TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS current_period_end    TIMESTAMPTZ;
