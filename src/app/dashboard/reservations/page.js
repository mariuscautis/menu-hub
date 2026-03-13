'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useOrderSounds } from '@/hooks/useOrderSounds'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'

export default function Reservations() {
  useModuleGuard('reservations')
  const t = useTranslations('reservations')
  const tc = useTranslations('common')
  const adminSupabase = useAdminSupabase()
  const [restaurant, setRestaurant] = useState(null)
  const [reservations, setReservations] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [userInfo, setUserInfo] = useState(null)

  // Filters
  const [timeScope, setTimeScope] = useState('upcoming')
  const [dateFilter, setDateFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [specificDate, setSpecificDate] = useState('')

  // Modals
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [availableTables, setAvailableTables] = useState([])
  const [selectedTable, setSelectedTable] = useState('')
  const [denyReason, setDenyReason] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  // Blocked dates
  const [blockedDates, setBlockedDates] = useState([])
  const [blockDateInput, setBlockDateInput] = useState('')
  const [savingBlockedDates, setSavingBlockedDates] = useState(false)

  // Customer ratings
  const [ratings, setRatings] = useState({}) // keyed by reservation_id
  const [pendingRating, setPendingRating] = useState(0) // 1-5 hover/selected
  const [ratingNote, setRatingNote] = useState('')
  const [savingRating, setSavingRating] = useState(false)
  const [customerStats, setCustomerStats] = useState(null) // { venueAvg, venueCount, overallAvg, overallCount }

  // Customer restrictions
  const [restriction, setRestriction] = useState(null) // { type, fee_amount, fee_currency } | null | 'none'
  const [restrictionMode, setRestrictionMode] = useState(null) // null | 'blocked' | 'fee_required'
  const [restrictionFee, setRestrictionFee] = useState('')
  const [savingRestriction, setSavingRestriction] = useState(false)

  // Notifications
  const [notification, setNotification] = useState(null)

  const realtimeChannelRef = useRef(null)
  const restaurantCtx = useRestaurant()

  // Sound notifications
  const { playNewReservationSound, resumeAudio, soundSettings } = useOrderSounds(restaurant?.id)
  const knownReservationIdsRef = useRef(new Set())
  const isInitialLoadRef = useRef(true)
  const playNewReservationSoundRef = useRef(playNewReservationSound)

  useEffect(() => {
    playNewReservationSoundRef.current = playNewReservationSound
  }, [playNewReservationSound])

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  const fetchRatings = useCallback(async (restaurantId) => {
    if (!restaurantId) return
    const { data, error } = await adminSupabase
      .from('customer_ratings')
      .select('reservation_id, rating, note, customer_id, customers(avg_rating, total_bookings)')
      .eq('restaurant_id', restaurantId)
    if (!error && data) {
      const map = {}
      data.forEach(r => { map[r.reservation_id] = r })
      setRatings(map)
    }
  }, [adminSupabase])

  const fetchReservations = useCallback(async (restaurantId) => {
    if (!restaurantId) return

    const { data, error } = await supabase
      .from('reservations')
      .select('*, tables(table_number)')
      .eq('restaurant_id', restaurantId)
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })

    if (!error && data) {
      data.forEach(reservation => {
        knownReservationIdsRef.current.add(reservation.id)
      })
      setReservations(data)
    }
  }, [])

  const fetchTables = useCallback(async (restaurantId) => {
    if (!restaurantId) return

    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number')

    if (!error && data) {
      setTables(data)
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!restaurantCtx?.restaurant) return

    const restaurantData = restaurantCtx.restaurant

    let userEmail = null
    let userName = 'Unknown'
    let userId = null

    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        userEmail = staffSession.email
        userName = staffSession.name
        userId = staffSession.id
      } catch {
        localStorage.removeItem('staff_session')
      }
    }

    setRestaurant(restaurantData)
    setUserInfo({ email: userEmail, name: userName, id: userId })
    setBlockedDates(restaurantData.reservation_settings?.blocked_dates || [])

    await Promise.all([
      fetchReservations(restaurantData.id),
      fetchTables(restaurantData.id),
      fetchRatings(restaurantData.id)
    ])

    setTimeout(() => {
      isInitialLoadRef.current = false
    }, 2000)

    setLoading(false)
  }, [restaurantCtx, fetchReservations, fetchTables, fetchRatings])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchCustomerStats = useCallback(async (customerId, restaurantId) => {
    if (!customerId) { setCustomerStats(null); return }
    const { data } = await adminSupabase
      .from('customer_ratings')
      .select('rating, restaurant_id')
      .eq('customer_id', customerId)
    if (!data) { setCustomerStats(null); return }
    const venue = data.filter(r => r.restaurant_id === restaurantId)
    const overall = data
    const avg = arr => arr.length ? (arr.reduce((s, r) => s + r.rating, 0) / arr.length).toFixed(1) : null
    setCustomerStats({
      venueAvg: avg(venue),
      venueCount: venue.length,
      overallAvg: avg(overall),
      overallCount: overall.length
    })
  }, [adminSupabase])

  const fetchRestriction = useCallback(async (customerId, restaurantId) => {
    if (!customerId) { setRestriction('none'); return }
    const { data } = await adminSupabase
      .from('customer_venue_restrictions')
      .select('type, fee_amount, fee_currency')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
    setRestriction(data || 'none')
    if (data) {
      setRestrictionMode(data.type)
      setRestrictionFee(data.fee_amount ? String(data.fee_amount) : '')
    } else {
      setRestrictionMode(null)
      setRestrictionFee('')
    }
  }, [adminSupabase])

  const saveRestriction = async (customerId, restaurantId, type, feeAmount) => {
    if (!customerId) return
    setSavingRestriction(true)
    try {
      if (!type) {
        // Lift restriction
        await adminSupabase
          .from('customer_venue_restrictions')
          .delete()
          .eq('customer_id', customerId)
          .eq('restaurant_id', restaurantId)
        setRestriction('none')
        setRestrictionMode(null)
        setRestrictionFee('')
        showNotification('success', 'Restriction removed.')
      } else {
        const payload = {
          customer_id: customerId,
          restaurant_id: restaurantId,
          type,
          fee_amount: type === 'fee_required' ? parseFloat(feeAmount) || null : null,
          fee_currency: restaurant?.currency || 'GBP',
        }
        const { error } = await adminSupabase
          .from('customer_venue_restrictions')
          .upsert(payload, { onConflict: 'customer_id,restaurant_id' })
        if (error) throw error
        setRestriction(payload)
        showNotification('success', type === 'blocked' ? 'Customer blocked from this venue.' : 'Booking deposit requirement saved.')
      }
    } catch (err) {
      console.error('saveRestriction error:', err)
      showNotification('error', 'Failed to save restriction.')
    } finally {
      setSavingRestriction(false)
    }
  }

  const saveRating = async (reservation, rating, note) => {
    if (!reservation.customer_id) {
      showNotification('error', 'No customer profile linked to this reservation.')
      return
    }
    setSavingRating(true)
    try {
      const { error } = await adminSupabase
        .from('customer_ratings')
        .upsert(
          {
            customer_id: reservation.customer_id,
            reservation_id: reservation.id,
            restaurant_id: restaurant.id,
            rating,
            note: note || null
          },
          { onConflict: 'reservation_id' }
        )
      if (error) throw error
      showNotification('success', 'Rating saved!')
      setRatings(prev => ({
        ...prev,
        [reservation.id]: { rating, note, customer_id: reservation.customer_id }
      }))
      setPendingRating(0)
      setRatingNote('')
      fetchCustomerStats(reservation.customer_id, restaurant.id)
    } catch (err) {
      console.error('saveRating error:', err)
      showNotification('error', 'Failed to save rating.')
    } finally {
      setSavingRating(false)
    }
  }

  // Auto-cancel no-shows
  useEffect(() => {
    if (!restaurant) return

    const runAutoCancel = async () => {
      try {
        const response = await fetch('/api/reservations/auto-cancel-no-shows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        if (response.ok) {
          const result = await response.json()
          if (result.cancelled > 0) {
            setTimeout(() => fetchReservations(restaurant.id), 500)
          }
        }
      } catch (err) {
        console.error(err)
      }
    }

    runAutoCancel()
  }, [restaurant, fetchReservations])

  // Realtime subscription
  useEffect(() => {
    if (!restaurant) return

    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }

    const restaurantId = restaurant.id

    const channel = supabase
      .channel(`reservations-realtime-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${restaurantId}` }, (payload) => {
        const newReservationId = payload.new?.id
        if (newReservationId && !knownReservationIdsRef.current.has(newReservationId)) {
          knownReservationIdsRef.current.add(newReservationId)
          if (!isInitialLoadRef.current) {
            playNewReservationSoundRef.current()
          }
        }
        setTimeout(() => fetchReservations(restaurantId), 100)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        setTimeout(() => fetchReservations(restaurantId), 100)
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reservations', filter: `restaurant_id=eq.${restaurantId}` }, () => {
        setTimeout(() => fetchReservations(restaurantId), 100)
      })
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurant, fetchReservations])

  const openConfirmModal = async (reservation) => {
    setSelectedReservation(reservation)
    setShowDetailModal(false)

    const isSingleArea = restaurant.reservation_settings?.single_booking_area === true

    if (isSingleArea) {
      // No table assignment needed — confirm immediately
      setAvailableTables([])
      setSelectedTable('')
      setShowConfirmModal(true)
      return
    }

    const { data: bookedTables } = await supabase
      .from('reservations')
      .select('table_id')
      .eq('restaurant_id', restaurant.id)
      .eq('reservation_date', reservation.reservation_date)
      .eq('reservation_time', reservation.reservation_time)
      .eq('status', 'confirmed')
      .not('table_id', 'is', null)

    const bookedIds = new Set(bookedTables?.map(r => r.table_id))
    const available = tables.filter(t => !bookedIds.has(t.id))

    setAvailableTables(available)
    setSelectedTable(available[0]?.id || '')
    setShowConfirmModal(true)
  }

  const saveBlockedDates = async (dates) => {
    setSavingBlockedDates(true)
    const updatedSettings = {
      ...(restaurant.reservation_settings || {}),
      blocked_dates: dates
    }
    const { error } = await adminSupabase
      .from('restaurants')
      .update({ reservation_settings: updatedSettings })
      .eq('id', restaurant.id)

    if (!error) {
      setRestaurant(r => ({ ...r, reservation_settings: updatedSettings }))
      setBlockedDates(dates)
    } else {
      showNotification('error', 'Failed to update blocked dates')
    }
    setSavingBlockedDates(false)
  }

  const toggleBlockedDate = (dateStr) => {
    const next = blockedDates.includes(dateStr)
      ? blockedDates.filter(d => d !== dateStr)
      : [...blockedDates, dateStr].sort()
    saveBlockedDates(next)
  }

  const confirmReservation = async () => {
    const isSingleArea = restaurant.reservation_settings?.single_booking_area === true
    if (!isSingleArea && !selectedTable) {
      showNotification('error', t('pleaseSelectTable'))
      return
    }

    setModalLoading(true)

    try {
      const staffSessionData = localStorage.getItem('staff_session')
      const isPinBasedLogin = !!staffSessionData

      const isSingleArea = restaurant.reservation_settings?.single_booking_area === true
      const response = await fetch('/api/reservations/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: selectedReservation.id,
          tableId: isSingleArea ? null : selectedTable,
          confirmedByStaffName: userInfo.name,
          confirmedByUserId: isPinBasedLogin ? null : userInfo.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        showNotification('error', result.error || t('failedToConfirm'))
        setModalLoading(false)
        return
      }

      fetch('/api/reservations/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: selectedReservation.id, isConfirmation: true })
      }).then(res => res.json()).catch(err => console.error(err))

      showNotification('success', t('reservationConfirmedSuccess'))
      setShowConfirmModal(false)
      setSelectedReservation(null)
      setSelectedTable('')
      fetchReservations(restaurant.id)
    } catch (error) {
      console.error('Error confirming reservation:', error)
      showNotification('error', error.message || t('failedToConfirm'))
    } finally {
      setModalLoading(false)
    }
  }

  const openDenyModal = (reservation) => {
    setSelectedReservation(reservation)
    setDenyReason('')
    setShowDetailModal(false)
    setShowDenyModal(true)
  }

  const denyReservation = async () => {
    if (!denyReason.trim()) {
      showNotification('error', t('pleaseProvideReason'))
      return
    }

    setModalLoading(true)

    try {
      const staffSessionData = localStorage.getItem('staff_session')
      const isPinBasedLogin = !!staffSessionData

      const { data, error } = await supabase.rpc('deny_reservation', {
        p_reservation_id: selectedReservation.id,
        p_denial_reason: denyReason,
        p_denied_by_staff_name: userInfo.name,
        p_denied_by_user_id: isPinBasedLogin ? null : userInfo.id
      })

      if (error) throw error
      if (data && !data.success) throw new Error(data.error || t('failedToDeny'))

      showNotification('success', t('reservationDenied'))
      setShowDenyModal(false)
      setDenyReason('')
      fetchReservations(restaurant.id)
    } catch (error) {
      console.error('Error denying reservation:', error)
      showNotification('error', error.message || t('failedToDeny'))
    } finally {
      setModalLoading(false)
    }
  }

  const filteredReservations = reservations.filter(r => {
    const resDate = new Date(r.reservation_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Time scope
    if (timeScope === 'upcoming' && resDate < today) return false
    if (timeScope === 'past' && resDate >= today) return false

    // Specific date picker
    if (specificDate) {
      const picked = new Date(specificDate)
      if (resDate.toDateString() !== picked.toDateString()) return false
    } else {
      // Date filter dropdown
      if (dateFilter === 'today') {
        if (resDate.toDateString() !== today.toDateString()) return false
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        if (resDate.toDateString() !== tomorrow.toDateString()) return false
      } else if (dateFilter === 'week') {
        if (timeScope === 'upcoming') {
          const weekFromNow = new Date(today)
          weekFromNow.setDate(weekFromNow.getDate() + 7)
          if (resDate < today || resDate > weekFromNow) return false
        } else {
          const weekAgo = new Date(today)
          weekAgo.setDate(weekAgo.getDate() - 7)
          if (resDate > today || resDate < weekAgo) return false
        }
      } else if (dateFilter === 'month') {
        if (timeScope === 'upcoming') {
          const monthFromNow = new Date(today)
          monthFromNow.setMonth(monthFromNow.getMonth() + 1)
          if (resDate < today || resDate > monthFromNow) return false
        } else {
          const monthAgo = new Date(today)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          if (resDate > today || resDate < monthAgo) return false
        }
      } else if (dateFilter === 'custom' && customDateRange.start && customDateRange.end) {
        const startDate = new Date(customDateRange.start)
        const endDate = new Date(customDateRange.end)
        if (resDate < startDate || resDate > endDate) return false
      }
    }

    // Status filter
    if (statusFilter !== 'all' && r.status !== statusFilter) return false

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const nameMatch = r.customer_name?.toLowerCase().includes(q)
      const emailMatch = r.customer_email?.toLowerCase().includes(q)
      const phoneMatch = r.customer_phone?.toLowerCase().includes(q)
      if (!nameMatch && !emailMatch && !phoneMatch) return false
    }

    return true
  })

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':    return { badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700', bar: 'bg-amber-400', dot: 'bg-amber-400' }
      case 'confirmed':  return { badge: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700', bar: 'bg-green-500', dot: 'bg-green-500' }
      case 'denied':     return { badge: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700', bar: 'bg-red-500', dot: 'bg-red-500' }
      case 'cancelled':  return { badge: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600', bar: 'bg-slate-400', dot: 'bg-slate-400' }
      case 'completed':  return { badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700', bar: 'bg-blue-500', dot: 'bg-blue-500' }
      case 'no_show':    return { badge: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700', bar: 'bg-purple-500', dot: 'bg-purple-500' }
      default:           return { badge: 'bg-slate-100 text-slate-600 border-slate-200', bar: 'bg-slate-400', dot: 'bg-slate-400' }
    }
  }

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: t('pending'), confirmed: t('confirmed'), completed: t('completed'),
      denied: t('denied'), cancelled: t('cancelled'), no_show: t('noShow')
    }
    return statusMap[status] || status
  }

  if (loading) return <div className="text-slate-500">{tc('loading')}</div>
  if (!restaurant) return <div className="text-red-600">No restaurant found</div>

  return (
    <div onClick={resumeAudio}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">{t('title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        {soundSettings?.enabled && soundSettings?.reservationSound !== 'silent' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <span>Sound alerts on</span>
          </div>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
          notification.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
          ) : (
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          )}
          <span className={notification.type === 'success' ? 'text-green-700' : 'text-red-700'}>{notification.message}</span>
        </div>
      )}

      {/* Block a date panel */}
      <div className="mb-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">Block a date</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Stop taking new bookings for a specific date. Existing reservations are unaffected.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0]
              const isTodayBlocked = blockedDates.includes(todayStr)
              return (
                <button
                  disabled={savingBlockedDates}
                  onClick={() => toggleBlockedDate(todayStr)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-colors disabled:opacity-50 ${
                    isTodayBlocked
                      ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                      : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300'
                  }`}
                >
                  {isTodayBlocked ? '✓ Today unblocked' : 'Block today'}
                </button>
              )
            })()}
            <input
              type="date"
              value={blockDateInput}
              onChange={e => setBlockDateInput(e.target.value)}
              className="px-3 py-2 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
            />
            <button
              disabled={!blockDateInput || savingBlockedDates}
              onClick={() => { if (blockDateInput) { toggleBlockedDate(blockDateInput); setBlockDateInput('') } }}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {blockedDates.includes(blockDateInput) ? 'Unblock' : 'Block'}
            </button>
          </div>
        </div>
        {blockedDates.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
            {blockedDates.map(d => (
              <div key={d} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-1.5">
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <button
                  onClick={() => toggleBlockedDate(d)}
                  disabled={savingBlockedDates}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-200 disabled:opacity-50"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time Scope Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => { setTimeScope('upcoming'); setDateFilter('all'); setSpecificDate('') }}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            timeScope === 'upcoming' ? 'bg-[#6262bd] text-white' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          {t('upcomingReservations')}
        </button>
        <button
          onClick={() => { setTimeScope('past'); setDateFilter('all'); setSpecificDate('') }}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            timeScope === 'past' ? 'bg-[#6262bd] text-white' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
        >
          {t('pastReservations')}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6">
        <div className="grid md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, email, phone…"
                className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
              />
            </div>
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('date')}</label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => { setSpecificDate(e.target.value); setDateFilter('all') }}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
            />
          </div>

          {/* Date range dropdown */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('dateRange')}</label>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setSpecificDate('') }}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
            >
              <option value="all">{t('allDates')}</option>
              <option value="today">{t('today')}</option>
              <option value="tomorrow">{t('tomorrow')}</option>
              <option value="week">{timeScope === 'upcoming' ? t('next7Days') : t('last7Days')}</option>
              <option value="month">{timeScope === 'upcoming' ? t('next30Days') : t('last30Days')}</option>
              <option value="custom">{t('customRange')}</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="pending">{t('pending')}</option>
              <option value="confirmed">{t('confirmed')}</option>
              <option value="completed">{t('completed')}</option>
              <option value="denied">{t('denied')}</option>
              <option value="cancelled">{t('cancelled')}</option>
              <option value="no_show">{t('noShow')}</option>
            </select>
          </div>
        </div>

        {/* Custom date range */}
        {dateFilter === 'custom' && (
          <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('startDate')}</label>
              <input type="date" value={customDateRange.start} onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('endDate')}</label>
              <input type="date" value={customDateRange.end} onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })} className="w-full px-4 py-2.5 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700" />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-800 px-4 py-2 rounded-xl">
            <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{reservations.filter(r => r.status === 'pending').length}</div>
            <div className="text-xs text-amber-600 dark:text-amber-500">{t('pending')}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-800 px-4 py-2 rounded-xl">
            <div className="text-xl font-bold text-green-700 dark:text-green-400">{reservations.filter(r => r.status === 'confirmed').length}</div>
            <div className="text-xs text-green-600 dark:text-green-500">{t('confirmed')}</div>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center ml-auto">
            {filteredReservations.length} result{filteredReservations.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Reservations Tile Grid */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
            </svg>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-1">{t('noReservationsFound')}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{t('adjustFilters')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReservations.map((reservation) => {
            const sc = getStatusConfig(reservation.status)
            return (
              <button
                key={reservation.id}
                onClick={() => { setSelectedReservation(reservation); setShowDetailModal(true); fetchCustomerStats(reservation.customer_id, restaurant.id); fetchRestriction(reservation.customer_id, restaurant.id) }}
                className="text-left bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden hover:border-[#6262bd]/40 hover:shadow-md transition-all group focus:outline-none focus:border-[#6262bd]"
              >
                {/* Colour bar */}
                <div className={`h-1.5 w-full ${sc.bar}`} />

                <div className="p-5">
                  {/* Name + status badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight group-hover:text-[#6262bd] transition-colors truncate">
                      {reservation.customer_name}
                    </h3>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold border ${sc.badge}`}>
                      {getStatusLabel(reservation.status)}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-2">
                    <svg className="w-4 h-4 text-[#6262bd] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
                    </svg>
                    <span className="font-medium">
                      {new Date(reservation.reservation_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-2">
                    <svg className="w-4 h-4 text-[#6262bd] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <span className="font-medium">{reservation.reservation_time.substring(0, 5)}</span>
                  </div>

                  {/* Party size */}
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                    <svg className="w-4 h-4 text-[#6262bd] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    <span className="font-medium">{reservation.party_size} {reservation.party_size === 1 ? t('guest') : t('guests')}</span>
                  </div>

                  {/* Footer: pending indicator or customer rating */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    {reservation.status === 'pending' ? (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Awaiting action
                      </div>
                    ) : ratings[reservation.id] ? (
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} className={`w-3.5 h-3.5 ${s <= ratings[reservation.id].rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                          </svg>
                        ))}
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{ratings[reservation.id].rating}/5</span>
                      </div>
                    ) : reservation.customer_id ? (
                      <div className="text-xs text-slate-400 dark:text-slate-500 italic">No rating yet</div>
                    ) : null}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReservation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          onClick={() => { setShowDetailModal(false); setSelectedReservation(null); setPendingRating(0); setRatingNote(''); setCustomerStats(null); setRestriction(null); setRestrictionMode(null); setRestrictionFee('') }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal colour bar */}
            <div className={`h-2 w-full ${getStatusConfig(selectedReservation.status).bar}`} />

            <div className="p-8">
              {/* Modal header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{selectedReservation.customer_name}</h2>
                  <span className={`inline-block mt-1 px-3 py-0.5 rounded-lg text-xs font-bold border ${getStatusConfig(selectedReservation.status).badge}`}>
                    {getStatusLabel(selectedReservation.status)}
                  </span>
                </div>
                <button
                  onClick={() => { setShowDetailModal(false); setSelectedReservation(null); setPendingRating(0); setRatingNote(''); setCustomerStats(null); setRestriction(null); setRestrictionMode(null); setRestrictionFee('') }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('date')}</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(selectedReservation.reservation_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('time')}</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedReservation.reservation_time.substring(0, 5)}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('partySize')}</div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedReservation.party_size} {selectedReservation.party_size === 1 ? t('guest') : t('guests')}</div>
                </div>
                {selectedReservation.table_id && (
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t('table')}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">#{selectedReservation.tables?.table_number}</div>
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  <span>{selectedReservation.customer_email}</span>
                </div>
                {selectedReservation.customer_phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                    <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    <span>{selectedReservation.customer_phone}</span>
                  </div>
                )}
              </div>

              {/* Special requests */}
              {selectedReservation.special_requests && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">{t('specialRequests')}</div>
                  <p className="text-sm text-blue-800 dark:text-blue-300">{selectedReservation.special_requests}</p>
                </div>
              )}

              {/* Staff metadata */}
              {(selectedReservation.confirmed_by_staff_name || selectedReservation.denied_by_staff_name || selectedReservation.cancellation_reason) && (
                <div className="mb-6 space-y-2 text-sm">
                  {selectedReservation.confirmed_by_staff_name && (
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                      <span><strong>{t('confirmedBy')}</strong> {selectedReservation.confirmed_by_staff_name}{selectedReservation.confirmed_at && ` · ${new Date(selectedReservation.confirmed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}</span>
                    </div>
                  )}
                  {selectedReservation.denied_by_staff_name && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                        <span><strong>{t('deniedBy')}</strong> {selectedReservation.denied_by_staff_name}{selectedReservation.denied_at && ` · ${new Date(selectedReservation.denied_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}</span>
                      </div>
                      {selectedReservation.denied_reason && (
                        <div className="text-red-600 dark:text-red-400 pl-6"><strong>{t('reason')}:</strong> {selectedReservation.denied_reason}</div>
                      )}
                    </div>
                  )}
                  {selectedReservation.status === 'cancelled' && selectedReservation.cancellation_reason && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                      <span><strong>{t('cancelledLabel')}:</strong> {selectedReservation.cancellation_reason}{selectedReservation.cancelled_at && ` · ${new Date(selectedReservation.cancelled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Pending actions */}
              {selectedReservation.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => openConfirmModal(selectedReservation)}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
                  >
                    {t('confirm')}
                  </button>
                  <button
                    onClick={() => openDenyModal(selectedReservation)}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 transition-colors"
                  >
                    {t('deny')}
                  </button>
                </div>
              )}

              {/* Customer rating — shown for completed/confirmed/no_show */}
              {['completed', 'confirmed', 'no_show'].includes(selectedReservation.status) && selectedReservation.customer_id && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                  {/* Customer trust stats */}
                  {customerStats && (customerStats.venueCount > 0 || customerStats.overallCount > 0) && (
                    <div className="mb-4 grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Your venue</div>
                        {customerStats.venueAvg ? (
                          <>
                            <div className="text-lg font-bold text-amber-500">{customerStats.venueAvg}★</div>
                            <div className="text-xs text-slate-400">{customerStats.venueCount} visit{customerStats.venueCount !== 1 ? 's' : ''}</div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400">No rating yet</div>
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Overall rating</div>
                        {customerStats.overallAvg ? (
                          <>
                            <div className="text-lg font-bold text-purple-500">{customerStats.overallAvg}★</div>
                            <div className="text-xs text-slate-400">{customerStats.overallCount} visit{customerStats.overallCount !== 1 ? 's' : ''}</div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400">No rating yet</div>
                        )}
                      </div>
                    </div>
                  )}
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    {ratings[selectedReservation.id] ? 'Rate this visit' : 'Rate this customer'}
                  </h3>

                  {ratings[selectedReservation.id] ? (
                    /* Existing rating — show + allow edit */
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        {[1,2,3,4,5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setPendingRating(s)
                              saveRating(selectedReservation, s, ratings[selectedReservation.id]?.note || '')
                            }}
                            disabled={savingRating}
                            className="focus:outline-none disabled:opacity-50"
                          >
                            <svg className={`w-6 h-6 ${s <= ratings[selectedReservation.id].rating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                          </button>
                        ))}
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400 ml-1">{ratings[selectedReservation.id].rating}/5</span>
                      </div>
                      {ratings[selectedReservation.id].note && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 italic">"{ratings[selectedReservation.id].note}"</p>
                      )}
                    </div>
                  ) : (
                    /* New rating form */
                    <div className="space-y-3">
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setPendingRating(s)}
                            className="focus:outline-none"
                          >
                            <svg className={`w-8 h-8 transition-colors ${s <= pendingRating ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600 hover:text-amber-300'}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                            </svg>
                          </button>
                        ))}
                      </div>
                      {pendingRating > 0 && (
                        <>
                          <textarea
                            value={ratingNote}
                            onChange={(e) => setRatingNote(e.target.value)}
                            rows={2}
                            placeholder="Optional note (e.g. no-show, great guest, rude behaviour...)"
                            className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm resize-none"
                          />
                          <button
                            onClick={() => saveRating(selectedReservation, pendingRating, ratingNote)}
                            disabled={savingRating}
                            className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                          >
                            {savingRating ? 'Saving...' : `Save ${pendingRating}-star rating`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Customer restriction panel — shown for any reservation with a customer_id */}
              {selectedReservation.customer_id && restriction !== null && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Booking restrictions</h3>

                  {/* Current status badge */}
                  {restriction && restriction !== 'none' && !restrictionMode && (
                    <div className={`rounded-xl p-3 mb-3 border flex items-center justify-between ${
                      restriction.type === 'blocked'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    }`}>
                      <p className={`text-sm font-semibold ${restriction.type === 'blocked' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {restriction.type === 'blocked' ? '🚫 Blocked' : `💳 Deposit: ${restriction.fee_currency || 'GBP'} ${Number(restriction.fee_amount).toFixed(2)}`}
                      </p>
                      <span className="text-xs text-slate-400">Future bookings</span>
                    </div>
                  )}

                  {/* Action buttons — always shown, highlight current state */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={() => setRestrictionMode(m => m === 'blocked' ? null : 'blocked')}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                        restrictionMode === 'blocked' || (restriction && restriction !== 'none' && restriction.type === 'blocked' && !restrictionMode)
                          ? 'bg-red-600 border-red-600 text-white'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-red-300 hover:text-red-600'
                      }`}
                    >
                      🚫 Block
                    </button>
                    <button
                      onClick={() => {
                        setRestrictionMode(m => m === 'fee_required' ? null : 'fee_required')
                        if (restriction && restriction !== 'none' && restriction.type === 'fee_required') {
                          setRestrictionFee(String(restriction.fee_amount || ''))
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-sm font-medium border-2 transition-colors ${
                        restrictionMode === 'fee_required' || (restriction && restriction !== 'none' && restriction.type === 'fee_required' && !restrictionMode)
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-amber-300 hover:text-amber-600'
                      }`}
                    >
                      💳 Deposit
                    </button>
                  </div>

                  {restrictionMode === 'blocked' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => saveRestriction(selectedReservation.customer_id, restaurant.id, 'blocked', null)}
                        disabled={savingRestriction}
                        className="w-full bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        {savingRestriction ? 'Saving...' : 'Confirm block'}
                      </button>
                    </div>
                  )}

                  {restrictionMode === 'fee_required' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">Amount</span>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={restrictionFee}
                          onChange={e => setRestrictionFee(e.target.value)}
                          placeholder="e.g. 20"
                          className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#6262bd]"
                        />
                      </div>
                      <button
                        onClick={() => saveRestriction(selectedReservation.customer_id, restaurant.id, 'fee_required', restrictionFee)}
                        disabled={savingRestriction || !restrictionFee}
                        className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                      >
                        {savingRestriction ? 'Saving...' : 'Save deposit'}
                      </button>
                    </div>
                  )}

                  {restriction && restriction !== 'none' && (
                    <button
                      onClick={() => saveRestriction(selectedReservation.customer_id, restaurant.id, null)}
                      disabled={savingRestriction}
                      className="w-full mt-2 text-xs text-slate-400 hover:text-red-500 underline disabled:opacity-50"
                    >
                      Remove all restrictions
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && selectedReservation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          onClick={() => { setShowConfirmModal(false); setSelectedReservation(null); setSelectedTable('') }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">{t('confirmReservation')}</h2>
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                <strong>{selectedReservation.customer_name}</strong> — {selectedReservation.party_size} {selectedReservation.party_size === 1 ? t('guest') : t('guests')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {new Date(selectedReservation.reservation_date).toLocaleDateString()} at {selectedReservation.reservation_time.substring(0, 5)}
              </p>
            </div>
            {restaurant?.reservation_settings?.single_booking_area ? null : (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('assignTable')} *</label>
                {availableTables.length === 0 ? (
                  <p className="text-red-600 dark:text-red-400 text-sm">{t('noAvailableTables')}</p>
                ) : (
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  >
                    {availableTables.map((table) => (
                      <option key={table.id} value={table.id}>{t('table')} {table.table_number}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowConfirmModal(false); setSelectedReservation(null); setSelectedTable('') }}
                className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmReservation}
                disabled={modalLoading || (!restaurant?.reservation_settings?.single_booking_area && !selectedTable)}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {modalLoading ? t('confirming') : t('confirmReservation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && selectedReservation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          onClick={() => { setShowDenyModal(false); setDenyReason('') }}
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">{t('denyReservation')}</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('reasonForDenying')} *</label>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                placeholder={t('reasonPlaceholder')}
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDenyModal(false); setDenyReason('') }}
                className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('cancel')}
              </button>
              <button
                onClick={denyReservation}
                disabled={modalLoading || !denyReason.trim()}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {modalLoading ? t('denying') : t('denyReservation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
