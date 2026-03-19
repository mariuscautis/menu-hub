-- Support Ticketing System
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  subject       TEXT NOT NULL,
  category      TEXT NOT NULL CHECK (category IN ('billing', 'bug', 'feature', 'other')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_restaurant_idx ON support_tickets (restaurant_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets (status);

CREATE TABLE IF NOT EXISTS support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('venue', 'support')),
  body        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_messages_ticket_idx ON support_messages (ticket_id);
CREATE INDEX IF NOT EXISTS support_messages_unread_idx ON support_messages (ticket_id, is_read, sender_type);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_support_ticket_updated_at();

-- RLS
ALTER TABLE support_tickets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Venues see only their own tickets (via restaurant ownership)
CREATE POLICY "venues_own_tickets" ON support_tickets FOR SELECT
  USING (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "venues_insert_tickets" ON support_tickets FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = auth.uid()));

-- Venues see messages on their own tickets
CREATE POLICY "venues_own_ticket_messages" ON support_messages FOR SELECT
  USING (ticket_id IN (
    SELECT t.id FROM support_tickets t
    JOIN restaurants r ON r.id = t.restaurant_id
    WHERE r.owner_id = auth.uid()
  ));

CREATE POLICY "venues_insert_messages" ON support_messages FOR INSERT
  WITH CHECK (ticket_id IN (
    SELECT t.id FROM support_tickets t
    JOIN restaurants r ON r.id = t.restaurant_id
    WHERE r.owner_id = auth.uid()
  ));

-- Venues can update their own messages (mark read etc.)
CREATE POLICY "venues_update_own_messages" ON support_messages FOR UPDATE
  USING (ticket_id IN (
    SELECT t.id FROM support_tickets t
    JOIN restaurants r ON r.id = t.restaurant_id
    WHERE r.owner_id = auth.uid()
  ));

-- Admins can see and do everything
CREATE POLICY "admins_all_tickets" ON support_tickets FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "admins_all_messages" ON support_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- Service role bypasses all RLS
CREATE POLICY "service_role_all_tickets" ON support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_messages" ON support_messages FOR ALL TO service_role USING (true) WITH CHECK (true);
