-- Printers table: one row per physical printer per restaurant
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- e.g. "Kitchen Printer", "Bar Printer"
  department TEXT NOT NULL,                  -- matches menu_items.department: 'kitchen', 'bar', etc.
  cloudprnt_url TEXT,                        -- the URL this printer is configured to poll (your endpoint)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Print jobs queue: one row per order per printer
-- CloudPRNT printer polls your endpoint; if a job exists it gets served and marked printed
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'printing' | 'done' | 'error'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  printed_at TIMESTAMPTZ
);

-- Index so the CloudPRNT poll query is fast
CREATE INDEX IF NOT EXISTS print_jobs_printer_status ON print_jobs(printer_id, status);
CREATE INDEX IF NOT EXISTS print_jobs_order_id ON print_jobs(order_id);

-- RLS: allow service role full access (called from API routes with service key)
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access printers"
  ON printers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service role full access print_jobs"
  ON print_jobs FOR ALL
  USING (true)
  WITH CHECK (true);
