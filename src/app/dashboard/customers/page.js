'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import { useTranslations, useLanguage } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'
import OfflinePageGuard from '@/components/OfflinePageGuard'

const RESTRICTION_LABELS = {
  blocked:      { label: 'Blocked',  cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' },
  fee_required: { label: 'Deposit',  cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
}

function Stars({ value }) {
  if (!value) return <span className="text-zinc-400 dark:text-zinc-500 text-xs">—</span>
  return (
    <span className="text-amber-500 font-semibold text-sm">{Number(value).toFixed(1)}★</span>
  )
}

export default function CustomersPage() {
  useModuleGuard('reservations')
  const restaurantCtx = useRestaurant()
  const restaurant = restaurantCtx?.restaurant
  const adminSupabase = useAdminSupabase()
  const t = useTranslations('customers')
  const tg = useTranslations('guide')
  const { locale } = useLanguage()

  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRestriction, setFilterRestriction] = useState('all') // all | blocked | fee_required | none

  // Selected customer side panel
  const [selected, setSelected] = useState(null) // full customer object
  const [bookingHistory, setBookingHistory] = useState([])
  const [venueReviews, setVenueReviews] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [showVenueReviews, setShowVenueReviews] = useState(false)

  // Peer reviews drawer
  const [peerReviews, setPeerReviews] = useState(null) // null = closed, [] = loaded
  const [loadingPeerReviews, setLoadingPeerReviews] = useState(false)

  // Restriction editing
  const [restrictionMode, setRestrictionMode] = useState(null)
  const [restrictionFee, setRestrictionFee] = useState('')
  const [savingRestriction, setSavingRestriction] = useState(false)

  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchCustomers = useCallback(async () => {
    if (!restaurant?.id) return
    setLoading(true)

    // Fetch restrictions first — these may include customers with no completed booking yet
    const { data: restrictions } = await adminSupabase
      .from('customer_venue_restrictions')
      .select('customer_id, type, fee_amount, fee_currency')
      .eq('restaurant_id', restaurant.id)

    // Get all customers who have booked this venue (customer_id present)
    const { data: reservations } = await adminSupabase
      .from('reservations')
      .select('customer_id, customer_name, customer_phone, customer_email')
      .eq('restaurant_id', restaurant.id)
      .not('customer_id', 'is', null)

    // Build the union of customer IDs: from reservations + from restrictions
    const reservationCustomerIds = new Set((reservations || []).map(r => r.customer_id))
    const restrictionCustomerIds = new Set((restrictions || []).map(r => r.customer_id))
    const allCustomerIds = [...new Set([...reservationCustomerIds, ...restrictionCustomerIds])]

    if (!allCustomerIds.length) { setCustomers([]); setLoading(false); return }

    // Fetch customer records
    const { data: customerRows } = await adminSupabase
      .from('customers')
      .select('id, phone, name, email, total_bookings')
      .in('id', allCustomerIds)

    // Fetch venue-specific ratings for avg
    const { data: venueRatings } = await adminSupabase
      .from('customer_ratings')
      .select('customer_id, rating')
      .eq('restaurant_id', restaurant.id)
      .in('customer_id', allCustomerIds)

    // Fetch same-category peer ratings via API (needs service role to bypass RLS)
    let avgMap = {}
    let categoryVisitMap = {}
    if (restaurant.industry_category && allCustomerIds.length) {
      try {
        const { data: { session } } = await adminSupabase.auth.getSession()
        const token = session?.access_token
        if (token) {
          const res = await fetch('/api/customers/peer-ratings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ restaurantId: restaurant.id, customerIds: allCustomerIds })
          })
          if (res.ok) {
            const json = await res.json()
            avgMap = json.avgMap || {}
            categoryVisitMap = json.visitMap || {}
          }
        }
      } catch (e) {
        console.error('peer-ratings fetch error:', e)
      }
    }

    // Build venue avg map
    const venueRatingMap = {}
    venueRatings?.forEach(r => {
      if (!venueRatingMap[r.customer_id]) venueRatingMap[r.customer_id] = []
      venueRatingMap[r.customer_id].push(r.rating)
    })

    // Build restriction map
    const restrictionMap = {}
    restrictions?.forEach(r => { restrictionMap[r.customer_id] = r })

    // Build booking count per customer at this venue
    const bookingCountMap = {}
    ;(reservations || []).forEach(r => {
      bookingCountMap[r.customer_id] = (bookingCountMap[r.customer_id] || 0) + 1
    })

    const combined = (customerRows || []).map(c => {
      const vr = venueRatingMap[c.id] || []
      const venueAvg = vr.length ? (vr.reduce((s, v) => s + v, 0) / vr.length).toFixed(1) : null
      const categoryAvg = avgMap[c.id] || null
      const categoryVisits = categoryVisitMap[c.id] || null
      return {
        ...c,
        venueBookings: bookingCountMap[c.id] || 0,
        venueAvg,
        categoryAvg,
        categoryVisits,
        restriction: restrictionMap[c.id] || null,
      }
    })

    // Sort by most venue bookings
    combined.sort((a, b) => b.venueBookings - a.venueBookings)
    setCustomers(combined)
    setLoading(false)
  }, [restaurant?.id, adminSupabase])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  const openPeerReviews = async (customer) => {
    setLoadingPeerReviews(true)
    setPeerReviews([])
    const { data: { session } } = await adminSupabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setLoadingPeerReviews(false); return }
    try {
      const res = await fetch(
        `/api/customers/peer-ratings?restaurantId=${restaurant.id}&customerId=${customer.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const json = await res.json()
      setPeerReviews(json.reviews || [])
    } catch {
      setPeerReviews([])
    } finally {
      setLoadingPeerReviews(false)
    }
  }

  const openCustomer = async (customer) => {
    setSelected(customer)
    setRestrictionMode(null)
    setRestrictionFee(customer.restriction?.fee_amount ? String(customer.restriction.fee_amount) : '')
    setLoadingHistory(true)
    setVenueReviews([])
    setShowVenueReviews(false)
    setPeerReviews(null)

    const [{ data: bookings }, { data: ratings }] = await Promise.all([
      adminSupabase
        .from('reservations')
        .select('id, reservation_date, reservation_time, party_size, status')
        .eq('restaurant_id', restaurant.id)
        .eq('customer_id', customer.id)
        .order('reservation_date', { ascending: false })
        .limit(20),
      adminSupabase
        .from('customer_ratings')
        .select('reservation_id, rating, note, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    setBookingHistory(bookings || [])
    setVenueReviews(ratings || [])
    setLoadingHistory(false)
  }

  const saveRestriction = async (customerId, type, feeAmount) => {
    setSavingRestriction(true)
    try {
      if (!type) {
        await adminSupabase
          .from('customer_venue_restrictions')
          .delete()
          .eq('customer_id', customerId)
          .eq('restaurant_id', restaurant.id)

        const updated = { ...selected, restriction: null }
        setSelected(updated)
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, restriction: null } : c))
        setRestrictionMode(null)
        showNotification('success', t('restrictionRemoved'))
      } else {
        const payload = {
          customer_id:   customerId,
          restaurant_id: restaurant.id,
          type,
          fee_amount:    type === 'fee_required' ? parseFloat(feeAmount) || null : null,
          fee_currency:  'GBP',
        }
        const { error } = await adminSupabase
          .from('customer_venue_restrictions')
          .upsert(payload, { onConflict: 'customer_id,restaurant_id' })
        if (error) throw error

        const updated = { ...selected, restriction: payload }
        setSelected(updated)
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, restriction: payload } : c))
        setRestrictionMode(null)
        showNotification('success', type === 'blocked' ? t('customerBlocked') : t('depositSaved'))
      }
    } catch (err) {
      console.error('saveRestriction error:', err)
      showNotification('error', t('failedToSave'))
    } finally {
      setSavingRestriction(false)
    }
  }

  const filtered = customers.filter(c => {
    if (filterRestriction === 'blocked'      && c.restriction?.type !== 'blocked')      return false
    if (filterRestriction === 'fee_required' && c.restriction?.type !== 'fee_required') return false
    if (filterRestriction === 'none'         && c.restriction)                           return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const statusColour = (status) => {
    const map = {
      pending:   'bg-amber-100 text-amber-700',
      confirmed: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      denied:    'bg-red-100 text-red-700',
      cancelled: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
      no_show:   'bg-purple-100 text-purple-700',
    }
    return map[status] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
  }

  if (loading) return <div className="text-zinc-500 dark:text-zinc-400 p-8">{t('loadingCustomers')}</div>

  return (
    <OfflinePageGuard>
    <div className="flex h-full gap-0">
      {/* Main list */}
      <div className={`flex-1 min-w-0 ${selected ? 'hidden md:block' : ''}`}>
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 flex items-center gap-2">
              {t('title')}
              <InfoTooltip text={tg('customers_desc')} />
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 text-sm mt-1">{t('subtitle', { count: customers.length })}</p>
          </div>
        </div>

        {notification && (
          <div className={`mb-4 p-3 rounded-sm border flex items-center gap-2 text-sm ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex gap-3 flex-wrap sm:flex-nowrap">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 min-w-48 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 rounded-sm text-sm focus:outline-none focus:border-[#6262bd]"
          />
          <select
            value={filterRestriction}
            onChange={e => setFilterRestriction(e.target.value)}
            className="w-full sm:w-auto px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 rounded-sm text-sm focus:outline-none focus:border-[#6262bd]"
          >
            <option value="all">{t('allCustomers')}</option>
            <option value="blocked">{t('blocked')}</option>
            <option value="fee_required">{t('depositRequired')}</option>
            <option value="none">{t('noRestriction')}</option>
          </select>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">{t('noCustomersFound')}</div>
        ) : (
          <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 text-left">
                  <th className="px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('colCustomer')}</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 hidden sm:table-cell">{t('colPhone')}</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 text-center hidden sm:table-cell">{t('colVisits')}</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 text-center hidden md:table-cell">{t('colYourRating')}</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 text-center hidden md:table-cell">{t('colOverall')}</th>
                  <th className="px-4 py-3 font-semibold text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, i) => {
                  const restr = customer.restriction
                  return (
                    <tr
                      key={customer.id}
                      onClick={() => openCustomer(customer)}
                      className={`border-b border-zinc-100 dark:border-zinc-800/50 dark:border-zinc-700/50 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700/30 cursor-pointer transition-colors ${
                        selected?.id === customer.id ? 'bg-[#6262bd]/5 dark:bg-[#6262bd]/10' : ''
                      } ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{customer.name || '—'}</div>
                        {customer.email && <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate max-w-40">{customer.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 hidden sm:table-cell">{customer.phone}</td>
                      <td className="px-4 py-3 text-center font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 hidden sm:table-cell">{customer.venueBookings}</td>
                      <td className="px-4 py-3 text-center hidden md:table-cell"><Stars value={customer.venueAvg} /></td>
                      <td className="px-4 py-3 text-center hidden md:table-cell"><Stars value={customer.categoryAvg} /></td>
                      <td className="px-4 py-3">
                        {restr ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold border ${RESTRICTION_LABELS[restr.type]?.cls}`}>
                            {restr.type === 'blocked' ? `🚫 ${t('blocked')}` : `💳 ${restr.fee_currency || 'GBP'} ${Number(restr.fee_amount).toFixed(0)}`}
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Side panel */}
      {selected && (
        <div className="w-full md:w-96 md:ml-6 flex-shrink-0">
          <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm overflow-hidden sticky top-4">
            {/* Header */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{selected.name || t('unknown')}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5">{selected.phone}</p>
                {selected.email && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{selected.email}</p>}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 p-1"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 divide-x divide-zinc-200 dark:divide-zinc-800 dark:divide-slate-700 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700">
              <button
                onClick={() => { setShowVenueReviews(v => !v); setPeerReviews(null) }}
                className="p-4 text-center hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700/30 transition-colors group"
              >
                <div className="text-xl font-bold text-amber-500">{selected.venueAvg ? `${selected.venueAvg}★` : '—'}</div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t('yourVenue')}</div>
                <div className="text-xs text-slate-300 mt-0.5">{selected.venueBookings} {selected.venueBookings === 1 ? t('visit') : t('visits')}</div>
                <div className="text-xs text-amber-400 mt-1 group-hover:underline">
                  {showVenueReviews ? t('hideReviews') : t('seeReviews')}
                </div>
              </button>
              <button
                onClick={() => { setShowVenueReviews(false); peerReviews === null ? openPeerReviews(selected) : setPeerReviews(null) }}
                className="p-4 text-center hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700/30 transition-colors group"
              >
                <div className="text-xl font-bold text-purple-500">{selected.categoryAvg ? `${selected.categoryAvg}★` : '—'}</div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{t('overallRating')}</div>
                {selected.categoryVisits != null && (
                  <div className="text-xs text-slate-300 mt-0.5">{selected.categoryVisits} {selected.categoryVisits === 1 ? t('visit') : t('visits')}</div>
                )}
                <div className="text-xs text-purple-400 mt-1 group-hover:underline">
                  {peerReviews !== null ? t('hideReviews') : t('seeReviews')}
                </div>
              </button>
            </div>

            {/* Venue reviews drawer */}
            {showVenueReviews && (
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 bg-amber-50/50 dark:bg-amber-900/10">
                <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-3">{t('yourVenueReviews')}</h3>
                {loadingHistory ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('loading')}</p>
                ) : venueReviews.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('noReviewsYet')}</p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto">
                    {venueReviews.map(r => {
                      const booking = bookingHistory.find(b => b.id === r.reservation_id)
                      return (
                        <div key={r.reservation_id || r.created_at} className="rounded-sm bg-white dark:bg-zinc-800 border border-amber-100 dark:border-amber-800/40 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(star => (
                                <svg key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'text-amber-400' : 'text-slate-300 dark:text-zinc-600 dark:text-zinc-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                                </svg>
                              ))}
                            </div>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                              {booking
                                ? new Date(booking.reservation_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
                                : new Date(r.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          {r.note ? (
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 leading-relaxed">{r.note}</p>
                          ) : (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">{t('noNoteLeft')}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Peer reviews drawer */}
            {peerReviews !== null && (
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 bg-purple-50/50 dark:bg-purple-900/10">
                <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-3">{t('peerReviews')}</h3>
                {loadingPeerReviews ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('loading')}</p>
                ) : peerReviews.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('noPeerReviews')}</p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto">
                    {peerReviews.map((r, i) => (
                      <div key={i} className="rounded-sm bg-white dark:bg-zinc-800 border border-purple-100 dark:border-purple-800/40 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(star => (
                              <svg key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'text-amber-400' : 'text-slate-300 dark:text-zinc-600 dark:text-zinc-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {new Date(r.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 truncate">{r.venue_name}</p>
                        {r.note ? (
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mt-1 leading-relaxed">{r.note}</p>
                        ) : (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic mt-1">{t('noNoteLeft')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Restriction management */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-3">{t('bookingRestriction')}</h3>

              {/* Current restriction badge */}
              {selected.restriction && !restrictionMode && (
                <div className={`rounded-sm p-3 mb-3 border flex items-center justify-between ${
                  selected.restriction.type === 'blocked'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                }`}>
                  <p className={`text-sm font-semibold ${selected.restriction.type === 'blocked' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                    {selected.restriction.type === 'blocked'
                      ? t('blockedFromVenue')
                      : `${t('deposit')} ${selected.restriction.fee_currency || 'GBP'} ${Number(selected.restriction.fee_amount).toFixed(2)}`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  onClick={() => setRestrictionMode(m => m === 'blocked' ? null : 'blocked')}
                  className={`py-2.5 px-3 rounded-sm text-sm font-medium border-2 transition-colors ${
                    restrictionMode === 'blocked' || (selected.restriction?.type === 'blocked' && !restrictionMode)
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  {t('blockBtn')}
                </button>
                <button
                  onClick={() => {
                    setRestrictionMode(m => m === 'fee_required' ? null : 'fee_required')
                    if (selected.restriction?.type === 'fee_required') {
                      setRestrictionFee(String(selected.restriction.fee_amount || ''))
                    }
                  }}
                  className={`py-2.5 px-3 rounded-sm text-sm font-medium border-2 transition-colors ${
                    restrictionMode === 'fee_required' || (selected.restriction?.type === 'fee_required' && !restrictionMode)
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  {t('depositBtn')}
                </button>
              </div>

              {restrictionMode === 'blocked' && (
                <button
                  onClick={() => saveRestriction(selected.id, 'blocked', null)}
                  disabled={savingRestriction}
                  className="w-full bg-red-600 text-white py-2.5 rounded-sm text-sm font-medium hover:bg-red-700 disabled:opacity-50 mb-2"
                >
                  {savingRestriction ? t('saving') : t('confirmBlock')}
                </button>
              )}

              {restrictionMode === 'fee_required' && (
                <div className="space-y-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 whitespace-nowrap">{t('amount')}</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={restrictionFee}
                      onChange={e => setRestrictionFee(e.target.value)}
                      placeholder="e.g. 20"
                      className="flex-1 px-3 py-2 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 rounded-sm text-sm focus:outline-none focus:border-[#6262bd]"
                    />
                  </div>
                  <button
                    onClick={() => saveRestriction(selected.id, 'fee_required', restrictionFee)}
                    disabled={savingRestriction || !restrictionFee}
                    className="w-full bg-amber-500 text-white py-2.5 rounded-sm text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                  >
                    {savingRestriction ? t('saving') : t('saveDeposit')}
                  </button>
                </div>
              )}

              {selected.restriction && (
                <button
                  onClick={() => saveRestriction(selected.id, null)}
                  disabled={savingRestriction}
                  className="w-full text-xs text-zinc-400 dark:text-zinc-500 hover:text-red-500 underline disabled:opacity-50"
                >
                  {t('removeAllRestrictions')}
                </button>
              )}
            </div>

            {/* Booking history */}
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-3">{t('bookingHistory')}</h3>
              {loadingHistory ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('loading')}</p>
              ) : bookingHistory.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500">{t('noBookingsFound')}</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {bookingHistory.map(b => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-2 border-b border-zinc-100 dark:border-zinc-800/50 dark:border-zinc-700/50 last:border-b-0">
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">
                          {new Date(b.reservation_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-zinc-400 dark:text-zinc-500 ml-2">{b.reservation_time?.substring(0, 5)} · {b.party_size} {b.party_size === 1 ? t('guest') : t('guests')}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-sm font-semibold capitalize ${statusColour(b.status)}`}>{b.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-2" />
          </div>
        </div>
      )}
    </div>
    </OfflinePageGuard>
  )
}
