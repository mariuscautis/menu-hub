'use client'

import { createContext, useContext, useMemo } from 'react'
import { CURRENCY_SYMBOLS, getCurrencySymbol, formatCurrencyStandalone } from './currencyUtils'

const CURRENCY_LOCALES = {
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
  RON: 'ro-RO',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  CAD: 'en-CA',
}

const DEFAULT_CURRENCY = 'EUR'

const CurrencyContext = createContext({
  currency: DEFAULT_CURRENCY,
  currencySymbol: CURRENCY_SYMBOLS[DEFAULT_CURRENCY],
  formatCurrency: (amount) => `${CURRENCY_SYMBOLS[DEFAULT_CURRENCY]}${Number(amount || 0).toFixed(2)}`,
})

export function CurrencyProvider({ children, currency }) {
  const resolvedCurrency = (currency && CURRENCY_SYMBOLS[currency]) ? currency : DEFAULT_CURRENCY

  const value = useMemo(() => {
    const symbol = CURRENCY_SYMBOLS[resolvedCurrency]
    const locale = CURRENCY_LOCALES[resolvedCurrency] || 'en-GB'

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: resolvedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    return {
      currency: resolvedCurrency,
      currencySymbol: symbol,
      formatCurrency: (amount) => formatter.format(Number(amount) || 0),
    }
  }, [resolvedCurrency])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

export { CURRENCY_SYMBOLS, getCurrencySymbol, formatCurrencyStandalone }
