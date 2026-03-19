'use client'
export const runtime = 'edge'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ---------------------------------------------------------------------------
// Read-only tables overview shown alongside the PIN entry step
// ---------------------------------------------------------------------------
function TablesPreview({ restaurantId }) {
  const [allTables, setAllTables] = useState([])
  const [floors, setFloors] = useState([])
  const [activeFloorId, setActiveFloorId] = useState(null) // null = show all
  const [orderInfo, setOrderInfo] = useState({})
  const [waiterCallsByTable, setWaiterCallsByTable] = useState({})
  const supabaseRef = useRef(supabase)

  useEffect(() => {
    if (!restaurantId) return
    const sb = supabaseRef.current

    const fetchFloors = async () => {
      const { data } = await sb
        .from('floors')
        .select('id, name, level')
        .eq('restaurant_id', restaurantId)
        .order('level', { ascending: true })
      if (data) setFloors(data)
    }

    const fetchTables = async () => {
      const { data: tablesData } = await sb
        .from('tables')
        .select('id, table_number, status, floor_id')
        .eq('restaurant_id', restaurantId)
        .order('table_number', { ascending: true })
      if (tablesData) setAllTables(tablesData)
    }

    const fetchOrders = async () => {
      const { data: ordersData } = await sb
        .from('orders')
        .select('table_id, total, status, paid')
        .eq('restaurant_id', restaurantId)
        .eq('paid', false)
        .neq('status', 'cancelled')
      if (ordersData) {
        const info = {}
        ordersData.forEach(o => {
          if (!info[o.table_id]) info[o.table_id] = { count: 0, total: 0 }
          info[o.table_id].count += 1
          info[o.table_id].total += o.total || 0
        })
        setOrderInfo(info)
      }
    }

    const fetchWaiterCalls = async () => {
      const { data: calls } = await sb
        .from('waiter_calls')
        .select('id, table_id')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending')
      if (calls) {
        const byTable = {}
        calls.forEach(c => { byTable[c.table_id] = true })
        setWaiterCallsByTable(byTable)
      }
    }

    fetchFloors()
    fetchTables()
    fetchOrders()
    fetchWaiterCalls()

    // Realtime subscription
    const channel = sb
      .channel(`staff-login-preview-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, fetchOrders)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${restaurantId}` }, fetchTables)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'floors', filter: `restaurant_id=eq.${restaurantId}` }, fetchFloors)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waiter_calls', filter: `restaurant_id=eq.${restaurantId}` }, fetchWaiterCalls)
      .subscribe()

    // Poll every 10 seconds as fallback in case realtime is unavailable on the login page
    const poll = setInterval(() => {
      fetchOrders()
      fetchTables()
      fetchWaiterCalls()
    }, 10000)

    return () => {
      sb.removeChannel(channel)
      clearInterval(poll)
    }
  }, [restaurantId])

  // Filter tables by selected floor (null = all tables)
  const visibleTables = activeFloorId === null
    ? allTables
    : allTables.filter(t => t.floor_id === activeFloorId)

  const hasMultipleFloors = floors.length > 1

  if (allTables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No tables configured
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header row */}
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Live Table Status</span>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Floor tabs — only shown when multiple floors exist */}
        {hasMultipleFloors && (
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setActiveFloorId(null)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                activeFloorId === null
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            {floors.map(floor => (
              <button
                key={floor.id}
                onClick={() => setActiveFloorId(floor.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeFloorId === floor.id
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {floor.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable wrapper — staff can scroll; pointer-events-none only on cards */}
      <div className="overflow-y-auto flex-1 pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-max pointer-events-none select-none">
          {visibleTables.map(table => {
            const info = orderInfo[table.id]
            const hasOrder = info && info.count > 0
            const needsCleaning = table.status === 'needs_cleaning'
            const hasWaiterCall = !!waiterCallsByTable[table.id]
            return (
              <div
                key={table.id}
                className={`bg-white border-2 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col ${
                  hasWaiterCall ? 'border-orange-300 shadow-orange-100 shadow-md'
                  : needsCleaning ? 'border-red-200 shadow-red-100 shadow-md'
                  : hasOrder ? 'border-amber-200 shadow-amber-100 shadow-md'
                  : 'border-slate-100'
                }`}
              >
                {/* Status-tinted top strip */}
                <div className={`px-4 pt-4 pb-3 ${
                  hasWaiterCall ? 'bg-orange-50'
                  : needsCleaning ? 'bg-red-50'
                  : hasOrder ? 'bg-amber-50'
                  : 'bg-slate-50'
                }`}>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Table</p>
                  <h3 className={`text-3xl font-black leading-none ${
                    hasWaiterCall ? 'text-orange-700'
                    : needsCleaning ? 'text-red-700'
                    : hasOrder ? 'text-amber-700'
                    : 'text-slate-800'
                  }`}>{table.table_number}</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {hasWaiterCall && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                        👋 Waiter called
                      </span>
                    )}
                    {needsCleaning ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        Needs cleaning
                      </span>
                    ) : hasOrder ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                        Open · {info.count} order{info.count > 1 ? 's' : ''}
                      </span>
                    ) : !hasWaiterCall && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Generate or retrieve device ID
function getOrCreateDeviceId() {
  if (typeof window === 'undefined') return null

  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    // Generate a unique device ID
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    deviceId = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

// Cache key for offline staff login data (per restaurant slug)
function getOfflineCacheKey(slug) {
  return `offline_staff_cache_${slug}`
}

// Save staff login data locally for offline access
function cacheStaffLoginData(slug, restaurantData, staffList) {
  try {
    localStorage.setItem(getOfflineCacheKey(slug), JSON.stringify({
      restaurant: restaurantData,
      staff: staffList,
      cached_at: new Date().toISOString(),
    }))
  } catch (err) {
    console.warn('Failed to cache staff login data:', err)
  }
}

// Load cached staff login data for offline use
function loadCachedStaffLoginData(slug) {
  try {
    const raw = localStorage.getItem(getOfflineCacheKey(slug))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export default function StaffLogin() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Step 1: Restaurant password authentication
  const [restaurantPassword, setRestaurantPassword] = useState('')
  const [passwordAuthenticated, setPasswordAuthenticated] = useState(false)
  const [checkingPassword, setCheckingPassword] = useState(false)

  // Step 2: Staff PIN authentication
  const [pinCode, setPinCode] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [isOfflineMode, setIsOfflineMode] = useState(false)
  const [currentSession, setCurrentSession] = useState(null) // staff session already in localStorage

  useEffect(() => {
    const fetchRestaurant = async () => {
      // If offline, try to use cached data
      if (!navigator.onLine) {
        const cached = loadCachedStaffLoginData(slug)
        if (cached) {
          setRestaurant(cached.restaurant)
          setIsOfflineMode(true)

          // Check if restaurant password is already authenticated in session
          const sessionKey = `restaurant_auth_${cached.restaurant.id}`
          const storedAuth = sessionStorage.getItem(sessionKey)
          if (storedAuth === cached.restaurant.staff_login_password) {
            setPasswordAuthenticated(true)
          }

          setLoading(false)
          return
        }
        // No cache available — can't do anything offline
        setError('You are offline and this device has no cached login data. Please connect to the internet first.')
        setLoading(false)
        return
      }

      try {
        // Fetch restaurant by slug
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('slug', slug)
          .maybeSingle()

        if (restaurantError) {
          console.error('Restaurant fetch error:', restaurantError)
          setError('Error loading restaurant: ' + restaurantError.message)
          setLoading(false)
          return
        }

        if (!restaurantData) {
          setError('Restaurant not found')
          setLoading(false)
          return
        }

        setRestaurant(restaurantData)

        // Fetch and cache staff list for future offline use
        const { data: staffList } = await supabase
          .from('staff')
          .select('id, name, email, pin_code, role, department, restaurant_id, status, is_hub, avatar_url')
          .eq('restaurant_id', restaurantData.id)
          .eq('status', 'active')

        if (staffList) {
          cacheStaffLoginData(slug, restaurantData, staffList)
        }

        // Check if restaurant password is already authenticated in session
        const sessionKey = `restaurant_auth_${restaurantData.id}`
        const storedAuth = sessionStorage.getItem(sessionKey)

        if (storedAuth === restaurantData.staff_login_password) {
          setPasswordAuthenticated(true)
        }

        setLoading(false)
      } catch (err) {
        // Network error — try cache fallback
        const cached = loadCachedStaffLoginData(slug)
        if (cached) {
          setRestaurant(cached.restaurant)
          setIsOfflineMode(true)

          const sessionKey = `restaurant_auth_${cached.restaurant.id}`
          const storedAuth = sessionStorage.getItem(sessionKey)
          if (storedAuth === cached.restaurant.staff_login_password) {
            setPasswordAuthenticated(true)
          }

          setLoading(false)
          return
        }

        console.error('Restaurant fetch error:', err)
        setError('Something went wrong. Please try again.')
        setLoading(false)
      }
    }

    fetchRestaurant()

    // Read any existing staff session from localStorage
    try {
      const raw = localStorage.getItem('staff_session')
      if (raw) setCurrentSession(JSON.parse(raw))
    } catch {}
  }, [slug])

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setCheckingPassword(true)
    setError(null)

    if (!restaurant) {
      setError('Restaurant information not loaded. Please refresh the page.')
      setCheckingPassword(false)
      return
    }

    if (!restaurant.staff_login_password) {
      setError('Staff login is not configured. Please contact the restaurant owner.')
      setCheckingPassword(false)
      return
    }

    if (restaurantPassword !== restaurant.staff_login_password) {
      setError('Invalid restaurant password')
      setCheckingPassword(false)
      return
    }

    // Store authentication in sessionStorage
    const sessionKey = `restaurant_auth_${restaurant.id}`
    sessionStorage.setItem(sessionKey, restaurantPassword)

    setPasswordAuthenticated(true)
    setCheckingPassword(false)
  }

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    setLoggingIn(true)
    setError(null)

    if (!restaurant) {
      setError('Restaurant information not loaded. Please refresh the page.')
      setLoggingIn(false)
      return
    }

    if (pinCode.length !== 3) {
      setError('PIN code must be 3 digits')
      setLoggingIn(false)
      return
    }

    // Offline path: verify PIN against cached staff list
    if (isOfflineMode || !navigator.onLine) {
      const cached = loadCachedStaffLoginData(slug)
      if (!cached || !cached.staff) {
        setError('No cached staff data available. Please connect to the internet to login.')
        setPinCode('')
        setLoggingIn(false)
        return
      }

      const staffMember = cached.staff.find(
        (s) => s.pin_code === pinCode && s.status === 'active'
      )

      if (!staffMember) {
        setError('Invalid PIN code or staff member is not active')
        setPinCode('')
        setLoggingIn(false)
        return
      }

      // Store staff session in localStorage (same as online flow)
      localStorage.setItem('staff_session', JSON.stringify({
        id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        department: staffMember.department,
        restaurant_id: staffMember.restaurant_id,
        restaurant: restaurant,
        is_hub: staffMember.is_hub || false,
        avatar_url: staffMember.avatar_url || null
      }))

      // Redirect to hub dashboard if this is a hub user
      if (staffMember.is_hub) {
        router.push(`/r/${slug}/hub-dashboard`)
      } else {
        router.push('/dashboard')
      }
      return
    }

    // Online path: verify PIN against Supabase
    try {
      // Look up staff member by PIN code and restaurant
      const { data: staffMember, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('pin_code', pinCode)
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'active')
        .maybeSingle()

      if (staffError) {
        console.error('Database error:', staffError)
        setError(`Database error: ${staffError.message}`)
        setPinCode('')
        setLoggingIn(false)
        return
      }

      if (!staffMember) {
        setError('Invalid PIN code or staff member is not active')
        setPinCode('')
        setLoggingIn(false)
        return
      }

      // Create session in the database for device tracking
      const deviceId = getOrCreateDeviceId()

      try {
        const sessionResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            staffId: staffMember.id,
            deviceId
          })
        })
        const sessionData = await sessionResponse.json()

        if (sessionData.success && sessionData.sessionToken) {
          localStorage.setItem('session_token', sessionData.sessionToken)
        }
      } catch (sessionError) {
        // Log but don't fail login if session creation fails
        console.error('Session creation error:', sessionError)
      }

      // Store staff session in localStorage
      localStorage.setItem('staff_session', JSON.stringify({
        id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        department: staffMember.department,
        restaurant_id: staffMember.restaurant_id,
        restaurant: restaurant,
        is_hub: staffMember.is_hub || false,
        avatar_url: staffMember.avatar_url || null
      }))

      // Refresh the offline cache with latest staff data
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, name, email, pin_code, role, department, restaurant_id, status, is_hub, avatar_url')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'active')

      if (staffList) {
        cacheStaffLoginData(slug, restaurant, staffList)
      }

      // Redirect to hub dashboard if this is a hub user
      if (staffMember.is_hub) {
        router.push(`/r/${slug}/hub-dashboard`)
      } else {
        router.push('/dashboard')
      }


    } catch (err) {
      // Network failed mid-request — try offline fallback
      const cached = loadCachedStaffLoginData(slug)
      if (cached && cached.staff) {
        const staffMember = cached.staff.find(
          (s) => s.pin_code === pinCode && s.status === 'active'
        )

        if (staffMember) {
          localStorage.setItem('staff_session', JSON.stringify({
            id: staffMember.id,
            name: staffMember.name,
            email: staffMember.email,
            role: staffMember.role,
            department: staffMember.department,
            restaurant_id: staffMember.restaurant_id,
            restaurant: restaurant,
            is_hub: staffMember.is_hub || false,
            avatar_url: staffMember.avatar_url || null
          }))
          // Redirect to hub dashboard if this is a hub user
          if (staffMember.is_hub) {
            router.push(`/r/${slug}/hub-dashboard`)
          } else {
            router.push('/dashboard')
          }
          return
        }
      }

      console.error('Unexpected error:', err)
      setError('Something went wrong. Please try again.')
      setPinCode('')
      setLoggingIn(false)
    }
  }

  const handlePinInput = (value) => {
    // Only allow numbers and max 3 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 3)
    setPinCode(numericValue)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (error && !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-white border-b-2 border-slate-100 px-6 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-[#6262bd] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold text-slate-700">Veno App</span>
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-600 max-w-md">
            <p className="font-medium mb-2">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // PIN form content (shared between single and split layout)
  const pinFormContent = (
    <div className="bg-white rounded-2xl border-2 border-slate-100 p-8">
      {/* Restaurant Info */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          {restaurant?.name}
        </h1>
        <p className="text-slate-500">Staff Login</p>
      </div>

      {isOfflineMode && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 .01c0-.01 0-.01 0 0L2.41 0 .84 1.58l3.7 3.7C2.84 6.89 1.64 8.74 1.01 10.8l1.91.65c.52-1.7 1.5-3.22 2.82-4.41l2.08 2.08c-1.13.93-2 2.17-2.47 3.57l1.9.65c.4-1.16 1.12-2.15 2.06-2.88l7.7 7.7L18.56 20l1.57-1.57L22.59 21 24 19.58 24 .01zM1 21h6v-2H1v2zm12-12c-1.2 0-2.33.28-3.35.77l1.53 1.53c.57-.2 1.18-.3 1.82-.3 3.31 0 6 2.69 6 6 0 .64-.1 1.25-.3 1.82l1.53 1.53c.49-1.02.77-2.15.77-3.35 0-4.42-3.58-8-8-8zm0 4c-2.21 0-4 1.79-4 4 0 .64.15 1.24.42 1.77l5.35-5.35C14.24 13.15 13.64 13 13 13z"/>
          </svg>
          <span>Offline mode — using cached credentials</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Restaurant Password */}
      {!passwordAuthenticated ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
              Restaurant Password
            </label>
            <p className="text-xs text-slate-500 text-center mb-4">
              Enter the password provided by your manager
            </p>
            <input
              type="password"
              value={restaurantPassword}
              onChange={(e) => setRestaurantPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoFocus
              className="w-full px-6 py-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-center"
            />
          </div>

          <button
            type="submit"
            disabled={checkingPassword || !restaurantPassword}
            className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
          >
            {checkingPassword ? 'Checking...' : 'Continue'}
          </button>
        </form>
      ) : (
        /* Step 2: Staff PIN */
        <form onSubmit={handlePinSubmit} className="space-y-6">
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 justify-center text-green-700 text-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
              </svg>
              <span className="font-medium">Restaurant Verified</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
              Your PIN Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pinCode}
              onChange={(e) => handlePinInput(e.target.value)}
              placeholder="• • •"
              maxLength={3}
              required
              autoFocus
              className="w-full px-6 py-6 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 font-mono text-4xl text-center tracking-[0.5em]"
            />
          </div>

          <button
            type="submit"
            disabled={loggingIn || pinCode.length !== 3}
            className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
          >
            {loggingIn ? 'Logging in...' : 'Login'}
          </button>

          <button
            type="button"
            onClick={() => {
              setPasswordAuthenticated(false)
              setRestaurantPassword('')
              setPinCode('')
              if (restaurant) {
                sessionStorage.removeItem(`restaurant_auth_${restaurant.id}`)
              }
            }}
            className="w-full text-slate-500 text-sm hover:text-slate-700 transition-colors"
          >
            ← Back to password
          </button>
        </form>
      )}
    </div>
  )

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {restaurant?.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="w-9 h-9 object-contain rounded-xl"
              />
            ) : (
              <div className="w-9 h-9 bg-[#6262bd] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {restaurant?.name?.charAt(0) || 'M'}
                </span>
              </div>
            )}
            <span className="text-xl font-bold text-slate-700">{restaurant?.name || 'Veno App'}</span>
          </div>

          {/* Currently logged-in staff member indicator */}
          {currentSession && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs text-slate-400">Logged in as</p>
                <p className="text-sm font-semibold text-slate-700">{currentSession.name}</p>
              </div>
              {currentSession.avatar_url ? (
                <img
                  src={currentSession.avatar_url}
                  alt={currentSession.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-[#6262bd]/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#6262bd]/10 border-2 border-[#6262bd]/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content — always split once restaurant is loaded */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left — PIN / password form */}
        <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-6 border-r-2 border-slate-100 bg-white shrink-0">
          <div className="w-full max-w-sm">
            {pinFormContent}
            <div className="mt-6 text-center">
              <p className="text-slate-500 text-sm mb-2">Are you a restaurant owner?</p>
              <Link href="/auth/login" className="text-[#6262bd] font-medium hover:underline">
                Owner Login
              </Link>
            </div>
          </div>
        </div>

        {/* Right — read-only tables preview (only meaningful after password step) */}
        <div className="flex flex-col flex-1 p-6 overflow-hidden bg-slate-50">
          {passwordAuthenticated && restaurant?.id
            ? <TablesPreview restaurantId={restaurant.id} />
            : <div className="flex items-center justify-center h-full text-slate-300 text-sm select-none">Enter password to see live table status</div>
          }
        </div>
      </div>
    </div>
  )
}
