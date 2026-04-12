/**
 * Fiscal adapter factory.
 *
 * Maps ISO 3166-1 alpha-2 country codes to the appropriate FiscalAdapter
 * implementation. Unknown country codes fall back to the NullFiscalAdapter
 * with a console warning so that unexpected venues don't silently fail.
 */

import type { FiscalAdapter } from './types'
import { NullFiscalAdapter } from './adapters/null'
import { GermanyFiscalAdapter } from './adapters/germany'
import { BrazilFiscalAdapter } from './adapters/brazil'
import { USSalesTaxAdapter } from './adapters/us'
import { ItalyFiscalAdapter } from './adapters/italy'
import { FranceFiscalAdapter } from './adapters/france'

type AdapterConstructor = new () => FiscalAdapter

const ADAPTER_REGISTRY: Record<string, AdapterConstructor> = {
  // No current fiscal obligation (beyond standard VAT record-keeping)
  GB: NullFiscalAdapter,
  IE: NullFiscalAdapter,
  NL: NullFiscalAdapter,
  AU: NullFiscalAdapter,

  // Fiscally strict — adapters throw until implemented
  DE: GermanyFiscalAdapter,
  BR: BrazilFiscalAdapter,
  IT: ItalyFiscalAdapter,
  FR: FranceFiscalAdapter,

  // US — no signing/transmission, but adapter exists for sales tax wiring
  US: USSalesTaxAdapter,
}

/**
 * Return the fiscal adapter for a given country.
 * Unknown country codes fall back to the NullFiscalAdapter.
 */
export function getFiscalAdapter(countryCode: string): FiscalAdapter {
  const Adapter = ADAPTER_REGISTRY[countryCode.toUpperCase()]

  if (!Adapter) {
    console.warn(
      `[fiscal] No adapter registered for country "${countryCode}". ` +
      'Falling back to NullFiscalAdapter. ' +
      'Add this country to src/lib/fiscal/factory.ts if fiscal compliance is required.',
    )
    return new NullFiscalAdapter()
  }

  return new Adapter()
}
