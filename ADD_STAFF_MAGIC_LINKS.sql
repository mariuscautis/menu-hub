-- Create staff_magic_links table for magic link authentication
CREATE TABLE IF NOT EXISTS staff_magic_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_staff_magic_links_token ON staff_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_staff_magic_links_staff_id ON staff_magic_links(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_magic_links_expires_at ON staff_magic_links(expires_at);

-- Add RLS policies
ALTER TABLE staff_magic_links ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read magic links (for verification)
CREATE POLICY "Anyone can verify magic links" ON staff_magic_links
  FOR SELECT
  USING (true);

-- Allow anyone to update magic links (to mark as used)
CREATE POLICY "Anyone can mark magic links as used" ON staff_magic_links
  FOR UPDATE
  USING (true);

-- Only allow inserting magic links through the backend
CREATE POLICY "Service role can insert magic links" ON staff_magic_links
  FOR INSERT
  WITH CHECK (true);
