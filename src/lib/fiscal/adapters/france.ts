/**
 * FranceFiscalAdapter — NF525 certified POS software compliance skeleton.
 *
 * French law (article 286-I-3° bis du CGI and BOFiP BOI-TVA-DECLA-30-10-30)
 * requires all POS systems used by VAT-registered businesses to be either:
 *  - Certified NF525 by a certification body (currently Bureau Veritas,
 *    Infocert, or LNE)
 *  - Or use a certified fiscal middleware that wraps the POS system
 *
 * NF525 certification requires:
 *  - Tamper-evident audit trail with sequential numbering
 *  - Data condemnation (records cannot be deleted or modified)
 *  - Grand totals (Z-totals) computed at day and period close
 *  - Software version management and change logging
 *  - Records retained for 10 years (article L.102 B du LPF)
 *
 * Veno App is NOT currently available for French venues. This adapter
 * exists so adding France support is a contained, single-file engineering task.
 *
 * ─── TODO: Implementing French NF525 compliance ───────────────────────────────
 *
 * NF525 is a SOFTWARE CERTIFICATION, not a real-time transmission requirement.
 * This means:
 *  1. Veno App itself (or a French fiscal module wrapping it) must be certified
 *     by an accredited body. This is a multi-month process.
 *  2. Alternatively, integrate a certified French fiscal middleware such as:
 *       - Fiskaly France (same provider as Germany, offers NF525 compliance)
 *       - L'Addition / Zelty (French POS-as-a-service with NF525)
 *       - A certified cash register module from a French ISV
 *  3. The middleware typically provides:
 *       - Sequential receipt numbering (numéro de ticket)
 *       - Grand total tracking (grand total journalier / mensuel / annuel)
 *       - Journal des événements (audit log of all POS events)
 *  4. Add to fiscal_config for French venues:
 *       - nf525_middleware_api_key
 *       - naf_code (venue's NAF activity code)
 *       - siret (14-digit business registration number)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  FiscalAdapter,
  FiscalEventInput,
  FiscalLifecycleResult,
} from '../types'

export class FranceFiscalAdapter implements FiscalAdapter {
  async beforePaymentRecorded(
    _event: FiscalEventInput,
  ): Promise<{ approved: boolean }> {
    // France does not pre-authorise individual transactions.
    return { approved: true }
  }

  async afterPaymentRecorded(
    _event: FiscalEventInput,
    _authCode?: string,
  ): Promise<FiscalLifecycleResult> {
    throw new Error(
      'French fiscal adapter (NF525 certified software) not yet implemented. ' +
      'Veno App is not currently available for French venues. ' +
      'See the TODO block in adapters/france.ts for implementation details.',
    )
  }

  receiptFooter(_result: FiscalLifecycleResult): string {
    // TODO: format NF525-compliant receipt footer with sequential ticket number
    // and grand total reference.
    return ''
  }

  retentionYears(): number {
    return 10
  }
}
