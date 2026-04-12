/**
 * GermanyFiscalAdapter — KassenSichV compliance skeleton.
 *
 * German law (Kassensicherungsverordnung, KassenSichV) requires:
 *  - All electronic recording systems connected to a certified TSS (Technische
 *    Sicherheitseinrichtung)
 *  - Every transaction cryptographically signed by the TSS
 *  - System registered with the tax office via Mein ELSTER (mandatory since
 *    January 2025)
 *  - Records retained for 10 years (§ 147 AO)
 *
 * Veno App is NOT currently available for German venues. This adapter exists
 * so adding Germany support is a contained, single-file engineering task.
 *
 * ─── TODO: Implementing German fiscal compliance ──────────────────────────────
 *
 * Provider: Fiskaly (fiskaly.com) is the dominant TSS-as-a-service provider
 * for German POS systems. Deutsche Fiskal is the alternative.
 *
 * Steps required:
 *  1. Add `fiskaly_api_key` and `fiskaly_tss_id` fields to `fiscal_config`
 *     in the restaurants table for German venues.
 *  2. In afterPaymentRecorded:
 *       POST https://kassensichv-middleware.fiskaly.com/api/v2/tss/{tss_id}/tx/{tx_id}
 *       with the transaction data (line items, totals, timestamps).
 *       The response contains:
 *         - signature.value       → TSS cryptographic signature
 *         - number                → TSS transaction number
 *         - time_start / time_end → timestamps for the receipt
 *         - tss.serial_number     → printer serial number equivalent
 *       Write the entire Fiskaly response into the `signing` JSONB slot.
 *  3. The receipt footer must display:
 *       - TSS transaction number
 *       - TSS serial number
 *       - Start/end timestamps
 *       - Signature value (usually as QR code)
 *     The specific format is defined in AEAO § 146a BMF.
 *  4. Register each venue's cash register with the Finanzamt via the
 *     Mein ELSTER API before going live (mandatory since 2025-01-01).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  FiscalAdapter,
  FiscalEventInput,
  FiscalLifecycleResult,
} from '../types'

export class GermanyFiscalAdapter implements FiscalAdapter {
  async beforePaymentRecorded(
    _event: FiscalEventInput,
  ): Promise<{ approved: boolean }> {
    // Germany does not pre-authorise transactions — recording happens first,
    // signing happens after in afterPaymentRecorded.
    return { approved: true }
  }

  async afterPaymentRecorded(
    _event: FiscalEventInput,
    _authCode?: string,
  ): Promise<FiscalLifecycleResult> {
    throw new Error(
      'German fiscal adapter (Fiskaly TSS) not yet implemented. ' +
      'Veno App is not currently available for German venues. ' +
      'See the TODO block in adapters/germany.ts for implementation details.',
    )
  }

  receiptFooter(_result: FiscalLifecycleResult): string {
    // TODO: extract TSS transaction number + signature from result.signing
    // and format the receipt footer per AEAO § 146a BMF requirements.
    return ''
  }

  retentionYears(): number {
    return 10
  }
}
