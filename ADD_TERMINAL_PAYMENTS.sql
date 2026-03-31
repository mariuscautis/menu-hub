-- Stripe Terminal payments table
-- Run in Supabase SQL editor before deploying terminal integration

create table if not exists terminal_payments (
  id                uuid primary key default gen_random_uuid(),
  payment_intent_id text not null unique,
  restaurant_id     uuid not null references restaurants(id) on delete cascade,
  table_id          uuid not null references tables(id) on delete cascade,
  amount            numeric(10,2) not null,
  currency          text not null,
  status            text not null default 'pending',
  -- status values: 'pending' | 'waiting' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out'
  order_ids         jsonb not null default '[]',
  reader_id         text,
  decline_code      text,
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists terminal_payments_restaurant_id_idx
  on terminal_payments (restaurant_id);

create index if not exists terminal_payments_payment_intent_id_idx
  on terminal_payments (payment_intent_id);

create index if not exists terminal_payments_table_id_idx
  on terminal_payments (table_id);

-- Enable RLS
alter table terminal_payments enable row level security;

-- Service role (used by all API routes via SUPABASE_SERVICE_ROLE_KEY) bypasses RLS automatically.
-- This policy allows the authenticated dashboard user to read their own restaurant's terminal payments
-- (used by the frontend polling query).
create policy "restaurant owner can read own terminal payments"
  on terminal_payments for select
  using (
    restaurant_id in (
      select id from restaurants where owner_id = auth.uid()
    )
  );
