-- =============================================
-- Fix approved_by Foreign Key Constraint
-- =============================================
-- The approved_by field stores auth user IDs (restaurant owners)
-- but the foreign key constraint expects staff IDs
-- This causes errors when owners try to approve requests

-- Drop the foreign key constraint on approved_by
ALTER TABLE shift_requests
DROP CONSTRAINT IF EXISTS shift_requests_approved_by_fkey;

-- Make approved_by just a UUID field without foreign key
-- (it stores the auth user ID of the approver, which might be owner or manager)
ALTER TABLE shift_requests
ALTER COLUMN approved_by TYPE UUID USING approved_by::UUID;

-- Add a comment to document what this field contains
COMMENT ON COLUMN shift_requests.approved_by IS 'Auth user ID of the person who approved/rejected this request (from auth.users, not staff table)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed approved_by constraint!';
  RAISE NOTICE 'The approved_by field now accepts any auth user ID without foreign key constraint.';
END $$;
