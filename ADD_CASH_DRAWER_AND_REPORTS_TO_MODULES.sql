-- Ensure all restaurants with an enabled_modules object have reports and cash_drawer set to true
-- Restaurants with enabled_modules = NULL are already handled by the app (all modules enabled)
-- This only patches rows where the JSONB column exists but is missing these keys

UPDATE restaurants
SET enabled_modules = enabled_modules || '{"reports": true, "cash_drawer": true}'::jsonb
WHERE enabled_modules IS NOT NULL;
