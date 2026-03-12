-- Soft-delete support for restaurants
-- Instead of hard-deleting, we mark records with deleted_at and keep them for recovery.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_reason text,
  ADD COLUMN IF NOT EXISTS recovery_requested_at timestamptz;
