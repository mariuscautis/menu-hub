'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'
import GuideToggle from '@/components/GuideToggle'
import { GuideProvider } from '@/lib/GuideContext'
import OfflineIndicator from '@/components/OfflineIndicator'
import HubConnectionStatus from '@/components/HubConnectionStatus'
import { initAutoSync } from '@/lib/syncManager'
import { LanguageProvider, useTranslations } from '@/lib/i18n/LanguageContext'

function NavLabel({ labelKey }) {
  const t = useTranslations('nav')
  return <>{t(labelKey)}</>
}
import { CurrencyProvider } from '@/lib/CurrencyContext'
import LanguageSelector from '@/components/LanguageSelector'
import { useSessionValidator } from '@/hooks/useSessionValidator'
import { useInactivityTimeout } from '@/hooks/useInactivityTimeout'
import InactivityRing from '@/components/InactivityRing'
import PlatformLogo from '@/components/PlatformLogo'
import { RestaurantProvider } from '@/lib/RestaurantContext'

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [impersonatedRestaurantName, setImpersonatedRestaurantName] = useState('')
  const [userType, setUserType] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [staffDepartment, setStaffDepartment] = useState(null)
  const [departmentPermissions, setDepartmentPermissions] = useState([])
  const [debug, setDebug] = useState('')
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0)
  const [recoveryRequested, setRecoveryRequested] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [unreadSupportCount, setUnreadSupportCount] = useState(0)
  const [staffAvatar, setStaffAvatar] = useState(null)
  const [staffName, setStaffName] = useState('')

  // Connectivity border indicator
  const [isOnline, setIsOnline] = useState(true)
  const [backOnline, setBackOnline] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => {
      setIsOnline(true)
      setBackOnline(true)
      setTimeout(() => setBackOnline(false), 5000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setBackOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Responsive state - works on all devices
  const [sidebarOpen, setSidebarOpen] = useState(true) // Start with sidebar open on desktop
  const [fullWidthMode, setFullWidthMode] = useState(false)
  const [initialRedirectDone, setInitialRedirectDone] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false) // For initial sidebar state

  // Session validation for staff users (validates every 30 seconds)
  useSessionValidator({
    enabled: userType === 'staff' || userType === 'staff-admin',
    validateInterval: 30000 // 30 seconds
  })

  // Inactivity auto-logout for staff users (PIN-based login only)
  const isStaffUser = userType === 'staff' || userType === 'staff-admin'
  const { progress: inactivityProgress, timeRemaining: inactivityTimeRemaining, setting: inactivitySetting, updateSetting: updateInactivitySetting } = useInactivityTimeout({
    enabled: isStaffUser && !loading
  })

  // Detect screen size for initial sidebar state
  useEffect(() => {
    const checkScreenSize = () => {
      const smallScreen = window.innerWidth < 1000
      setIsSmallScreen(smallScreen)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Set initial sidebar state based on screen size (only on first load)
  useEffect(() => {
    if (!loading && userType) {
      // On small screens, start with sidebar closed
      // On large screens, start with sidebar open (unless staff on first login)
      if (isSmallScreen) {
        setSidebarOpen(false)
      }
    }
  }, [loading, userType, isSmallScreen])

  // Helper function to fetch department permissions (with local caching)
  const fetchDepartmentPermissions = async (restaurantId, department) => {
    if (!restaurantId || !department) return []

    const cacheKey = `dept_permissions_${restaurantId}_${department}`

    // If offline, use cached permissions
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) return JSON.parse(cached)
      } catch {}
      return []
    }

    try {
      const { data, error } = await supabase
        .from('department_permissions')
        .select('permissions')
        .eq('restaurant_id', restaurantId)
        .eq('department_name', department)
        .single()

      if (error) {
        if (!navigator.onLine) {
          try {
            const cached = localStorage.getItem(cacheKey)
            if (cached) return JSON.parse(cached)
          } catch {}
          return []
        }
        console.error('Error fetching department permissions:', error)
        return []
      }

      const permissions = data?.permissions || []

      // Cache for offline use
      try {
        localStorage.setItem(cacheKey, JSON.stringify(permissions))
      } catch {}

      return permissions
    } catch (err) {
      // Network error — try cache
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) return JSON.parse(cached)
      } catch {}
      console.warn('Could not fetch department permissions (possibly offline):', err.message)
      return []
    }
  }

  useEffect(() => {
    // Safety net: if init() hangs for any reason (e.g. Supabase stalls on a
    // cold PWA launch, flaky network, Android WebView reconnecting), ensure
    // loading is cleared after 10s so the screen never stays frozen.
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 10000)

    const init = async () => {
      try {
        // Check for staff session first (PIN-based login)
        const staffSessionData = localStorage.getItem('staff_session')
        if (staffSessionData) {
          try {
            const staffSession = JSON.parse(staffSessionData)

            // Set cached data immediately so the UI works even offline
            setRestaurant(staffSession.restaurant)
            const staffType = staffSession.role === 'admin' ? 'staff-admin' : 'staff'
            setUserType(staffType)
            setUserEmail(staffSession.email)
            setStaffName(staffSession.name || '')
            setStaffAvatar(staffSession.avatar_url || null)
            const dept = staffSession.department || 'universal'
            setStaffDepartment(dept)

            // Load cached department permissions immediately (so UI works offline)
            if (staffType === 'staff') {
              const permissions = await fetchDepartmentPermissions(staffSession.restaurant_id, dept)
              setDepartmentPermissions(permissions)
            }

            // Mark loading done with cached data before hitting the network —
            // the UI is already fully functional at this point.
            setLoading(false)

            // Try to fetch fresh data in the background (non-blocking)
            try {
              const { data: freshRestaurant } = await supabase
                .from('restaurants')
                .select('id, name, slug, logo_url, invoice_settings, enabled_modules, reservation_settings')
                .eq('id', staffSession.restaurant_id)
                .single()

              if (freshRestaurant) {
                setRestaurant(freshRestaurant)
              }

              // Refresh department permissions with fresh data (only for regular staff)
              if (staffType === 'staff') {
                const freshPermissions = await fetchDepartmentPermissions(staffSession.restaurant_id, dept)
                setDepartmentPermissions(freshPermissions)
              }
            } catch (networkErr) {
              // Offline or network error — cached data already shown
              console.warn('Offline: using cached staff session data')
            }

            return
          } catch (err) {
            // Invalid session, clear it
            localStorage.removeItem('staff_session')
          }
        }

        // Check for owner/admin auth session.
        // Race against a 8s timeout so a stalled Supabase auth call
        // (common on Android cold start) doesn't freeze the app forever.
        let user = null
        try {
          const authResult = await Promise.race([
            supabase.auth.getUser(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('auth_timeout')), 8000)
            )
          ])
          user = authResult?.data?.user
        } catch (authErr) {
          if (authErr.message === 'auth_timeout') {
            console.warn('Auth timed out — redirecting to login')
          } else {
            // Offline and no staff session — can't authenticate
            console.warn('Offline: cannot authenticate owner session')
          }
          setLoading(false)
          return
        }

        if (!user) {
          router.push('/auth/login')
          return
        }

        setUserEmail(user.email)
        let debugText = `User: ${user.email} (${user.id})\n\n`

        // Run admin check and restaurant owner check in parallel — saves one full round-trip
        const [{ data: admin }, { data: ownedRestaurant, error: ownedError }] = await Promise.all([
          supabase.from('admins').select('id').eq('user_id', user.id),
          supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle(),
        ])

        const isPlatAdmin = admin && admin.length > 0
        setIsPlatformAdmin(isPlatAdmin)
        debugText += `Platform Admin: ${isPlatAdmin}\n\n`

        // Check for impersonation session (platform admin only)
        if (isPlatAdmin) {
          try {
            const impersonationData = sessionStorage.getItem('impersonation_session')
            if (impersonationData) {
              const { restaurantId, restaurantName } = JSON.parse(impersonationData)
              const { data: targetRestaurant } = await supabase
                .from('restaurants')
                .select('*')
                .eq('id', restaurantId)
                .single()
              if (targetRestaurant) {
                setRestaurant(targetRestaurant)
                setUserType('owner')
                setIsImpersonating(true)
                setImpersonatedRestaurantName(restaurantName)
                setLoading(false)
                return
              }
            }
          } catch {
            // Malformed impersonation data — ignore and continue normal flow
            sessionStorage.removeItem('impersonation_session')
          }
        }

        debugText += `Owned Restaurant Query:\n`
        debugText += `  Result: ${JSON.stringify(ownedRestaurant)}\n`
        debugText += `  Error: ${ownedError?.message || 'none'}\n\n`

        if (ownedRestaurant) {
          setRestaurant(ownedRestaurant)
          setUserType('owner')
          debugText += `User Type: owner\n`
          setDebug(debugText)
          setLoading(false)
          return
        }

        // Check if staff member by user_id (preferred) or email (fallback)
        const { data: staffRecord, error: staffError } = await supabase
          .from('staff')
          .select('*, restaurants(*)')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)

        debugText += `Staff Query (by user_id or email):\n`
        debugText += `  Result: ${JSON.stringify(staffRecord)}\n`
        debugText += `  Error: ${staffError?.message || 'none'}\n\n`

        // Filter for active staff
        const activeStaff = staffRecord?.find(s => s.status === 'active')
        const pendingStaff = staffRecord?.find(s => s.status === 'pending')

        debugText += `Active Staff: ${JSON.stringify(activeStaff)}\n`
        debugText += `Pending Staff: ${JSON.stringify(pendingStaff)}\n\n`

        if (activeStaff && activeStaff.restaurants) {
          if (!activeStaff.user_id) {
            await supabase
              .from('staff')
              .update({ user_id: user.id })
              .eq('id', activeStaff.id)
          }

          setRestaurant(activeStaff.restaurants)
          const staffType = activeStaff.role === 'admin' ? 'staff-admin' : 'staff'
          setUserType(staffType)
          const dept = activeStaff.department || 'kitchen'
          setStaffDepartment(dept)

          // Fetch department permissions (only for regular staff, not admins)
          if (staffType === 'staff') {
            const permissions = await fetchDepartmentPermissions(activeStaff.restaurants.id, dept)
            setDepartmentPermissions(permissions)
          }

          debugText += `User Type: ${staffType}\n`
          debugText += `Department: ${dept}\n`
          setDebug(debugText)
          setLoading(false)
          return
        }

        if (pendingStaff) {
          debugText += `Redirecting to pending page\n`
          setDebug(debugText)
          router.push('/auth/pending')
          return
        }

        // If platform admin without restaurant
        if (isPlatAdmin) {
          debugText += `Platform admin without restaurant, redirecting to /admin\n`
          setDebug(debugText)
          router.push('/admin')
          return
        }

        debugText += `No restaurant or staff, redirecting to onboarding\n`
        setDebug(debugText)
        router.push('/auth/onboarding')
      } finally {
        // Always cancel the safety timer — either we finished normally,
        // or an unexpected throw happened. Either way, clear loading.
        clearTimeout(safetyTimer)
        setLoading(false)
      }
    }

    init()

    return () => clearTimeout(safetyTimer)
  }, [router])

  // Fetch and subscribe to pending reservations count (only for non-kitchen staff)
  useEffect(() => {
    if (!restaurant || staffDepartment === 'kitchen') return

    console.log('Setting up badge counter subscription for restaurant:', restaurant.id)

    const fetchPendingReservationsCount = async () => {
      const { count, error } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'pending')

      console.log('Badge counter fetch result:', { count, error })

      if (!error) {
        setPendingReservationsCount(count || 0)
      }
    }

    // Initial fetch
    fetchPendingReservationsCount()

    // Set up real-time subscription
    const channel = supabase
      .channel(`reservations-badge-realtime-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, (payload) => {
        console.log('Badge counter - Reservation changed:', payload)
        setTimeout(() => {
          console.log('Refetching badge count...')
          fetchPendingReservationsCount()
        }, 100)
      })
      .subscribe((status) => {
        console.log('Badge counter subscription status:', status)
      })

    return () => {
      console.log('Cleaning up badge counter subscription')
      supabase.removeChannel(channel)
    }
  }, [restaurant, staffDepartment])

  // Real-time pending orders count
  useEffect(() => {
    if (!restaurant) return

    const fetchPendingOrdersCount = async () => {
      // Count distinct orders that have at least one item not started yet
      // Filter by department if staff member has specific department
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          preparing_started_at,
          menu_items!inner (
            department
          ),
          orders!inner (
            id,
            restaurant_id,
            paid,
            status
          )
        `)
        .eq('orders.restaurant_id', restaurant.id)
        .eq('orders.paid', false)
        .neq('orders.status', 'cancelled')
        .neq('orders.status', 'completed')
        .is('preparing_started_at', null)

      if (!error && data) {
        // Filter by staff department if applicable
        let filteredData = data

        if (userType === 'staff' && staffDepartment && staffDepartment !== 'universal') {
          filteredData = data.filter(item =>
            item.menu_items?.department === staffDepartment
          )
        }

        // Count unique order IDs (not individual items)
        const uniqueOrders = new Set(filteredData.map(item => item.orders.id))
        setPendingOrdersCount(uniqueOrders.size)
      }
    }

    // Initial fetch
    fetchPendingOrdersCount()

    // Set up real-time subscription for order_items changes
    const channel = supabase
      .channel(`orders-badge-realtime-${Date.now()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'order_items'
      }, () => {
        fetchPendingOrdersCount()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => {
        fetchPendingOrdersCount()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurant])

  // Unread support replies badge
  useEffect(() => {
    if (!restaurant || (userType !== 'owner' && userType !== 'staff-admin')) return

    const fetchUnreadSupport = async () => {
      const { data: ticketIds } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('restaurant_id', restaurant.id)

      const ids = (ticketIds || []).map(t => t.id)
      if (ids.length === 0) { setUnreadSupportCount(0); return }

      const { count } = await supabase
        .from('support_messages')
        .select('id', { count: 'exact', head: true })
        .eq('sender_type', 'support')
        .eq('is_read', false)
        .in('ticket_id', ids)

      setUnreadSupportCount(count || 0)
    }

    fetchUnreadSupport()

    // Clear badge immediately when the user opens a ticket
    const handleSupportRead = () => setUnreadSupportCount(0)
    window.addEventListener('support-read', handleSupportRead)

    const channel = supabase
      .channel(`support-badge-${restaurant.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, () => {
        fetchUnreadSupport()
      })
      .subscribe()

    return () => {
      window.removeEventListener('support-read', handleSupportRead)
      supabase.removeChannel(channel)
    }
  }, [restaurant, userType])

  // Initialize auto-sync once the restaurant is known
  useEffect(() => {
    if (!restaurant) return
    const cleanupSync = initAutoSync()
    return () => cleanupSync()
  }, [restaurant])

  // Pre-warm key pages into the service worker cache so they work offline
  // without requiring a prior visit. Runs once per session after the restaurant
  // slug is known, and only when the browser is online.
  useEffect(() => {
    if (!restaurant?.id || !restaurant?.slug || typeof window === 'undefined' || !navigator.onLine) return
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return

    const slug = restaurant.slug
    const origin = window.location.origin

    async function warmCache() {
      const urls = [
        // Primary operational pages (staff use daily)
        `${origin}/dashboard`,
        `${origin}/dashboard/orders`,
        `${origin}/dashboard/tables`,
        `${origin}/dashboard/floor-plan`,
        `${origin}/dashboard/tables-floor-plan`,
        `${origin}/dashboard/reservations`,
        `${origin}/dashboard/cash-drawer`,

        // Menu management
        `${origin}/dashboard/menu`,
        `${origin}/dashboard/menu/items`,
        `${origin}/dashboard/menu/categories`,

        // Staff & rota
        `${origin}/dashboard/staff`,
        `${origin}/dashboard/staff-members`,
        `${origin}/dashboard/rota`,
        `${origin}/dashboard/my-rota`,
        `${origin}/dashboard/my-availability`,
        `${origin}/dashboard/time-off-requests`,

        // Reports hub (index pages are static nav — cache the shells)
        `${origin}/dashboard/reports`,
        `${origin}/dashboard/reports/z-report`,
        `${origin}/dashboard/reports/x-report`,
        `${origin}/dashboard/reports/weekly`,
        `${origin}/dashboard/reports/monthly`,
        `${origin}/dashboard/reports/tax`,
        `${origin}/dashboard/reports/sales-balance`,
        `${origin}/dashboard/reports/stock-movement`,

        // Analytics hub
        `${origin}/dashboard/analytics`,
        `${origin}/dashboard/analytics/overview`,
        `${origin}/dashboard/analytics/tables`,
        `${origin}/dashboard/analytics/staff`,
        `${origin}/dashboard/analytics/labor`,
        `${origin}/dashboard/analytics/losses`,
        `${origin}/dashboard/analytics/losses/menu`,
        `${origin}/dashboard/analytics/losses/stock`,

        // Stock
        `${origin}/dashboard/stock`,
        `${origin}/dashboard/stock/products`,
        `${origin}/dashboard/stock/inventory`,
        `${origin}/dashboard/stock/purchasing-invoices`,
        `${origin}/dashboard/report-loss`,

        // Customers
        `${origin}/dashboard/customers`,

        // Settings hub pages (static nav, no data)
        `${origin}/dashboard/settings`,
        `${origin}/dashboard/settings/restaurant-info`,
        `${origin}/dashboard/settings/departments`,
        `${origin}/dashboard/settings/discounts`,
        `${origin}/dashboard/settings/payments`,
        `${origin}/dashboard/settings/security`,
        `${origin}/dashboard/settings/reservation-settings`,
        `${origin}/dashboard/settings/other-options`,
        `${origin}/dashboard/settings/offline-hub`,
        `${origin}/dashboard/settings/tax-invoicing`,
        `${origin}/dashboard/settings/product-tax`,
        `${origin}/dashboard/settings/billing`,
        `${origin}/dashboard/settings/staff-leave`,

        // Misc
        `${origin}/dashboard/guide`,
        `${origin}/dashboard/support`,

        // Customer-facing ordering + booking pages
        `${origin}/${slug}/menu`,
        `${origin}/${slug}/takeaway`,
        `${origin}/${slug}/book`,
      ]

      // Also pre-cache each table's ordering page
      try {
        const { data: tables } = await supabase
          .from('tables')
          .select('id')
          .eq('restaurant_id', restaurant.id)
        if (tables) {
          for (const table of tables) {
            urls.push(`${origin}/${slug}/table/${table.id}`)
          }
        }
      } catch (_) {
        // Non-blocking — table URLs simply won't be pre-cached
      }

      navigator.serviceWorker.controller.postMessage({
        type: 'PRECACHE_URLS',
        urls,
      })
    }

    warmCache()
  }, [restaurant?.id, restaurant?.slug])

  // Helper function to check if user has permission (used for mobile redirect)
  const checkPermission = useCallback((permissionId) => {
    if (userType === 'owner' || userType === 'staff-admin') {
      return true
    }
    return departmentPermissions.includes(permissionId)
  }, [userType, departmentPermissions])

  // Auto-redirect to priority page and enable full-width mode for staff (all devices)
  useEffect(() => {
    if (loading || initialRedirectDone) return
    if (userType !== 'staff' && userType !== 'staff-admin') return

    // Check if this is a fresh login (coming from staff login page)
    const isFirstLoad = sessionStorage.getItem('staff_redirect_done') !== 'true'
    if (!isFirstLoad) {
      setInitialRedirectDone(true)
      return
    }

    // Determine priority page based on permissions
    let priorityPage = null

    // Priority 1: Tables
    if (userType === 'staff-admin' || checkPermission('floor_plan')) {
      priorityPage = '/dashboard/tables'
    }
    // Priority 2: Orders
    else if (checkPermission('orders_kitchen') || checkPermission('orders_bar')) {
      priorityPage = '/dashboard/orders'
    }
    // Priority 3: My Rota
    else if (checkPermission('my_rota')) {
      priorityPage = '/dashboard/my-rota'
    }

    if (priorityPage && pathname !== priorityPage) {
      setFullWidthMode(true)
      setSidebarOpen(false) // Close sidebar for full-width view
      sessionStorage.setItem('staff_redirect_done', 'true')
      router.push(priorityPage)
    } else if (priorityPage) {
      setFullWidthMode(true)
      setSidebarOpen(false) // Close sidebar for full-width view
      sessionStorage.setItem('staff_redirect_done', 'true')
    }

    setInitialRedirectDone(true)
  }, [loading, userType, departmentPermissions, pathname, router, initialRedirectDone, checkPermission])

  // Re-fetch restaurant data on tab visibility change so suspensions take effect promptly
  useEffect(() => {
    if (userType !== 'owner' || isImpersonating) return
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()
        if (data) setRestaurant(data)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [userType, isImpersonating])

  const handleReturnToAdmin = () => {
    sessionStorage.removeItem('impersonation_session')
    router.push('/admin/restaurants')
  }

  const handleLogout = async () => {
    // Check if staff session exists to redirect to restaurant-specific login
    const staffSessionData = localStorage.getItem('staff_session')
    const sessionToken = localStorage.getItem('session_token')
    const deviceId = localStorage.getItem('device_id')
    let redirectUrl = '/'

    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        if (staffSession.restaurant && staffSession.restaurant.slug) {
          redirectUrl = `/r/${staffSession.restaurant.slug}/auth/staff-login`
        }

        // Delete the session from the database if we have a token
        if (sessionToken && staffSession.restaurant_id) {
          try {
            // Find and delete the session by querying with session token
            await fetch(`/api/sessions/validate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionToken,
                deviceId,
                action: 'logout'
              })
            })
          } catch (err) {
            console.error('Error deleting session:', err)
          }
        }
      } catch (err) {
        console.error('Error parsing staff session:', err)
      }
    }

    // Clear staff session and session token
    localStorage.removeItem('staff_session')
    localStorage.removeItem('session_token')
    // Clear redirect flag
    sessionStorage.removeItem('staff_redirect_done')
    // Sign out from Supabase auth (for owners/admins)
    await supabase.auth.signOut()
    router.push(redirectUrl)
  }

  // Toggle full-width mode
  const toggleFullWidth = () => {
    setFullWidthMode(!fullWidthMode)
    // Close sidebar when entering full-width mode
    if (!fullWidthMode) {
      setSidebarOpen(false)
    }
  }

  const getNavItems = () => {
    const items = []
    const modules = restaurant?.enabled_modules
    // If enabled_modules is not set at all, allow everything (legacy restaurants without the column).
    // If it is set (even as an empty object), only show explicitly-enabled modules.
    const hasModule = (name) => modules == null ? true : modules[name] === true

    // Helper function to check if staff has permission
    const hasPermission = (permissionId) => {
      // Owners and admin staff have all permissions
      if (userType === 'owner' || userType === 'staff-admin') {
        return true
      }

      // Regular staff: check department permissions
      return departmentPermissions.includes(permissionId)
    }

    // Overview - Check 'overview' permission
    if (hasPermission('overview')) {
      items.push({
        href: '/dashboard',
        labelKey: 'overview',
        label: 'Overview',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 13h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zm0 8h6c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1zm10 0h6c.55 0 1-.45 1-1v-8c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zM13 4v4c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1z"/>
          </svg>
        )
      })
    }

    // Orders - Check 'orders_kitchen' OR 'orders_bar' permission and ordering module
    if (hasModule('ordering') && (hasPermission('orders_kitchen') || hasPermission('orders_bar'))) {
      items.push({
        href: '/dashboard/orders',
        labelKey: 'orders',
        label: 'Orders',
        badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
          </svg>
        )
      })
    }


    // Tables - Check 'tables' permission and ordering module
    if (hasModule('ordering') && hasPermission('tables')) {
      items.push({
        href: '/dashboard/tables',
        labelKey: userType === 'owner' || userType === 'staff-admin' ? 'tablesQr' : 'tables',
        label: userType === 'owner' || userType === 'staff-admin' ? 'Tables & QR' : 'Tables',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 0H5v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zm6 0H5v4h4v-4zm2-8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zm6 0h-4v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4zm6 0h-4v4h4v-4z"/>
          </svg>
        )
      })
    }

    // Floor Plan - owners/staff-admins get the full editor
    if (hasModule('ordering') && (userType === 'owner' || userType === 'staff-admin')) {
      items.push({
        href: '/dashboard/floor-plan',
        labelKey: 'floorPlan',
        label: 'Floor Plan',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 2H9c-1.1 0-2 .9-2 2v5.5h2V4h10v16h-5v2h5c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM2 10v11c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2zm11 11H4v-2h9v2zm0-3.5H4v-2h9v2zM13 14H4v-2h9v2zm0-3.5H4V9h9v1.5z"/>
          </svg>
        )
      })
    }

    // Floor Plan - staff with permission get view-only page
    if (hasModule('ordering') && hasPermission('floor_plan') && userType !== 'owner' && userType !== 'staff-admin') {
      items.push({
        href: '/dashboard/tables-floor-plan',
        labelKey: 'floorPlan',
        label: 'Floor Plan',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 2H9c-1.1 0-2 .9-2 2v5.5h2V4h10v16h-5v2h5c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM2 10v11c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2zm11 11H4v-2h9v2zm0-3.5H4v-2h9v2zM13 14H4v-2h9v2zm0-3.5H4V9h9v1.5z"/>
          </svg>
        )
      })
    }

    // Reservations - Check 'reservations' permission and module
    if (hasModule('reservations') && hasPermission('reservations')) {
      items.push({
        href: '/dashboard/reservations',
        labelKey: 'reservations',
        label: 'Reservations',
        badge: pendingReservationsCount > 0 ? pendingReservationsCount : null,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
          </svg>
        )
      })
      items.push({
        href: '/dashboard/customers',
        labelKey: 'customers',
        label: 'Customers',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H8a2 2 0 0 0-2 2v2H4a1 1 0 0 0 0 2h2v2H4a1 1 0 0 0 0 2h2v2H4a1 1 0 0 0 0 2h2v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-6 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5 13H9v-.75C9 15.58 11.24 14 14 14s5 1.58 5 3.25V18z"/>
          </svg>
        )
      })
    }

    // Menu - Ordering module required; owners/admins always, or staff with 'menu' permission
    if (hasModule('ordering') && (userType === 'owner' || userType === 'staff-admin' || hasPermission('menu'))) {
      items.push({
        href: '/dashboard/menu',
        labelKey: 'menu',
        label: 'Menu',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        )
      })
    }

    // Stock - Ordering module required; owners/admins always, or staff with 'stock' permission
    if (hasModule('ordering') && (userType === 'owner' || userType === 'staff-admin' || hasPermission('stock'))) {
      items.push({
        href: '/dashboard/stock',
        labelKey: 'stock',
        label: 'Stock',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
          </svg>
        )
      })
    }

    // Report Loss - Check 'report_loss' permission and ordering module
    if (hasModule('ordering') && hasPermission('report_loss')) {
      items.push({
        href: '/dashboard/report-loss',
        labelKey: 'reportLoss',
        label: 'Report Loss',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        )
      })
    }

    // Staff & Rota - Manager view (owners and admin staff only), or staff with staff_rota permission
    if (hasModule('rota') && (userType === 'owner' || userType === 'staff-admin' || hasPermission('staff_rota'))) {
      items.push({
        href: '/dashboard/staff',
        labelKey: 'staffRota',
        label: 'Staff & Rota',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        )
      })
    }

    // My Rota - Check 'my_rota' permission (for staff only)
    if (hasModule('rota') && (userType === 'staff' || userType === 'staff-admin') && hasPermission('my_rota')) {
      items.push({
        href: '/dashboard/my-rota',
        labelKey: 'myRota',
        label: 'My Rota',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
          </svg>
        )
      })
    }

    if (userType === 'owner' || userType === 'staff-admin') {

      if (hasModule('analytics')) items.push({
        href: '/dashboard/analytics',
        labelKey: 'analytics',
        label: 'Analytics',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        )
      })

      // Reports - Dedicated report pages for quick access (Z-Report, X-Report, Weekly, Monthly, Tax)
      if (hasModule('reports')) items.push({
        href: '/dashboard/reports',
        labelKey: 'reports',
        label: 'Reports',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        )
      })
    } else if (hasModule('reports') && (hasPermission('reports') || hasPermission('z_report'))) {
      // Staff with reports or z_report permission
      items.push({
        href: '/dashboard/reports',
        labelKey: 'reports',
        label: 'Reports',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        )
      })
    }

    if (userType === 'owner' || userType === 'staff-admin') {
      items.push({
        href: '/dashboard/guide',
        labelKey: 'guide',
        label: 'Guide',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      })
    }

    if (userType === 'owner' || userType === 'staff-admin') {
      items.push({
        href: '/dashboard/support',
        labelKey: 'support',
        label: 'Support',
        badge: unreadSupportCount > 0 ? unreadSupportCount : null,
        badgeColor: 'bg-[#6262bd]',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
          </svg>
        )
      })
    }

    // Offline Hub — accessible to all staff so they can configure hub/spoke without owner login
    if (userType === 'staff' || userType === 'staff-admin') {
      items.push({
        href: '/dashboard/settings/offline-hub',
        labelKey: 'offlineHub',
        label: 'Offline Hub',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        )
      })
    }

    if (userType === 'owner') {
      items.push({
        href: '/dashboard/settings',
        labelKey: 'settings',
        label: 'Settings',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        )
      })
    }

    return items
  }

  const getUserLabel = () => {
    switch (userType) {
      case 'owner':
        return { text: 'Owner', class: 'bg-green-100 text-green-700' }
      case 'staff-admin':
        return { text: 'Restaurant Admin', class: 'bg-[#6262bd]/10 text-[#6262bd]' }
      case 'staff':
        return { text: 'Staff', class: 'bg-slate-100 text-slate-600' }
      default:
        return null
    }
  }

  const getDepartmentLabel = () => {
    if (!staffDepartment) return null

    // Predefined departments with emojis
    const predefinedDepartments = {
      'bar': { text: '🍸 Bar', class: 'bg-orange-100 text-orange-700' },
      'kitchen': { text: '🍳 Kitchen', class: 'bg-green-100 text-green-700' },
      'universal': { text: '🌐 Universal', class: 'bg-[#6262bd]/10 text-[#6262bd]' }
    }

    if (predefinedDepartments[staffDepartment]) {
      return predefinedDepartments[staffDepartment]
    }

    // For custom departments, generate color based on department name
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-yellow-100 text-yellow-700',
      'bg-indigo-100 text-indigo-700',
      'bg-teal-100 text-teal-700'
    ]

    const index = staffDepartment.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    const colorClass = colors[index] || 'bg-slate-100 text-slate-600'

    return {
      text: staffDepartment.charAt(0).toUpperCase() + staffDepartment.slice(1),
      class: colorClass
    }
  }

  // Must be before any conditional return (Rules of Hooks).
  // Prevents 60fps rAF re-renders from useInactivityTimeout creating a new
  // context object every frame and causing all consumers to re-render.
  const restaurantContextValue = useMemo(() => ({
    restaurant,
    userType,
    staffDepartment,
    departmentPermissions,
    isPlatformAdmin,
    enabledModules: restaurant?.enabled_modules || {},
  }), [restaurant, userType, staffDepartment, departmentPermissions, isPlatformAdmin])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="text-slate-500 dark:text-slate-400 mb-4">Loading...</div>
        {debug && (
          <pre className="bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-100 p-4 rounded text-xs max-w-2xl overflow-auto whitespace-pre-wrap">
            {debug}
          </pre>
        )}
      </div>
    )
  }

  const navItems = getNavItems()
  const userLabel = getUserLabel()
  const departmentLabel = getDepartmentLabel()
  const restaurantCurrency = restaurant?.invoice_settings?.currency || 'EUR'

  return (
    <GuideProvider>
    <CurrencyProvider currency={restaurantCurrency}>
    <LanguageProvider>
      <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex relative${isImpersonating ? ' pt-10' : ''}${!isOnline ? ' ring-2 ring-inset ring-amber-400 shadow-[inset_0_0_40px_rgba(251,191,36,0.08)]' : backOnline ? ' ring-2 ring-inset ring-green-400 shadow-[inset_0_0_40px_rgba(74,222,128,0.08)]' : ''} transition-shadow duration-500`}>

      {/* Connectivity banner — fixed so it's always visible even in full-width mode */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9990] bg-amber-400 text-amber-900 flex items-center justify-center px-6 py-1.5 text-xs font-semibold shadow-md pointer-events-none">
          <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
          </svg>
          No internet connection — offline mode active
        </div>
      )}
      {!isOnline ? null : backOnline && (
        <div className="fixed top-0 left-0 right-0 z-[9990] bg-green-500 text-white flex items-center justify-center px-6 py-1.5 text-xs font-semibold shadow-md pointer-events-none">
          <svg className="w-3.5 h-3.5 mr-1.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Back online
        </div>
      )}

      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-400 text-amber-900 flex items-center justify-between px-6 py-2 text-sm font-semibold shadow-md">
          <span>⚠ Impersonating: <strong>{impersonatedRestaurantName}</strong> · Viewing as Owner</span>
          <button
            onClick={handleReturnToAdmin}
            className="bg-amber-900 text-amber-100 px-4 py-1 rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors"
          >
            Return to Admin
          </button>
        </div>
      )}

      {/* Subscription warning banner */}
      {userType === 'owner' && !isImpersonating && pathname !== '/dashboard/settings/billing' && (() => {
        const accountStatus = restaurant?.status
        const subStatus = restaurant?.subscription_status
        const paymentFailedAt = restaurant?.payment_failed_at
        const graceDaysLeft = paymentFailedAt
          ? Math.max(-1, Math.ceil(3 - (new Date() - new Date(paymentFailedAt)) / (1000 * 60 * 60 * 24)))
          : null

        const lang = (restaurant?.email_language || 'en').split('-')[0].toLowerCase()
        const ui = {
          en: {
            suspended: 'Account suspended',
            suspendedDefault: 'Your account has been temporarily suspended by our team.',
            suspendedSub: "If you believe this is a mistake or need more information, please reach out — we're happy to help.",
            getInTouch: 'Get in touch',
            trialEnded: 'Your free trial has ended',
            trialEndedBody: 'We hope you enjoyed exploring Menu Hub! To continue using the app and keep access to all your modules, choose a plan and subscribe below.',
            viewPlans: 'View plans & subscribe',
            accessPaused: 'Access paused',
            accessPausedBody: 'Your payment method could not be charged and the grace period has passed. Please update your payment details to restore access.',
            updatePayment: 'Update payment method',
            paymentFailedBanner: (d) => `Payment failed — you have ${d} to update your payment method before access is paused.`,
            today: 'today', day: '1 day', days: (n) => `${n} days`,
            fixNow: 'Fix Now',
            trialBanner: (d) => `Your free trial ${d === 0 ? 'expires today' : `ends in ${d} day${d === 1 ? '' : 's'}`}. Subscribe to keep access.`,
            subscribe: 'Subscribe',
            cancelledBanner: 'Your subscription has been cancelled. Resubscribe to keep access.',
            resubscribe: 'Resubscribe',
          },
          ro: {
            suspended: 'Cont suspendat',
            suspendedDefault: 'Contul tău a fost suspendat temporar de echipa noastră.',
            suspendedSub: 'Dacă crezi că este o eroare sau ai nevoie de informații suplimentare, contactează-ne — suntem bucuroși să ajutăm.',
            getInTouch: 'Contactează-ne',
            trialEnded: 'Perioada ta de probă s-a încheiat',
            trialEndedBody: 'Sperăm că ți-a plăcut să explorezi Menu Hub! Pentru a continua să folosești aplicația, alege un plan și abonează-te mai jos.',
            viewPlans: 'Vezi planuri și abonează-te',
            accessPaused: 'Acces suspendat',
            accessPausedBody: 'Metoda ta de plată nu a putut fi debitată și perioada de grație a expirat. Te rugăm să actualizezi detaliile de plată pentru a restabili accesul.',
            updatePayment: 'Actualizează metoda de plată',
            paymentFailedBanner: (d) => `Plata a eșuat — mai ai ${d} să actualizezi metoda de plată înainte ca accesul să fie suspendat.`,
            today: 'astăzi', day: '1 zi', days: (n) => `${n} zile`,
            fixNow: 'Rezolvă acum',
            trialBanner: (d) => `Perioada de probă ${d === 0 ? 'expiră astăzi' : `se termină în ${d} ${d === 1 ? 'zi' : 'zile'}`}. Abonează-te pentru a păstra accesul.`,
            subscribe: 'Abonează-te',
            cancelledBanner: 'Abonamentul tău a fost anulat. Reabonează-te pentru a păstra accesul.',
            resubscribe: 'Reabonează-te',
          },
          fr: {
            suspended: 'Compte suspendu',
            suspendedDefault: 'Votre compte a été temporairement suspendu par notre équipe.',
            suspendedSub: "Si vous pensez qu'il s'agit d'une erreur ou si vous avez besoin d'informations, contactez-nous — nous sommes là pour vous aider.",
            getInTouch: 'Nous contacter',
            trialEnded: "Votre essai gratuit est terminé",
            trialEndedBody: "Nous espérons que vous avez apprécié Menu Hub ! Pour continuer à utiliser l'application, choisissez un plan et abonnez-vous ci-dessous.",
            viewPlans: 'Voir les plans et s\'abonner',
            accessPaused: 'Accès suspendu',
            accessPausedBody: "Votre moyen de paiement n'a pas pu être débité et la période de grâce est expirée. Veuillez mettre à jour vos coordonnées de paiement pour rétablir l'accès.",
            updatePayment: 'Mettre à jour le paiement',
            paymentFailedBanner: (d) => `Paiement échoué — vous avez ${d} pour mettre à jour votre moyen de paiement avant la suspension de l'accès.`,
            today: "aujourd'hui", day: '1 jour', days: (n) => `${n} jours`,
            fixNow: 'Résoudre',
            trialBanner: (d) => `Votre essai gratuit ${d === 0 ? 'expire aujourd\'hui' : `se termine dans ${d} jour${d === 1 ? '' : 's'}`}. Abonnez-vous pour garder l'accès.`,
            subscribe: "S'abonner",
            cancelledBanner: 'Votre abonnement a été annulé. Réabonnez-vous pour garder l\'accès.',
            resubscribe: 'Se réabonner',
          },
          it: {
            suspended: 'Account sospeso',
            suspendedDefault: 'Il tuo account è stato temporaneamente sospeso dal nostro team.',
            suspendedSub: "Se ritieni sia un errore o hai domande, contattaci — siamo felici di aiutarti.",
            getInTouch: 'Contattaci',
            trialEnded: 'La tua prova gratuita è terminata',
            trialEndedBody: 'Speriamo che Menu Hub ti sia piaciuto! Per continuare a usare l\'app, scegli un piano e abbonati qui sotto.',
            viewPlans: 'Vedi piani e abbonati',
            accessPaused: 'Accesso sospeso',
            accessPausedBody: 'Il tuo metodo di pagamento non ha potuto essere addebitato e il periodo di grazia è scaduto. Aggiorna i tuoi dati di pagamento per ripristinare l\'accesso.',
            updatePayment: 'Aggiorna pagamento',
            paymentFailedBanner: (d) => `Pagamento fallito — hai ${d} per aggiornare il tuo metodo di pagamento prima che l'accesso venga sospeso.`,
            today: 'oggi', day: '1 giorno', days: (n) => `${n} giorni`,
            fixNow: 'Risolvi ora',
            trialBanner: (d) => `La prova gratuita ${d === 0 ? 'scade oggi' : `termina tra ${d} ${d === 1 ? 'giorno' : 'giorni'}`}. Abbonati per mantenere l'accesso.`,
            subscribe: 'Abbonati',
            cancelledBanner: 'Il tuo abbonamento è stato annullato. Riabbonati per mantenere l\'accesso.',
            resubscribe: 'Riabbonati',
          },
          es: {
            suspended: 'Cuenta suspendida',
            suspendedDefault: 'Tu cuenta ha sido suspendida temporalmente por nuestro equipo.',
            suspendedSub: 'Si crees que es un error o tienes preguntas, contáctanos — estamos aquí para ayudar.',
            getInTouch: 'Contactar',
            trialEnded: 'Tu prueba gratuita ha terminado',
            trialEndedBody: '¡Esperamos que hayas disfrutado Menu Hub! Para seguir usando la app, elige un plan y suscríbete a continuación.',
            viewPlans: 'Ver planes y suscribirse',
            accessPaused: 'Acceso pausado',
            accessPausedBody: 'Tu método de pago no pudo ser cargado y el período de gracia ha expirado. Actualiza tus datos de pago para restaurar el acceso.',
            updatePayment: 'Actualizar método de pago',
            paymentFailedBanner: (d) => `Pago fallido — tienes ${d} para actualizar tu método de pago antes de que el acceso sea pausado.`,
            today: 'hoy', day: '1 día', days: (n) => `${n} días`,
            fixNow: 'Solucionar',
            trialBanner: (d) => `Tu prueba gratuita ${d === 0 ? 'expira hoy' : `termina en ${d} día${d === 1 ? '' : 's'}`}. Suscríbete para mantener el acceso.`,
            subscribe: 'Suscribirse',
            cancelledBanner: 'Tu suscripción ha sido cancelada. Vuelve a suscribirte para mantener el acceso.',
            resubscribe: 'Volver a suscribirse',
          },
        }
        const s = ui[lang] || ui.en
        const trialEnd = restaurant?.trial_ends_at
        const daysLeft = trialEnd
          ? Math.max(0, Math.ceil((new Date(trialEnd) - new Date()) / (1000 * 60 * 60 * 24)))
          : null

        // ── Account deleted (soft-deleted, awaiting recovery) ─────────────────
        if (restaurant?.deleted_at) {
          const alreadyRequested = recoveryRequested || !!restaurant?.recovery_requested_at
          const handleRecoveryRequest = async () => {
            if (alreadyRequested || recoveryLoading) return
            setRecoveryLoading(true)
            try {
              await fetch('/api/notifications/recovery-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ restaurantId: restaurant.id }),
              })
              setRecoveryRequested(true)
            } catch {}
            setRecoveryLoading(false)
          }
          return (
            <div className="fixed inset-0 z-[9997] flex items-center justify-center p-6" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,23,42,0.75)' }}>
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-2 border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Your account is currently restricted</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
                  This account has been deactivated. You can request to recover it — our team will review and get back to you.
                </p>
                {alreadyRequested ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
                    <p className="text-green-700 dark:text-green-300 text-sm font-medium">Recovery request sent! Our team has been notified and will be in touch shortly.</p>
                  </div>
                ) : (
                  <button
                    onClick={handleRecoveryRequest}
                    disabled={recoveryLoading}
                    className="block w-full py-3 px-6 bg-[#6262bd] hover:bg-[#5151a8] text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-[#6262bd]/20 mb-3 disabled:opacity-60"
                  >
                    {recoveryLoading ? 'Sending request…' : 'Request account recovery'}
                  </button>
                )}
                <a
                  href="mailto:support@venoapp.com?subject=Menu Hub - Account Recovery"
                  className="block w-full py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors"
                >
                  Get in touch
                </a>
              </div>
            </div>
          )
        }

        // ── Account suspended by admin ────────────────────────────────────────
        if (accountStatus === 'rejected') {
          const msg = restaurant?.suspension_message
          return (
            <div className="fixed inset-0 z-[9997] flex items-center justify-center p-6" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,23,42,0.75)' }}>
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-2 border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{s.suspended}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-2">
                  {msg || s.suspendedDefault}
                </p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-7">
                  {s.suspendedSub}
                </p>
                <a
                  href="mailto:support@venoapp.com?subject=Menu Hub - Account suspended"
                  className="block w-full py-3 px-6 bg-[#6262bd] hover:bg-[#5151a8] text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-[#6262bd]/20"
                >
                  {s.getInTouch}
                </a>
              </div>
            </div>
          )
        }

        // ── Reinstated account — no modules, needs to subscribe ──────────────
        // Reinstated users have status=approved, trialing, no trial_ends_at, all modules false
        if (
          accountStatus === 'approved' &&
          subStatus === 'trialing' &&
          daysLeft === null &&
          restaurant?.enabled_modules &&
          !Object.values(restaurant.enabled_modules).some(Boolean) &&
          pathname !== '/dashboard/settings/billing'
        ) {
          return (
            <div className="fixed inset-0 z-[9997] flex items-center justify-center p-6" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,23,42,0.7)' }}>
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-2 border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 rounded-full bg-[#6262bd]/10 dark:bg-[#6262bd]/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Welcome back!</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-7">
                  Your account has been reinstated. To get started, choose a plan and subscribe below.
                </p>
                <a
                  href="/dashboard/settings/billing"
                  className="block w-full py-3 px-6 bg-[#6262bd] hover:bg-[#5151a8] text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-[#6262bd]/20"
                >
                  {s.viewPlans}
                </a>
              </div>
            </div>
          )
        }

        // ── Trial expired ─────────────────────────────────────────────────────
        if (subStatus === 'trialing' && daysLeft !== null && daysLeft === 0) {
          return (
            <div className="fixed inset-0 z-[9997] flex items-center justify-center p-6" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,23,42,0.7)' }}>
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-2 border-slate-100 dark:border-slate-700">
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{s.trialEnded}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-7">
                  {s.trialEndedBody}
                </p>
                <a
                  href="/dashboard/settings/billing"
                  className="block w-full py-3 px-6 bg-[#6262bd] hover:bg-[#5151a8] text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-[#6262bd]/20 mb-3"
                >
                  {s.viewPlans}
                </a>
                <a
                  href="mailto:support@venoapp.com?subject=Menu Hub - Trial enquiry"
                  className="block w-full py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors"
                >
                  {s.getInTouch}
                </a>
              </div>
            </div>
          )
        }

        // ── Payment failed / grace period ─────────────────────────────────────
        if (subStatus === 'past_due' || subStatus === 'unpaid') {
          // After 3-day grace: full blocking overlay
          if (graceDaysLeft !== null && graceDaysLeft < 0) {
            return (
              <div className="fixed inset-0 z-[9997] flex items-center justify-center p-6" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,23,42,0.75)' }}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border-2 border-slate-100 dark:border-slate-700">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
                    <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{s.accessPaused}</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-7">
                    {s.accessPausedBody}
                  </p>
                  <a
                    href="/dashboard/settings/billing"
                    className="block w-full py-3 px-6 bg-[#6262bd] hover:bg-[#5151a8] text-white rounded-xl font-semibold text-sm transition-colors shadow-md shadow-[#6262bd]/20 mb-3"
                  >
                    {s.updatePayment}
                  </a>
                  <a
                    href="mailto:support@venoapp.com?subject=Menu Hub - Payment issue"
                    className="block w-full py-3 px-6 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-colors"
                  >
                    {s.getInTouch}
                  </a>
                </div>
              </div>
            )
          }
          // Within grace period: amber countdown banner
          const daysText = graceDaysLeft === 0
            ? s.today
            : graceDaysLeft === 1 ? s.day : s.days(graceDaysLeft)
          return (
            <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-500 text-white flex items-center justify-between px-6 py-2 text-sm font-semibold shadow-md">
              <span>{s.paymentFailedBanner(daysText)}</span>
              <a href="/dashboard/settings/billing" className="bg-white text-amber-600 px-4 py-1 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors flex-shrink-0 ml-4">{s.fixNow}</a>
            </div>
          )
        }
        if (subStatus === 'canceled') {
          return (
            <div className="fixed top-0 left-0 right-0 z-[9998] bg-slate-700 text-white flex items-center justify-between px-6 py-2 text-sm font-semibold shadow-md">
              <span>{s.cancelledBanner}</span>
              <a href="/dashboard/settings/billing" className="bg-white text-slate-700 px-4 py-1 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">{s.resubscribe}</a>
            </div>
          )
        }
        if (subStatus === 'trialing' && daysLeft !== null && daysLeft <= 7) {
          return (
            <div className="fixed top-0 left-0 right-0 z-[9998] bg-amber-400 text-amber-900 flex items-center justify-between px-6 py-2 text-sm font-semibold shadow-md">
              <span>{s.trialBanner(daysLeft)}</span>
              <a href="/dashboard/settings/billing" className="bg-amber-900 text-amber-100 px-4 py-1 rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors">{s.subscribe}</a>
            </div>
          )
        }
        return null
      })()}

      {/* Overlay when sidebar is expanded on mobile */}
      {sidebarOpen && !fullWidthMode && isSmallScreen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Full-width mode floating buttons */}
      {fullWidthMode && (
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Open menu"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>
          <button
            onClick={toggleFullWidth}
            className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            title="Exit full-width mode"
          >
            <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col h-screen
        bg-white dark:bg-slate-900 border-r-2 border-slate-100 dark:border-slate-800
        transition-all duration-300 ease-in-out overflow-hidden
        ${fullWidthMode ? '-translate-x-full' : 'translate-x-0'}
        ${sidebarOpen ? 'w-72' : 'w-16'}
      `}>
        <div className={`border-b-2 border-slate-100 dark:border-slate-800 ${sidebarOpen ? 'p-6' : 'py-4 px-2'}`}>
          <div className={`flex items-center ${sidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {sidebarOpen ? (
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {(userType === 'staff' || userType === 'staff-admin') ? (
                  <div className="flex flex-col items-center w-full">
                    {staffAvatar ? (
                      <img src={staffAvatar} alt={staffName} className="w-14 h-14 rounded-full object-cover border-2 border-[#6262bd]/20" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#6262bd]/10 dark:bg-[#6262bd]/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                    <span className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-full text-center">
                      {staffName || restaurant?.name || 'Veno App'}
                    </span>
                  </div>
                ) : restaurant?.logo_url ? (
                  <>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800 flex-shrink-0">
                      <img
                        src={restaurant.logo_url}
                        alt={restaurant.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <span className="text-xl font-bold text-slate-700 dark:text-slate-200 truncate">
                      {restaurant?.name || 'Veno App'}
                    </span>
                  </>
                ) : (
                  <PlatformLogo size="md" />
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                {(userType === 'staff' || userType === 'staff-admin') ? (
                  staffAvatar ? (
                    <img src={staffAvatar} alt={staffName} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )
                ) : restaurant?.logo_url ? (
                  <img src={restaurant.logo_url} alt={restaurant.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <PlatformLogo size="sm" />
                )}
              </div>
            )}
            {/* Collapse/expand toggle */}
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
                title="Collapse sidebar"
              >
                <svg className="w-5 h-5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto ${sidebarOpen ? 'p-4' : 'py-4 px-2'}`}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)
              return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={!sidebarOpen ? item.label : undefined}
                  className={`relative flex items-center rounded-xl font-medium transition-colors ${
                    sidebarOpen ? 'justify-between px-4 py-2.5' : 'justify-center p-3'
                  } ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {sidebarOpen ? (
                    <>
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span>{item.labelKey ? <NavLabel labelKey={item.labelKey} /> : item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                          item.badgeColor || (item.labelKey === 'orders' ? 'bg-primary' : 'bg-red-500')
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="relative">
                      {item.icon}
                      {item.badge && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            )})}

            {isPlatformAdmin && (
              <li className={`${sidebarOpen ? 'pt-4 mt-4' : 'pt-2 mt-2'} border-t border-slate-100 dark:border-slate-800`}>
                <Link
                  href="/admin"
                  title={!sidebarOpen ? 'Platform Admin' : undefined}
                  className={`flex items-center rounded-xl font-medium text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors ${
                    sidebarOpen ? 'space-x-3 px-4 py-3' : 'justify-center p-3'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                  {sidebarOpen && <span><NavLabel labelKey="platformAdmin" /></span>}
                </Link>
              </li>
            )}
          </ul>

          {/* Expand button at bottom of nav when collapsed */}
          {!sidebarOpen && (
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
              <button
                onClick={() => setSidebarOpen(true)}
                title="Expand sidebar"
                className="p-3 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </button>
            </div>
          )}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-800 mt-auto flex-shrink-0">
          {sidebarOpen ? (
            <>
              {/* Hub Connection Status for staff users */}
              {(userType === 'staff' || userType === 'staff-admin') && restaurant && (
                <div className="px-4 pt-3">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <HubConnectionStatus restaurantId={restaurant.id} />
                  </div>
                </div>
              )}

              {/* User info row */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate leading-tight">{restaurant?.name}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {userLabel && (
                      <span className={`inline-block px-1.5 py-0 rounded text-xs font-medium ${userLabel.class}`}>
                        {userLabel.text}
                      </span>
                    )}
                    {departmentLabel && (
                      <span className={`inline-block px-1.5 py-0 rounded text-xs font-medium ${departmentLabel.class}`}>
                        {departmentLabel.text}
                      </span>
                    )}
                  </div>
                </div>
                <NotificationBell />
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-1 px-4 pb-3">
                <div className="flex-1">
                  <LanguageSelector className="w-full" />
                </div>
                {isStaffUser && (
                  <InactivityRing
                    progress={inactivityProgress}
                    timeRemaining={inactivityTimeRemaining}
                    setting={inactivitySetting}
                    onSettingChange={updateInactivitySetting}
                    sidebarOpen={false}
                  />
                )}
                <GuideToggle />
                <ThemeToggle />
              </div>

              {/* Logout button */}
              <div className="px-4 pb-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                  Log out
                </button>
              </div>
            </>
          ) : (
            /* Collapsed bottom cluster: language + theme + guide + notification + red logout dot */
            <div className="flex flex-col items-center gap-1 py-3">
              <LanguageSelector collapsed />
              <GuideToggle collapsed />
              <ThemeToggle />
              <NotificationBell />
              {isStaffUser && (
                <InactivityRing
                  progress={inactivityProgress}
                  timeRemaining={inactivityTimeRemaining}
                  setting={inactivitySetting}
                  onSettingChange={updateInactivitySetting}
                  sidebarOpen={false}
                />
              )}
              <button
                onClick={handleLogout}
                title="Log out"
                className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-md mt-1"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={`
        flex-1
        ${fullWidthMode ? 'ml-0' : sidebarOpen ? 'ml-72' : 'ml-16'}
        ${fullWidthMode ? 'p-4' : 'p-4 md:p-8'}
        ${debug ? 'mt-10' : ''}
        transition-all duration-300
      `}>
        {/* Full-width wrapper for the content */}
        <div className={`${fullWidthMode ? 'h-[calc(100vh-4rem)] overflow-auto' : ''}`}>
          <RestaurantProvider value={restaurantContextValue}>
            {children}
          </RestaurantProvider>
        </div>
      </main>

      {/* Offline Indicator */}
      <OfflineIndicator />
      </div>
    </LanguageProvider>
    </CurrencyProvider>
    </GuideProvider>
  )
}