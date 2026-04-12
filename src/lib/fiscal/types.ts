/**
 * Fiscal compliance types for Veno App.
 *
 * The moment Veno App electronically records a completed payment it becomes
 * subject to fiscal laws in most European countries and Brazil. This module
 * defines the shared contract that every country-specific adapter must satisfy.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Supporting types
// ─────────────────────────────────────────────────────────────────────────────

export interface LineItem {
  name: string
  quantity: number
  /** Unit price in smallest currency unit (e.g. pence, cents) */
  unit_price_cents: number
  tax_rate: number
  tax_category: string
}

export interface TaxLine {
  rate: number
  taxable_amount_cents: number
  tax_amount_cents: number
  category: string
}

export interface FiscalConfig {
  adapter: string
  vat_rates: {
    food: number
    drink: number
    alcohol: number
  }
  allergen_standard: string
  currency: string
  tip_enabled: boolean
  kilojoule_display: boolean
  calorie_display: boolean
  retention_years: number
}

export interface Restaurant {
  id: string
  name: string
  email?: string
  owner_id: string
  country_code: string
  fiscal_config: FiscalConfig
  stripe_connect_account_id?: string
  stripe_connect_onboarded?: boolean
  invoice_settings?: { enabled: boolean }
  email_language?: string
}

export interface Order {
  id: string
  restaurant_id: string
  table_id?: string
  client_id?: string
  status: string
  paid: boolean
  payment_method?: string
  payment_taken_at?: string
  payment_taken_by_name?: string
  payment_reference?: string
  order_type?: string
  ready_for_pickup?: boolean
  picked_up_at?: string
  discount?: number
  created_at: string
  updated_at?: string
  // Joined from supabase queries — may be present
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id?: string
  quantity: number
  price_at_time: number
  menu_item_id?: string
  menu_items?: { name?: string; department?: string }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fiscal pipeline types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input to both beforePaymentRecorded and afterPaymentRecorded.
 * Built by pipeline.ts from the order + fetched order items.
 */
export interface FiscalEventInput {
  orderId: string
  restaurantId: string
  countryCode: string
  lineItems: LineItem[]
  taxLines: TaxLine[]
  subtotalCents: number
  totalCents: number
  currency: string
  paymentMethod: 'cash' | 'card'
  occurredAt: string
  contentHash: string
  previousEventId: string | null
  chainHash: string
  deleteAfter: Date | null
  legalBasis: string
}

/**
 * Returned by afterPaymentRecorded. Adapters fill in whichever lifecycle
 * slots they own; unused slots remain null.
 */
export interface FiscalLifecycleResult {
  preAuthorisation: Record<string, unknown> | null
  signing: Record<string, unknown> | null
  transmission: Record<string, unknown> | null
  receiptPayload: Record<string, unknown> | null
}

/**
 * Data passed to closeShift() — used by Italy for end-of-day transmission.
 */
export interface ShiftData {
  restaurantId: string
  countryCode: string
  shiftStart: string
  shiftEnd: string
  totalSales: number
  currency: string
  fiscalConfig: FiscalConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter interface
// ─────────────────────────────────────────────────────────────────────────────

export interface FiscalAdapter {
  /**
   * Called BEFORE the order is marked as paid.
   *
   * Most countries return { approved: true } immediately.
   * Brazil calls SEFAZ here and may block or reject.
   *
   * If approved is false, the pipeline throws FiscalRejectionError and order
   * completion is blocked — the waiter must resolve the rejection first.
   */
  beforePaymentRecorded(event: FiscalEventInput): Promise<{
    approved: boolean
    authCode?: string
    reason?: string
  }>

  /**
   * Called AFTER the order has been recorded as paid.
   *
   * Germany signs the transaction here (Fiskaly TSS).
   * Italy transmits to the Agenzia delle Entrate here.
   * Adapters that have nothing to do return an empty lifecycle result.
   */
  afterPaymentRecorded(
    event: FiscalEventInput,
    authCode?: string,
  ): Promise<FiscalLifecycleResult>

  /**
   * Optional end-of-day / shift-close procedure.
   * Italy requires end-of-day transmission to the RT printer / AdE web service.
   */
  closeShift?(shiftData: ShiftData): Promise<void>

  /**
   * Text appended to the customer receipt (e.g. fiscal sequence number,
   * validation URL, QR code placeholder).
   * Return an empty string if nothing is required.
   */
  receiptFooter(result: FiscalLifecycleResult): string

  /**
   * How long this country requires records to be retained by law.
   */
  retentionYears(): number
}
