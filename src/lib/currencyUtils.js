export const CURRENCY_SYMBOLS = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  RON: 'lei',
  JPY: '¥',
  AUD: 'A$',
  CAD: 'C$',
}

const CURRENCY_LOCALES = {
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
  RON: 'ro-RO',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
}

export function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || CURRENCY_SYMBOLS['EUR']
}

export function formatCurrencyStandalone(amount, currencyCode) {
  const code = CURRENCY_SYMBOLS[currencyCode] ? currencyCode : 'EUR'
  const locale = CURRENCY_LOCALES[code] || 'en-GB'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}
