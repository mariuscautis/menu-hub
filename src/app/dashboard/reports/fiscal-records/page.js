'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useCurrency } from '@/lib/CurrencyContext'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { reportsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'
import InfoTooltip from '@/components/InfoTooltip'

// ─── Small helpers ────────────────────────────────────────────────────────────

function fmt(cents, formatCurrency) {
  return formatCurrency(cents / 100)
}

function fmtDatetime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function shortId(id) {
  return id ? id.slice(0, 8).toUpperCase() : '—'
}

// ─── Chain integrity badge ────────────────────────────────────────────────────

function ChainBadge({ ok }) {
  if (ok === null) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      —
    </span>
  )
  return ok ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Tampered
    </span>
  )
}

// ─── Lifecycle slot pill ──────────────────────────────────────────────────────

function SlotPill({ label, value }) {
  const filled = value !== null && value !== undefined
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      filled
        ? 'bg-[#6262bd]/10 text-[#6262bd] dark:bg-[#6262bd]/20'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 dark:text-zinc-500'
    }`}>
      {filled ? (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      )}
      {label}
    </span>
  )
}

// ─── Expanded row drawer ──────────────────────────────────────────────────────

function ExpandedRow({ event, formatCurrency }) {
  return (
    <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 space-y-4">

      {/* Line items */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 uppercase tracking-wide mb-2">Line Items</h4>
        <div className="rounded-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
              <tr>
                <th className="text-left px-3 py-2">Item</th>
                <th className="text-center px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Unit Price</th>
                <th className="text-right px-3 py-2">Tax</th>
                <th className="text-right px-3 py-2">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 dark:divide-slate-700">
              {(event.line_items || []).map((item, i) => (
                <tr key={i} className="bg-white dark:bg-zinc-900">
                  <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{item.name}</td>
                  <td className="px-3 py-2 text-center text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{item.quantity}</td>
                  <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{fmt(item.unit_price_cents, formatCurrency)}</td>
                  <td className="px-3 py-2 text-right text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 text-xs">{((item.tax_rate || 0) * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2 text-right font-medium text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{fmt(item.quantity * item.unit_price_cents, formatCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax lines */}
      {(event.tax_lines || []).length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 uppercase tracking-wide mb-2">Tax Lines</h4>
          <div className="rounded-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
                <tr>
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-center px-3 py-2">Rate</th>
                  <th className="text-right px-3 py-2">Taxable</th>
                  <th className="text-right px-3 py-2">Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 dark:divide-slate-700">
                {(event.tax_lines || []).map((tl, i) => (
                  <tr key={i} className="bg-white dark:bg-zinc-900">
                    <td className="px-3 py-2 capitalize text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{tl.category}</td>
                    <td className="px-3 py-2 text-center text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{((tl.rate || 0) * 100).toFixed(0)}%</td>
                    <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">{fmt(tl.taxable_amount_cents, formatCurrency)}</td>
                    <td className="px-3 py-2 text-right font-medium text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{fmt(tl.tax_amount_cents, formatCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hash chain */}
      <div>
        <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 uppercase tracking-wide mb-2">Tamper Evidence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 space-y-1">
            <div className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mb-1">Content Hash (SHA-256)</div>
            <div className="text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 break-all">{event.content_hash || '—'}</div>
          </div>
          <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3 space-y-1">
            <div className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mb-1">Chain Hash (SHA-256)</div>
            <div className="text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 break-all">{event.chain_hash || '—'}</div>
          </div>
          <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3">
            <div className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mb-1">Previous Event ID</div>
            <div className="text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{event.previous_event_id || 'GENESIS (first record)'}</div>
          </div>
          <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3">
            <div className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mb-1">Legal Basis / Retention</div>
            <div className="text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">{event.legal_basis || '—'}</div>
            {event.delete_after && (
              <div className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mt-1">Delete after: {fmtDatetime(event.delete_after)}</div>
            )}
            {!event.delete_after && (
              <div className="text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mt-1">Keep forever</div>
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle slots — only show if any are filled */}
      {(event.signing || event.transmission || event.pre_authorisation || event.receipt_payload) && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 uppercase tracking-wide mb-2">Fiscal Lifecycle Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {event.pre_authorisation && (
              <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3">
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Pre-Authorisation</div>
                <pre className="text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 overflow-auto max-h-32">{JSON.stringify(event.pre_authorisation, null, 2)}</pre>
              </div>
            )}
            {event.signing && (
              <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3">
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Signing (TSS / Certificate)</div>
                <pre className="text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 overflow-auto max-h-32">{JSON.stringify(event.signing, null, 2)}</pre>
              </div>
            )}
            {event.transmission && (
              <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3">
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Transmission</div>
                <pre className="text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 overflow-auto max-h-32">{JSON.stringify(event.transmission, null, 2)}</pre>
              </div>
            )}
            {event.receipt_payload && (
              <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-3">
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mb-1">Receipt Payload</div>
                <pre className="text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 overflow-auto max-h-32">{JSON.stringify(event.receipt_payload, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FiscalRecordsPage() {
  useModuleGuard('reports')
  const t = useTranslations('fiscalRecords')
  const tg = useTranslations('guide')
  const { formatCurrency } = useCurrency()
  const restaurantCtx = useRestaurant()

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Summary
  const [summary, setSummary] = useState({ count: 0, totalCents: 0, cashCents: 0, cardCents: 0 })

  useEffect(() => {
    if (restaurantCtx?.restaurant) setRestaurant(restaurantCtx.restaurant)
  }, [restaurantCtx])

  useEffect(() => {
    if (restaurant?.id) fetchEvents()
  }, [restaurant?.id, startDate, endDate, methodFilter])

  const fetchEvents = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      let q = supabase
        .from('fiscal_events')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('occurred_at', `${startDate}T00:00:00.000Z`)
        .lte('occurred_at', `${endDate}T23:59:59.999Z`)
        .order('occurred_at', { ascending: false })
        .limit(500)

      if (methodFilter !== 'all') q = q.eq('payment_method', methodFilter)

      const { data, error } = await q
      if (error) throw error

      const rows = data || []
      setEvents(rows)

      // Compute summary
      let totalCents = 0, cashCents = 0, cardCents = 0
      rows.forEach(e => {
        totalCents += e.total_cents || 0
        if (e.payment_method === 'cash') cashCents += e.total_cents || 0
        else cardCents += e.total_cents || 0
      })
      setSummary({ count: rows.length, totalCents, cashCents, cardCents })
    } catch (err) {
      console.error('[fiscal-records] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [restaurant?.id, startDate, endDate, methodFilter])

  // Client-side search filter (order ID, event ID)
  const filtered = events.filter(e => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      e.id?.toLowerCase().includes(q) ||
      e.order_id?.toLowerCase().includes(q)
    )
  })

  // ── CSV export ──────────────────────────────────────────────────────────────
  function exportCSV() {
    setExporting(true)
    try {
      const rows = filtered
      const headers = [
        'Event ID', 'Order ID', 'Date / Time', 'Country', 'Payment Method',
        'Currency', 'Subtotal', 'Total', 'Tax Total', 'Legal Basis', 'Chain Hash'
      ]
      const lines = rows.map(e => {
        const taxTotal = (e.tax_lines || []).reduce((s, tl) => s + (tl.tax_amount_cents || 0), 0)
        return [
          e.id,
          e.order_id,
          fmtDatetime(e.occurred_at),
          e.country_code,
          e.payment_method,
          e.currency,
          ((e.subtotal_cents || 0) / 100).toFixed(2),
          ((e.total_cents || 0) / 100).toFixed(2),
          (taxTotal / 100).toFixed(2),
          e.legal_basis,
          e.chain_hash,
        ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      })
      const csv = [headers.join(','), ...lines].join('\n')
      downloadBlob(csv, `fiscal-records-${startDate}-to-${endDate}.csv`, 'text/csv')
    } finally {
      setExporting(false)
    }
  }

  // ── JSON export ─────────────────────────────────────────────────────────────
  function exportJSON() {
    setExporting(true)
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        restaurant_id: restaurant?.id,
        period: { from: startDate, to: endDate },
        record_count: filtered.length,
        records: filtered,
      }
      downloadBlob(
        JSON.stringify(payload, null, 2),
        `fiscal-records-${startDate}-to-${endDate}.json`,
        'application/json'
      )
    } finally {
      setExporting(false)
    }
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <OfflinePageGuard>
      <div className="min-h-screen p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 flex items-center gap-2">
                Fiscal Records
                <InfoTooltip text="An immutable audit log of every recorded payment. Each record is cryptographically chained to the previous one to provide tamper evidence." />
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5">
                Tamper-evident payment audit trail
              </p>
            </div>
            <PageTabs tabs={reportsTabs} />
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="text-sm border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 dark:text-zinc-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="text-sm border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 dark:text-zinc-200"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">Method</label>
                <select
                  value={methodFilter}
                  onChange={e => setMethodFilter(e.target.value)}
                  className="text-sm border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 dark:text-zinc-200"
                >
                  <option value="all">All</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">Search by Order / Event ID</label>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Paste an ID…"
                  className="text-sm border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm px-3 py-2 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 placeholder-zinc-400"
                />
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Records', value: summary.count.toString(), icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'text-[#6262bd] bg-[#6262bd]/10' },
              { label: 'Total Value', value: fmt(summary.totalCents, formatCurrency), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'Cash', value: fmt(summary.cashCents, formatCurrency), icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30' },
              { label: 'Card', value: fmt(summary.cardCents, formatCurrency), icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' },
            ].map(card => (
              <div key={card.label} className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-sm ${card.color}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{card.label}</div>
                  <div className="text-base font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={exportCSV}
              disabled={exporting || filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:text-[#6262bd] transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={exportJSON}
              disabled={exporting || filtered.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:text-[#6262bd] transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Export JSON (Audit)
            </button>
          </div>

          {/* Records table */}
          <div className="bg-white dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 dark:text-zinc-500 dark:text-zinc-500">
                <div className="w-8 h-8 border-2 border-[#6262bd] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading records…
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium">No fiscal records found</p>
                <p className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mt-1">Adjust the date range or filters, or run the SQL migration first.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700">
                    <tr className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 text-left">
                      <th className="px-4 py-3 font-medium">Date / Time</th>
                      <th className="px-4 py-3 font-medium">Event ID</th>
                      <th className="px-4 py-3 font-medium">Order ID</th>
                      <th className="px-4 py-3 font-medium">Method</th>
                      <th className="px-4 py-3 font-medium text-right">Total</th>
                      <th className="px-4 py-3 font-medium">Lifecycle</th>
                      <th className="px-4 py-3 font-medium">Chain</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filtered.map(event => {
                      const isOpen = expandedId === event.id
                      return [
                        <tr
                          key={event.id}
                          onClick={() => setExpandedId(isOpen ? null : event.id)}
                          className="hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-100/50 dark:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 whitespace-nowrap">
                            {fmtDatetime(event.occurred_at)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
                            {shortId(event.id)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-500">
                            {shortId(event.order_id)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              event.payment_method === 'cash'
                                ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {event.payment_method === 'cash' ? 'Cash' : 'Card'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">
                            {fmt(event.total_cents || 0, formatCurrency)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              <SlotPill label="Auth" value={event.pre_authorisation} />
                              <SlotPill label="Sign" value={event.signing} />
                              <SlotPill label="Tx" value={event.transmission} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {/* We can't recompute the hash client-side without fetching the prev chain hash,
                                so we show a neutral indicator unless the hash fields are missing */}
                            <ChainBadge ok={event.chain_hash && event.content_hash ? null : false} />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <svg
                              className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </td>
                        </tr>,
                        isOpen && (
                          <tr key={`${event.id}-expanded`}>
                            <td colSpan={8} className="p-0">
                              <ExpandedRow event={event} formatCurrency={formatCurrency} />
                            </td>
                          </tr>
                        )
                      ]
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer note */}
          {filtered.length > 0 && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 text-center">
              Showing {filtered.length} record{filtered.length !== 1 ? 's' : ''} · JSON export includes full hash chain for legal / audit purposes
            </p>
          )}

        </div>
      </div>
    </OfflinePageGuard>
  )
}
