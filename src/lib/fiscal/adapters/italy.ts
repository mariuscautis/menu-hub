/**
 * ItalyFiscalAdapter — Registratore Telematico (RT) compliance skeleton.
 *
 * Italian law requires all commercial transactions to be:
 *  - Recorded and transmitted to the Agenzia delle Entrate (AdE) via a
 *    certified Registratore Telematico (RT fiscal printer) or equivalent
 *    software solution (RT Software)
 *  - End-of-day closure transmission (chiusura giornaliera) mandatory
 *  - Records retained for 10 years (art. 43 DPR 600/1973)
 *
 * The RT printer generates the "scontrino fiscale" (fiscal receipt) and
 * handles the daily transmission autonomously once configured. Software-only
 * solutions use the AdE web service directly.
 *
 * Veno App is NOT currently available for Italian venues. This adapter
 * exists so adding Italy support is a contained, single-file engineering task.
 *
 * ─── TODO: Implementing Italian fiscal compliance ─────────────────────────────
 *
 * Option A — RT Printer integration (recommended for venues with a printer):
 *  1. Most RT printers expose a local HTTP or serial API. Common models:
 *       - Epson FP-90III RT / FP-81II RT: REST API
 *       - Custom Q3X RT / Ditron: proprietary API
 *  2. In afterPaymentRecorded: send the sale data to the local RT printer API
 *     (via the Veno Bridge companion app which has LAN access).
 *     The printer returns a fiscal document number (numero documento) and
 *     Z-counter (progressive daily counter).
 *  3. In closeShift: send the end-of-day closure command to the RT printer.
 *
 * Option B — RT Software (direct AdE web service):
 *  1. Register the software solution with AdE.
 *  2. Use the AdE Fatturazione Elettronica web service to transmit documents.
 *  3. Alternatively integrate a certified fiscal middleware (e.g. Fiscal Focus,
 *     TeamSystem, Buffetti) which handles AdE transmission.
 *
 * Add to fiscal_config for Italian venues:
 *   - rt_printer_ip: local IP of the RT printer (for Bridge integration)
 *   - codice_fiscale: venue's Italian tax code
 *   - partita_iva: VAT number
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  FiscalAdapter,
  FiscalEventInput,
  FiscalLifecycleResult,
  ShiftData,
} from '../types'

export class ItalyFiscalAdapter implements FiscalAdapter {
  async beforePaymentRecorded(
    _event: FiscalEventInput,
  ): Promise<{ approved: boolean }> {
    // Italy does not pre-authorise individual transactions.
    return { approved: true }
  }

  async afterPaymentRecorded(
    _event: FiscalEventInput,
    _authCode?: string,
  ): Promise<FiscalLifecycleResult> {
    throw new Error(
      'Italian fiscal adapter (RT printer / Agenzia delle Entrate) not yet implemented. ' +
      'Veno App is not currently available for Italian venues. ' +
      'See the TODO block in adapters/italy.ts for implementation details.',
    )
  }

  async closeShift(_shiftData: ShiftData): Promise<void> {
    // TODO: send end-of-day chiusura giornaliera command to the RT printer
    // or AdE web service. This is mandatory under Italian law.
    throw new Error(
      'Italian closeShift (chiusura giornaliera) not yet implemented. ' +
      'See adapters/italy.ts for implementation details.',
    )
  }

  receiptFooter(_result: FiscalLifecycleResult): string {
    // TODO: format fiscal receipt footer with numero documento and Z-counter.
    return ''
  }

  retentionYears(): number {
    return 10
  }
}
