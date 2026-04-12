-- Fiscal compliance foundation for Veno App
-- Run in Supabase SQL editor.
--
-- This migration:
--   1. Adds country_code and fiscal_config columns to the restaurants table
--   2. Creates the fiscal_events table with a tamper-evident hash chain
--   3. Installs a trigger that blocks updates to immutable commercial fields

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend restaurants table
-- ─────────────────────────────────────────────────────────────────────────────

alter table restaurants
  add column if not exists country_code char(2) not null default 'GB',
  add column if not exists fiscal_config jsonb not null default '{
    "adapter": "null",
    "vat_rates": {
      "food":    0.00,
      "drink":   0.00,
      "alcohol": 0.00
    },
    "allergen_standard": "EU_1169",
    "currency": "GBP",
    "tip_enabled": false,
    "kilojoule_display": false,
    "calorie_display": false,
    "retention_years": 6
  }'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create fiscal_events table
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists fiscal_events (
  -- Identity
  id                uuid        primary key default gen_random_uuid(),
  order_id          uuid        not null references orders(id) on delete restrict,
  restaurant_id     uuid        not null references restaurants(id) on delete restrict,

  -- Jurisdiction
  country_code      char(2)     not null,

  -- Commercial record (IMMUTABLE after insert — enforced by trigger below)
  line_items        jsonb       not null,
  -- Array of: { name, quantity, unit_price_cents, tax_rate, tax_category }

  tax_lines         jsonb       not null,
  -- Array of: { rate, taxable_amount_cents, tax_amount_cents, category }

  subtotal_cents    integer     not null,
  total_cents       integer     not null,
  currency          char(3)     not null,
  payment_method    text        not null check (payment_method in ('cash', 'card')),
  occurred_at       timestamptz not null,

  -- Tamper-evidence chain
  content_hash      text        not null,
  -- SHA-256 of deterministically sorted JSON of the commercial record fields

  previous_event_id uuid        references fiscal_events(id) on delete restrict,
  -- NULL for the very first event per restaurant

  chain_hash        text        not null,
  -- SHA-256 of (content_hash || previous chain_hash), or literal 'GENESIS' for first record

  -- Fiscal lifecycle slots (MUTABLE — adapters write here as processing completes)
  pre_authorisation jsonb,
  -- Used by: Brazil (SEFAZ NFC-e auth before recording), Spain (Verifactu)

  signing           jsonb,
  -- Used by: Germany (Fiskaly TSS signature + transaction number), Austria, Portugal

  transmission      jsonb,
  -- Used by: Italy (RT printer / AdE web service), France (NF525), Spain (end-of-day)

  receipt_payload   jsonb,
  -- Receipt display data: validation URLs, QR codes, fiscal sequence numbers

  -- Retention metadata
  delete_after      timestamptz,
  -- NULL = keep forever (used for DE, FR, IT where permanent retention is safest)

  legal_basis       text        not null,
  -- E.g. 'HMRC_6YR', 'KASSENSICHV_10YR', 'SEFAZ_5YR'

  created_at        timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists fiscal_events_restaurant_occurred_idx
  on fiscal_events (restaurant_id, occurred_at desc);

create index if not exists fiscal_events_previous_event_idx
  on fiscal_events (previous_event_id);

create index if not exists fiscal_events_order_id_idx
  on fiscal_events (order_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Immutability trigger
--    Blocks UPDATE on commercial fields that form the hash chain.
--    The lifecycle JSONB columns (pre_authorisation, signing, transmission,
--    receipt_payload) remain writable so adapters can fill them in.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function fiscal_events_immutable_check()
returns trigger
language plpgsql
as $$
begin
  if (
    new.line_items     is distinct from old.line_items     or
    new.tax_lines      is distinct from old.tax_lines      or
    new.subtotal_cents is distinct from old.subtotal_cents or
    new.total_cents    is distinct from old.total_cents    or
    new.content_hash   is distinct from old.content_hash   or
    new.chain_hash     is distinct from old.chain_hash     or
    new.occurred_at    is distinct from old.occurred_at
  ) then
    raise exception
      'fiscal_events: fields line_items, tax_lines, subtotal_cents, total_cents, '
      'content_hash, chain_hash, and occurred_at are immutable after insert.';
  end if;
  return new;
end;
$$;

create or replace trigger fiscal_events_immutable
  before update on fiscal_events
  for each row execute function fiscal_events_immutable_check();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Row-level security
-- ─────────────────────────────────────────────────────────────────────────────

alter table fiscal_events enable row level security;

-- Service role (API routes) bypasses RLS automatically.
-- Dashboard users may read their own restaurant's fiscal events.
create policy "restaurant owner can read own fiscal events"
  on fiscal_events for select
  using (
    restaurant_id in (
      select id from restaurants where owner_id = auth.uid()
    )
  );
