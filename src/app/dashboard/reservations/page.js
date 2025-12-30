'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function Reservations() {
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

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDenyModal, setShowDenyModal] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState(null)
  const [availableTables, setAvailableTables] = useState([])
  const [selectedTable, setSelectedTable] = useState('')
  const [denyReason, setDenyReason] = useState('')
  const [modalLoading, setModalLoading] = useState(false)

  // Notifications
  const [notification, setNotification] = useState(null)

  const realtimeChannelRef = useRef(null)

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  const fetchReservations = useCallback(async (restaurantId) => {
  if (!restaurantId) return

  const { data, error } = await supabase
    .from('reservations')
    .select('*, tables(table_number)')
    .eq('restaurant_id', restaurantId)
    .order('reservation_date', { ascending: true })
    .order('reservation_time', { ascending: true })

  if (!error && data) {
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
    let restaurantData = null
    let userEmail = null
    let userName = 'Unknown'
    let userId = null

    const staffSessionData = localStorage.getItem('staff_session')

    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)

        const { data: freshRestaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', staffSession.restaurant_id)
          .single()

        restaurantData = freshRestaurant
        userEmail = staffSession.email
        userName = staffSession.name
        userId = staffSession.id
      } catch {
        localStorage.removeItem('staff_session')
      }
    }

    if (!restaurantData) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        userEmail = user.email
        userId = user.id

        const { data: ownedRestaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (ownedRestaurant) {
          restaurantData = ownedRestaurant
          userName = user.email.split('@')[0]
        } else {
          const { data: staffRecords } = await supabase
            .from('staff')
            .select('*, restaurants(*)')
            .or(`user_id.eq.${user.id},email.eq.${user.email}`)
            .eq('status', 'active')

          const staffRecord = staffRecords?.[0]

          if (staffRecord?.restaurants) {
            restaurantData = staffRecord.restaurants
            userName = staffRecord.name
            userEmail = staffRecord.email
          }
        }
      }
    }

    if (restaurantData) {
      setRestaurant(restaurantData)
      setUserInfo({ email: userEmail, name: userName, id: userId })

      await Promise.all([
        fetchReservations(restaurantData.id),
        fetchTables(restaurantData.id)
      ])
    }

    setLoading(false)
  }, [fetchReservations, fetchTables])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

    const channel = supabase
      .channel(`reservations-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restaurant.id}`
        },
        () => fetchReservations(restaurant.id)
      )
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurant, fetchReservations])

  const openConfirmModal = async (reservation) => {
    setSelectedReservation(reservation)

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

  const confirmReservation = async () => {
    if (!selectedTable) {
      showNotification('error', 'Please select a table')
      return
    }

    setModalLoading(true)

    try {
      // Check if this is a PIN-based staff login (no real auth user)
      const staffSessionData = localStorage.getItem('staff_session')
      const isPinBasedLogin = !!staffSessionData

      // Use RPC function to bypass RLS restrictions for staff
      const { data, error } = await supabase.rpc('confirm_reservation', {
        p_reservation_id: selectedReservation.id,
        p_table_id: selectedTable,
        p_confirmed_by_staff_name: userInfo.name,
        // Pass null for PIN-based logins to avoid foreign key constraint violation
        p_confirmed_by_user_id: isPinBasedLogin ? null : userInfo.id
      })

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to confirm reservation')
      }

      // Send confirmation email
      fetch('/api/reservations/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: selectedReservation.id })
      }).catch(console.error)

      showNotification('success', 'Reservation confirmed successfully')
      setShowConfirmModal(false)
      setSelectedReservation(null)
      setSelectedTable('')
      fetchReservations(restaurant.id)
    } catch (error) {
      console.error('Error confirming reservation:', error)
      showNotification('error', error.message || 'Failed to confirm reservation')
    } finally {
      setModalLoading(false)
    }
  }

  const openDenyModal = (reservation) => {
    setSelectedReservation(reservation)
    setDenyReason('')
    setShowDenyModal(true)
  }

  const denyReservation = async () => {
    if (!denyReason.trim()) {
      showNotification('error', 'Please provide a reason')
      return
    }

    setModalLoading(true)

    try {
      // Check if this is a PIN-based staff login (no real auth user)
      const staffSessionData = localStorage.getItem('staff_session')
      const isPinBasedLogin = !!staffSessionData

      // Use RPC function to bypass RLS restrictions for staff
      const { data, error } = await supabase.rpc('deny_reservation', {
        p_reservation_id: selectedReservation.id,
        p_denial_reason: denyReason,
        p_denied_by_staff_name: userInfo.name,
        // Pass null for PIN-based logins to avoid foreign key constraint violation
        p_denied_by_user_id: isPinBasedLogin ? null : userInfo.id
      })

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to deny reservation')
      }

      showNotification('success', 'Reservation denied')
      setShowDenyModal(false)
      setDenyReason('')
      fetchReservations(restaurant.id)
    } catch (error) {
      console.error('Error denying reservation:', error)
      showNotification('error', error.message || 'Failed to deny reservation')
    } finally {
      setModalLoading(false)
    }
  }
  const filteredReservations = reservations.filter(r => {
    const resDate = new Date(r.reservation_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    // Time scope filter (upcoming vs past)
    if (timeScope === 'upcoming') {
      if (resDate < today) return false
    } else if (timeScope === 'past') {
      if (resDate >= today) return false
    }
    // Date filter
    if (dateFilter === 'today') {
      if (resDate.toDateString() !== today.toDateString()) return false
    } else if (dateFilter === 'tomorrow') {
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (resDate.toDateString() !== tomorrow.toDateString()) return false
    } else if (dateFilter === 'week') {
      const weekFromNow = new Date(today)
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      if (timeScope === 'upcoming') {
        if (resDate < today || resDate > weekFromNow) return false
      } else {
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        if (resDate > today || resDate < weekAgo) return false
      }
    } else if (dateFilter === 'month') {
      const monthFromNow = new Date(today)
      monthFromNow.setMonth(monthFromNow.getMonth() + 1)
      if (timeScope === 'upcoming') {
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
    // Status filter
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    return true
  })
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-200'
      case 'denied': return 'bg-red-100 text-red-700 border-red-200'
      case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'no_show': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }
  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
  }
  if (loading) {
    return <div className="text-slate-500">Loading...</div>
  }
  if (!restaurant) {
    return <div className="text-red-600">No restaurant found</div>
  }
  return (

    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Reservations</h1>
        <p className="text-slate-500">Manage customer reservations</p>
      </div>
      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {notification.type === 'success' ? (
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          )}
          <span className={notification.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {notification.message}
          </span>
        </div>
      )}
      {/* Time Scope Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => {
            setTimeScope('upcoming')
            setDateFilter('all')
          }}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            timeScope === 'upcoming'
              ? 'bg-[#6262bd] text-white'
              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          Upcoming Reservations
        </button>
        <button
          onClick={() => {
            setTimeScope('past')
            setDateFilter('all')
          }}
          className={`px-6 py-3 rounded-xl font-medium transition-colors ${
            timeScope === 'past'
              ? 'bg-[#6262bd] text-white'
              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          Past Reservations
        </button>
      </div>
      {/* Filters */}
      <div className="mb-6 bg-white border-2 border-slate-100 rounded-2xl p-6">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">{timeScope === 'upcoming' ? 'Next 7 Days' : 'Last 7 Days'}</option>
              <option value="month">{timeScope === 'upcoming' ? 'Next 30 Days' : 'Last 30 Days'}</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="denied">Denied</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          {/* Stats */}
          <div className="flex items-end gap-2">
            <div className="bg-amber-50 border-2 border-amber-200 px-4 py-2 rounded-xl flex-1">
              <div className="text-2xl font-bold text-amber-700">
                {reservations.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-xs text-amber-600">Pending</div>
            </div>
            <div className="bg-green-50 border-2 border-green-200 px-4 py-2 rounded-xl flex-1">
              <div className="text-2xl font-bold text-green-700">
                {reservations.filter(r => r.status === 'confirmed').length}
              </div>
              <div className="text-xs text-green-600">Confirmed</div>
            </div>
          </div>
        </div>
        {/* Custom Date Range */}
        {dateFilter === 'custom' && (
          <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              />
            </div>
          </div>
        )}
      </div>
      {/* Reservations Grid */}
      {filteredReservations.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
            </svg>
          </div>
          <p className="text-slate-600 font-medium mb-1">No reservations found</p>
          <p className="text-slate-500 text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-slate-200 transition-all hover:shadow-sm"
            >
              {/* Header Row */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-slate-800">{reservation.customer_name}</h3>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${getStatusColor(reservation.status)}`}>
                      {getStatusLabel(reservation.status)}
                    </span>
                  </div>
                  {/* Details Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                    <div className="flex items-center gap-2 text-slate-700">
                      <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
                      </svg>
                      <div>
                        <div className="text-xs text-slate-500">Date</div>
                        <div className="font-medium">{new Date(reservation.reservation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                      <div>
                        <div className="text-xs text-slate-500">Time</div>
                        <div className="font-medium">{reservation.reservation_time.substring(0, 5)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                      <div>
                        <div className="text-xs text-slate-500">Party Size</div>
                        <div className="font-medium">{reservation.party_size} {reservation.party_size === 1 ? 'guest' : 'guests'}</div>
                      </div>
                    </div>
                    {reservation.table_id && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20 7h-5V4c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11h20V9c0-1.1-.9-2-2-2zM11 4h2v5h-2V4zm9 14H4v-2h16v2z"/>
                        </svg>
                        <div>
                          <div className="text-xs text-slate-500">Table</div>
                          <div className="font-medium">#{reservation.tables?.table_number}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Contact Info */}
                  <div className="text-sm text-slate-600 space-y-1">
                    <div><strong>Email:</strong> {reservation.customer_email}</div>
                    {reservation.customer_phone && (
                      <div><strong>Phone:</strong> {reservation.customer_phone}</div>
                    )}
                    {reservation.special_requests && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <strong className="text-blue-900">Special Requests:</strong>
                        <p className="text-blue-800 mt-1">{reservation.special_requests}</p>
                      </div>
                    )}
                  </div>
                </div>
              {/* Actions */}
              {reservation.status === 'pending' && (
                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => openConfirmModal(reservation)}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-green-700 text-sm whitespace-nowrap"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => openDenyModal(reservation)}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-red-700 text-sm whitespace-nowrap"
                  >
                    Deny
                  </button>
                </div>
              )}

              </div> 

              {/* Metadata Footer */}
              {(reservation.confirmed_by_staff_name || reservation.denied_by_staff_name || reservation.cancellation_reason) && (
                <div className="pt-4 border-t border-slate-200">
                  {reservation.confirmed_by_staff_name && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      <span>
                        <strong>Confirmed by</strong> {reservation.confirmed_by_staff_name}
                        {reservation.confirmed_at && ` on ${new Date(reservation.confirmed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                  {reservation.denied_by_staff_name && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-red-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                        </svg>
                        <span>
                          <strong>Denied by</strong> {reservation.denied_by_staff_name}
                          {reservation.denied_at && ` on ${new Date(reservation.denied_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                        </span>
                      </div>
                      {reservation.denied_reason && (
                        <div className="text-sm text-red-600 pl-6">
                          <strong>Reason:</strong> {reservation.denied_reason}
                        </div>
                      )}
                    </div>
                  )}
                  {reservation.status === 'cancelled' && reservation.cancellation_reason && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                      </svg>
                      <span>
                        <strong>Cancelled:</strong> {reservation.cancellation_reason}
                        {reservation.cancelled_at && ` on ${new Date(reservation.cancelled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Confirm Modal */}
      {showConfirmModal && selectedReservation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowConfirmModal(false)
            setSelectedReservation(null)
            setSelectedTable('')
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">Confirm Reservation</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-600 mb-1">
                <strong>{selectedReservation.customer_name}</strong> - {selectedReservation.party_size} guests
              </p>
              <p className="text-sm text-slate-600">
                {new Date(selectedReservation.reservation_date).toLocaleDateString()} at {selectedReservation.reservation_time.substring(0, 5)}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Assign Table *
              </label>
              {availableTables.length === 0 ? (
                <p className="text-red-600 text-sm">No available tables at this time</p>
              ) : (
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  {availableTables.map((table) => (
                    <option key={table.id} value={table.id}>
                      Table {table.table_number}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false)
                  setSelectedReservation(null)
                  setSelectedTable('')
                }}
                className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmReservation}
                disabled={modalLoading || !selectedTable}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {modalLoading ? 'Confirming...' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Deny Modal */}
      {showDenyModal && selectedReservation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDenyModal(false)
            setDenyReason('')
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">Deny Reservation</h2>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Denying *
              </label>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                placeholder="e.g., Fully booked, Restaurant closed that day..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDenyModal(false)
                  setDenyReason('')
                }}
                className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={denyReservation}
                disabled={modalLoading || !denyReason.trim()}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {modalLoading ? 'Denying...' : 'Deny Reservation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
