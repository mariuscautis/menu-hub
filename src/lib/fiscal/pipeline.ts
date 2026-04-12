/**
 * Fiscal event pipeline for Veno App.
 *
 * This is the single function that the payment recording code calls whenever
 * an order transitions to the paid/completed state. It:
 *
 *  1. Fetches the restaurant's country and fiscal config
 *  2. Fetches the order's line items
 *  3. Computes content hash and chain hash
 *  4. Calls adapter.beforePaymentRecorded (may block for Brazil/Spain)
 *  5. Calls adapter.afterPaymentRecorded (may sign for Germany, transmit for Italy)
 *  6. Inserts the complete fiscal_events record into Supabase
 *  7. Returns the lifecycle result (for receipt footer etc.)
 *
 * Caller responsibilities:
 *  - Wrap in try/catch
 *  - If FiscalRejectionError is thrown, block order completion and surface
 *    the reason to the user
 *  - If any other error is thrown, LOG it but do NOT block order completion
 *    (fiscal transmission failures must be handled by a retry queue before
 *    going live in fiscally-strict markets — see TODO below)
 *
 * TODO (before going live in DE, IT, FR, BR, ES):
 *  Add a background retry queue for failed afterPaymentRecorded calls.
 *  The fiscal_events record will already be inserted with empty lifecycle
 *  slots; the retry worker should query for records where the relevant slot
 *  is null and the country requires it, then call the adapter again and
 *  UPDATE only the lifecycle slot. The immutability trigger intentionally
 *  allows updates to the lifecycle JSONB columns.
 */

import { createClient } from '@supabase/supabase-js'
import { getFiscalAdapter } from './factory'
import { computeContentHash, computeChainHash } from './hashing'
import { getRetentionConfig } from './retention'
import type {
  FiscalEventInput,
  FiscalLifecycleResult,
  LineItem,
  TaxLine,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// Error types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when a fiscal adapter rejects the payment (e.g. Brazil SEFAZ
 * returns a rejection code). This error MUST block order completion.
 */
export class FiscalRejectionError extends Error {
  public readonly reason: string
  public readonly countryCode: string

  constructor(countryCode: string, reason: string) {
    super(`Fiscal rejection [${countryCode}]: ${reason}`)
    this.name = 'FiscalRejectionError'
    this.reason = reason
    this.countryCode = countryCode
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(url, key)
}

interface RawOrderItem {
  id: string
  quantity: number
  price_at_time: number
  menu_items?: { name?: string; department?: string } | null
}

/**
 * Build line items from raw order_items rows.
 * Tax rates are not stored per item — they come from the restaurant's
 * fiscal_config.vat_rates. For now we apply a single default rate;
 * a real implementation should map by menu_items.department → vat_rates key.
 */
function buildLineItems(
  rawItems: RawOrderItem[],
  vatRates: { food: number; drink: number; alcohol: number },
): LineItem[] {
  return rawItems.map(item => {
    const department = item.menu_items?.department ?? 'food'
    const taxRate = vatRates[department as keyof typeof vatRates] ?? vatRates.food
    return {
      name: item.menu_items?.name ?? 'Item',
      quantity: item.quantity,
      unit_price_cents: Math.round(item.price_at_time * 100),
      tax_rate: taxRate,
      tax_category: department,
    }
  })
}

/**
 * Aggregate line items into tax lines (one entry per distinct rate+category).
 */
function buildTaxLines(lineItems: LineItem[]): TaxLine[] {
  const groups: Record<string, TaxLine> = {}

  for (const item of lineItems) {
    const key = `${item.tax_rate}|${item.tax_category}`
    const lineTotal = item.quantity * item.unit_price_cents
    const taxAmount = Math.round(lineTotal * item.tax_rate)
    const taxable = lineTotal - taxAmount

    if (!groups[key]) {
      groups[key] = {
        rate: item.tax_rate,
        taxable_amount_cents: 0,
        tax_amount_cents: 0,
        category: item.tax_category,
      }
    }
    groups[key].taxable_amount_cents += taxable
    groups[key].tax_amount_cents += taxAmount
  }

  return Object.values(groups)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a fiscal event for a completed order.
 *
 * @param orderId        The UUID of the order that just transitioned to paid
 * @param restaurantId   The UUID of the restaurant
 * @param paymentMethod  'cash' or 'card'
 * @param occurredAt     ISO 8601 timestamp of when payment was recorded
 *                       (defaults to now)
 *
 * @throws FiscalRejectionError if the adapter rejects the payment (must block
 *         order completion — e.g. Brazil SEFAZ rejection)
 * @throws Error for other failures — caller should log but NOT block order
 *         completion (add to retry queue for later)
 */
export async function processFiscalEvent(
  orderId: string,
  restaurantId: string,
  paymentMethod: 'cash' | 'card',
  occurredAt: string = new Date().toISOString(),
): Promise<FiscalLifecycleResult> {
  const supabase = getSupabaseAdmin()

  // ── 1. Fetch restaurant (country + fiscal config) ────────────────────────
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, country_code, fiscal_config')
    .eq('id', restaurantId)
    .single()

  if (restaurantError || !restaurant) {
    throw new Error(
      `[fiscal] Failed to fetch restaurant ${restaurantId}: ${restaurantError?.message ?? 'not found'}`,
    )
  }

  const countryCode: string = restaurant.country_code ?? 'GB'
  const fiscalConfig = restaurant.fiscal_config ?? {}
  const vatRates = fiscalConfig.vat_rates ?? { food: 0, drink: 0, alcohol: 0 }
  const currency: string = fiscalConfig.currency ?? 'GBP'

  // ── 2. Fetch order items ─────────────────────────────────────────────────
  const { data: rawItems, error: itemsError } = await supabase
    .from('order_items')
    .select('id, quantity, price_at_time, menu_items(name, department)')
    .eq('order_id', orderId)

  if (itemsError) {
    throw new Error(
      `[fiscal] Failed to fetch order items for order ${orderId}: ${itemsError.message}`,
    )
  }

  const items = (rawItems ?? []) as RawOrderItem[]
  const lineItems = buildLineItems(items, vatRates)
  const taxLines = buildTaxLines(lineItems)

  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0,
  )
  const taxTotalCents = taxLines.reduce((sum, tl) => sum + tl.tax_amount_cents, 0)
  const totalCents = subtotalCents // total already includes tax (tax-inclusive pricing)
  // Note: if Veno App uses tax-exclusive pricing, change to: subtotalCents + taxTotalCents
  void taxTotalCents // suppress unused warning — kept for clarity

  // ── 3. Fetch previous event for chain ───────────────────────────────────
  const { data: previousEvent } = await supabase
    .from('fiscal_events')
    .select('id, chain_hash')
    .eq('restaurant_id', restaurantId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const previousEventId: string | null = previousEvent?.id ?? null
  const previousChainHash: string = previousEvent?.chain_hash ?? 'GENESIS'

  // ── 4. Compute hashes ────────────────────────────────────────────────────
  const commercialRecord = {
    orderId,
    restaurantId,
    countryCode,
    lineItems,
    taxLines,
    subtotalCents,
    totalCents,
    currency,
    paymentMethod,
    occurredAt,
  }

  const contentHash = await computeContentHash(commercialRecord)
  const chainHash = await computeChainHash(contentHash, previousChainHash)

  // ── 5. Build retention config ────────────────────────────────────────────
  const { deleteAfter, legalBasis } = getRetentionConfig(countryCode)

  // ── 6. Build FiscalEventInput ────────────────────────────────────────────
  const eventInput: FiscalEventInput = {
    orderId,
    restaurantId,
    countryCode,
    lineItems,
    taxLines,
    subtotalCents,
    totalCents,
    currency,
    paymentMethod,
    occurredAt,
    contentHash,
    previousEventId,
    chainHash,
    deleteAfter,
    legalBasis,
  }

  // ── 7. Get adapter ───────────────────────────────────────────────────────
  const adapter = getFiscalAdapter(countryCode)

  // ── 8. beforePaymentRecorded (may block for BR, ES) ──────────────────────
  let authCode: string | undefined
  const beforeResult = await adapter.beforePaymentRecorded(eventInput)
  if (!beforeResult.approved) {
    throw new FiscalRejectionError(
      countryCode,
      beforeResult.reason ?? 'Payment rejected by fiscal authority',
    )
  }
  authCode = beforeResult.authCode

  // ── 9. afterPaymentRecorded (may sign for DE, transmit for IT) ───────────
  const lifecycleResult = await adapter.afterPaymentRecorded(eventInput, authCode)

  // ── 10. Insert fiscal_events record ─────────────────────────────────────
  const { error: insertError } = await supabase.from('fiscal_events').insert({
    order_id:          orderId,
    restaurant_id:     restaurantId,
    country_code:      countryCode,
    line_items:        lineItems,
    tax_lines:         taxLines,
    subtotal_cents:    subtotalCents,
    total_cents:       totalCents,
    currency,
    payment_method:    paymentMethod,
    occurred_at:       occurredAt,
    content_hash:      contentHash,
    previous_event_id: previousEventId,
    chain_hash:        chainHash,
    pre_authorisation: lifecycleResult.preAuthorisation,
    signing:           lifecycleResult.signing,
    transmission:      lifecycleResult.transmission,
    receipt_payload:   lifecycleResult.receiptPayload,
    delete_after:      deleteAfter?.toISOString() ?? null,
    legal_basis:       legalBasis,
  })

  if (insertError) {
    throw new Error(
      `[fiscal] Failed to insert fiscal_events record for order ${orderId}: ${insertError.message}`,
    )
  }

  return lifecycleResult
}
