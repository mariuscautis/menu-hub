/**
 * Retention rules by country.
 *
 * Returns the delete_after date and the legal_basis string to be stored on
 * each fiscal_events record at insert time.
 *
 * A null deleteAfter means "keep forever" — used for countries where permanent
 * retention is the safest interpretation of the law (DE, FR, IT).
 */

interface RetentionConfig {
  deleteAfter: Date | null
  legalBasis: string
}

/**
 * Map of country code → { years | null, legalBasis }.
 * null years means keep forever (deleteAfter = null).
 */
const RETENTION_RULES: Record<string, { years: number | null; legalBasis: string }> = {
  GB: { years: 6,    legalBasis: 'HMRC_6YR' },
  IE: { years: 6,    legalBasis: 'REVENUE_IE_6YR' },
  NL: { years: 7,    legalBasis: 'BELASTINGDIENST_7YR' },
  DE: { years: null, legalBasis: 'KASSENSICHV_10YR' },   // Keep forever — safest for KassenSichV
  FR: { years: null, legalBasis: 'CGI_FR_10YR' },        // Keep forever — safest for NF525
  IT: { years: null, legalBasis: 'CODICE_FISCALE_IT_10YR' }, // Keep forever
  BE: { years: 10,   legalBasis: 'GKS_BE_10YR' },
  ES: { years: 4,    legalBasis: 'AEAT_ES_4YR' },
  AU: { years: 5,    legalBasis: 'ATO_AU_5YR' },
  US: { years: 7,    legalBasis: 'IRS_US_7YR' },         // Conservative; state rules may vary
  BR: { years: 5,    legalBasis: 'RECEITA_FEDERAL_BR_5YR' },
}

const DEFAULT_RETENTION: { years: number; legalBasis: string } = {
  years: 6,
  legalBasis: 'DEFAULT_6YR',
}

/**
 * Return the retention configuration for a given country.
 * Unknown countries fall back to 6 years with a generic label.
 */
export function getRetentionConfig(countryCode: string): RetentionConfig {
  const rule = RETENTION_RULES[countryCode.toUpperCase()] ?? DEFAULT_RETENTION

  if (rule.years === null) {
    return { deleteAfter: null, legalBasis: rule.legalBasis }
  }

  const deleteAfter = new Date()
  deleteAfter.setFullYear(deleteAfter.getFullYear() + rule.years)
  return { deleteAfter, legalBasis: rule.legalBasis }
}
