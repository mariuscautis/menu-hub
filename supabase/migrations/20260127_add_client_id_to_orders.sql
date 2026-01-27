-- Add client_id column to orders table for offline order deduplication.
--
-- When orders are created offline, they are assigned a client-side UUID (client_id).
-- When the device comes back online, the sync process uses this client_id to avoid
-- inserting duplicate orders (e.g., if sync fires twice or the user retries manually).
--
-- Run this migration in your Supabase SQL editor or via the CLI:
--   supabase db push

-- Add the column (nullable so existing orders aren't affected)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_id UUID;

-- Create a unique index for deduplication lookups
-- (partial index: only index non-null values since old orders won't have one)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_client_id
  ON orders (client_id)
  WHERE client_id IS NOT NULL;

-- Allow the anon role to read/filter by client_id (for dedup checks during sync)
-- This should already be covered by existing RLS policies on the orders table,
-- but if you have column-level security, grant access:
-- GRANT SELECT (client_id) ON orders TO anon;
-- GRANT INSERT (client_id) ON orders TO anon;
