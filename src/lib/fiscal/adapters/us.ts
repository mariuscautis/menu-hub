/**
 * USSalesTaxAdapter — United States sales tax skeleton.
 *
 * The US has no federal electronic recording mandate — there is no equivalent
 * of Germany's KassenSichV or France's NF525. However:
 *  - Sales tax is levied at the state (and sometimes city/county) level
 *  - Rates vary enormously by state, county, city, and product category
 *  - Restaurant meals may be exempt, taxed at a reduced rate, or taxed at the
 *    full rate depending on the state
 *  - Records must be kept for 7 years per IRS conservative guidance
 *    (state requirements vary from 3 to 10 years)
 *
 * This adapter is a no-op for signing and transmission. The main engineering
 * work is accurate tax calculation at order time (not at payment time).
 *
 * ─── TODO: US sales tax calculation ──────────────────────────────────────────
 *
 * Steps required:
 *  1. Add `state_code` (ISO 3166-2 US state) and `nexus_states` (array of
 *     states where the venue has tax nexus) to fiscal_config.
 *  2. Integrate a tax calculation API at the point where order items are
 *     priced. Recommended providers:
 *       - Avalara AvaTax: industry standard, most accurate, expensive
 *       - TaxJar: simpler API, good for SMBs, SmartCalcs endpoint
 *       - Stripe Tax: if Stripe is already integrated (easiest add-on)
 *     These APIs accept the venue ZIP code, product category codes, and item
 *     prices and return the correct combined tax rate and breakdown.
 *  3. Store the tax calculation results in line_items.tax_rate and tax_lines
 *     on the fiscal event so the correct tax is recorded per jurisdiction.
 *  4. For states with marketplace facilitator laws (most states), the SaaS
 *     platform (Veno App) may be the tax collector, not the restaurant —
 *     get legal advice before going live in the US.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  FiscalAdapter,
  FiscalEventInput,
  FiscalLifecycleResult,
} from '../types'

const EMPTY_LIFECYCLE: FiscalLifecycleResult = {
  preAuthorisation: null,
  signing: null,
  transmission: null,
  receiptPayload: null,
}

export class USSalesTaxAdapter implements FiscalAdapter {
  async beforePaymentRecorded(
    _event: FiscalEventInput,
  ): Promise<{ approved: boolean }> {
    // No pre-authorisation required in the US.
    return { approved: true }
  }

  async afterPaymentRecorded(
    _event: FiscalEventInput,
    _authCode?: string,
  ): Promise<FiscalLifecycleResult> {
    // No signing or transmission required in the US.
    return EMPTY_LIFECYCLE
  }

  receiptFooter(_result: FiscalLifecycleResult): string {
    return ''
  }

  retentionYears(): number {
    return 7
  }
}
