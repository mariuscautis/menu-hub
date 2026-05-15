-- Create register_interest table to store early access registrations
CREATE TABLE IF NOT EXISTS register_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  venue_type TEXT NOT NULL,
  venue_type_other TEXT,
  country TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | contacted | registered | dismissed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ordering and filtering
CREATE INDEX IF NOT EXISTS register_interest_created_at_idx ON register_interest (created_at DESC);
CREATE INDEX IF NOT EXISTS register_interest_status_idx ON register_interest (status);

-- RLS: only service role can read/write (admin API uses service role key)
ALTER TABLE register_interest ENABLE ROW LEVEL SECURITY;
