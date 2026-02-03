'use client'
export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
          .select('id, name, email, pin_code, role, department, restaurant_id, status, is_hub')
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
        is_hub: staffMember.is_hub || false
      }))

      // Redirect to hub dashboard if this is a hub user
      if (staffMember.is_hub) {
        router.push('/hub-dashboard')
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
        is_hub: staffMember.is_hub || false
      }))

      // Refresh the offline cache with latest staff data
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, name, email, pin_code, role, department, restaurant_id, status, is_hub')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'active')

      if (staffList) {
        cacheStaffLoginData(slug, restaurant, staffList)
      }

      // Redirect to hub dashboard if this is a hub user
      if (staffMember.is_hub) {
        router.push('/hub-dashboard')
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
            is_hub: staffMember.is_hub || false
          }))
          // Redirect to hub dashboard if this is a hub user
          if (staffMember.is_hub) {
            router.push('/hub-dashboard')
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
            <span className="text-xl font-bold text-slate-700">Menu Hub</span>
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-100 px-6 py-4">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-9 h-9 bg-[#6262bd] rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <span className="text-xl font-bold text-slate-700">Menu Hub</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
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

          {/* Owner Login Link */}
          <div className="mt-6 text-center">
            <p className="text-slate-500 text-sm mb-2">Are you a restaurant owner?</p>
            <Link
              href="/auth/login"
              className="text-[#6262bd] font-medium hover:underline"
            >
              Owner Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
