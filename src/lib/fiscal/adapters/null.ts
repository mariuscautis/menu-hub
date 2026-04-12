/**
 * NullFiscalAdapter — used for GB, IE, NL, AU, and any country with no
 * current fiscal obligation beyond standard VAT record-keeping.
 *
 * Every method is a no-op: payments proceed immediately, no signing or
 * transmission is performed, and the receipt footer is empty.
 */

import type {
  FiscalAdapter,
  FiscalEventInput,
  FiscalLifecycleResult,
  ShiftData,
} from '../types'

const EMPTY_LIFECYCLE: FiscalLifecycleResult = {
  preAuthorisation: null,
  signing: null,
  transmission: null,
  receiptPayload: null,
}

export class NullFiscalAdapter implements FiscalAdapter {
  async beforePaymentRecorded(
    _event: FiscalEventInput,
  ): Promise<{ approved: boolean }> {
    return { approved: true }
  }

  async afterPaymentRecorded(
    _event: FiscalEventInput,
    _authCode?: string,
  ): Promise<FiscalLifecycleResult> {
    return EMPTY_LIFECYCLE
  }

  // closeShift is optional — not needed for null adapter
  async closeShift(_shiftData: ShiftData): Promise<void> {
    // Nothing to do
  }

  receiptFooter(_result: FiscalLifecycleResult): string {
    return ''
  }

  retentionYears(): number {
    return 6
  }
}
