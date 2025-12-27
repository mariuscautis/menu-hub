'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'

export default function DashboardLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [userType, setUserType] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [staffDepartment, setStaffDepartment] = useState(null)
  const [departmentPermissions, setDepartmentPermissions] = useState([])
  const [debug, setDebug] = useState('')
  const [expandedMenus, setExpandedMenus] = useState({
    analytics: true // Analytics menu starts expanded
  })
  const [pendingReservationsCount, setPendingReservationsCount] = useState(0)
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)

  // Helper function to fetch department permissions
  const fetchDepartmentPermissions = async (restaurantId, department) => {
    if (!restaurantId || !department) return []

    try {
      const { data, error } = await supabase
        .from('department_permissions')
        .select('permissions')
        .eq('restaurant_id', restaurantId)
        .eq('department_name', department)
        .single()

      if (error) {
        console.error('Error fetching department permissions:', error)
        return []
      }

      return data?.permissions || []
    } catch (err) {
      console.error('Error in fetchDepartmentPermissions:', err)
      return []
    }
  }

  useEffect(() => {
    const init = async () => {
      // Check for staff session first (PIN-based login)
      const staffSessionData = localStorage.getItem('staff_session')
      if (staffSessionData) {
        try {
          const staffSession = JSON.parse(staffSessionData)

          // Fetch fresh restaurant data to get the latest logo
          const { data: freshRestaurant } = await supabase
            .from('restaurants')
            .select('id, name, slug, logo_url')
            .eq('id', staffSession.restaurant_id)
            .single()

          // Use fresh restaurant data if available, otherwise fall back to cached
          setRestaurant(freshRestaurant || staffSession.restaurant)
          const staffType = staffSession.role === 'admin' ? 'staff-admin' : 'staff'
          setUserType(staffType)
          setUserEmail(staffSession.email)
          const dept = staffSession.department || 'universal'
          setStaffDepartment(dept)

          // Fetch department permissions (only for regular staff, not admins)
          if (staffType === 'staff') {
            const permissions = await fetchDepartmentPermissions(staffSession.restaurant_id, dept)
            setDepartmentPermissions(permissions)
          }

          setLoading(false)
          return
        } catch (err) {
          // Invalid session, clear it
          localStorage.removeItem('staff_session')
        }
      }

      // Check for owner/admin auth session
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUserEmail(user.email)
      let debugText = `User: ${user.email} (${user.id})\n\n`

      // Check if platform admin
      const { data: admin } = await supabase
        .from('admins')
        .select('id')
        .eq('user_id', user.id)

      const isPlatAdmin = admin && admin.length > 0
      setIsPlatformAdmin(isPlatAdmin)
      debugText += `Platform Admin: ${isPlatAdmin}\n\n`

      // Check if restaurant owner
      const { data: ownedRestaurant, error: ownedError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

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
    }

    init()
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
      // Count order items that haven't been started (preparing_started_at is null)
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          id,
          preparing_started_at,
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
        setPendingOrdersCount(data.length)
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

  const handleLogout = async () => {
    // Check if staff session exists to redirect to restaurant-specific login
    const staffSessionData = localStorage.getItem('staff_session')
    let redirectUrl = '/'

    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        if (staffSession.restaurant && staffSession.restaurant.slug) {
          redirectUrl = `/r/${staffSession.restaurant.slug}/auth/staff-login`
        }
      } catch (err) {
        console.error('Error parsing staff session:', err)
      }
    }

    // Clear staff session
    localStorage.removeItem('staff_session')
    // Sign out from Supabase auth (for owners/admins)
    await supabase.auth.signOut()
    router.push(redirectUrl)
  }

  const getNavItems = () => {
    const items = []

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
        label: 'Overview',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 13h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zm0 8h6c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1zm10 0h6c.55 0 1-.45 1-1v-8c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1zM13 4v4c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1z"/>
          </svg>
        )
      })
    }

    // Orders - Check 'orders_kitchen' OR 'orders_bar' permission
    if (hasPermission('orders_kitchen') || hasPermission('orders_bar')) {
      items.push({
        href: '/dashboard/orders',
        label: 'Orders',
        badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
          </svg>
        )
      })
    }

    // Tables - Check 'tables' permission
    if (hasPermission('tables')) {
      items.push({
        href: '/dashboard/tables',
        label: userType === 'owner' || userType === 'staff-admin' ? 'Tables & QR' : 'Tables',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 0H5v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zm6 0H5v4h4v-4zm2-8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zm6 0h-4v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4zm6 0h-4v4h4v-4z"/>
          </svg>
        )
      })
    }

    // Reservations - Check 'reservations' permission
    if (hasPermission('reservations')) {
      items.push({
        href: '/dashboard/reservations',
        label: 'Reservations',
        badge: pendingReservationsCount > 0 ? pendingReservationsCount : null,
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
          </svg>
        )
      })
    }

    // Menu and Stock - Only for owners and admins (always show for them)
    if (userType === 'owner' || userType === 'staff-admin') {
      items.push({
        href: '/dashboard/menu',
        label: 'Menu',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          </svg>
        )
      })

      items.push({
        href: '/dashboard/stock',
        label: 'Stock',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
          </svg>
        )
      })
    }

    // Report Loss - Check 'report_loss' permission
    if (hasPermission('report_loss')) {
      items.push({
        href: '/dashboard/report-loss',
        label: 'Report Loss',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        )
      })
    }

    // Staff & Rota - Manager view (owners and admin staff only)
    if (userType === 'owner' || userType === 'staff-admin') {
      items.push({
        href: '/dashboard/staff',
        label: 'Staff & Rota',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
          </svg>
        ),
        id: 'staff-rota',
        children: [
          {
            href: '/dashboard/staff',
            label: 'Staff Members',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/rota',
            label: 'Rota',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/settings/departments',
            label: 'Departments',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )
          }
        ]
      })
    }

    // My Rota - Check 'my_rota' permission (for staff only)
    if ((userType === 'staff' || userType === 'staff-admin') && hasPermission('my_rota')) {
      items.push({
        href: '/dashboard/my-rota',
        label: 'My Rota',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
          </svg>
        )
      })
    }

    // My Availability - Check 'my_availability' permission (for staff only)
    if ((userType === 'staff' || userType === 'staff-admin') && hasPermission('my_availability')) {
      items.push({
        href: '/dashboard/my-availability',
        label: 'My Availability',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
          </svg>
        )
      })
    }

    if (userType === 'owner' || userType === 'staff-admin') {

      items.push({
        href: '/dashboard/analytics',
        label: 'Analytics',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
        ),
        id: 'analytics',
        children: [
          {
            href: '/dashboard/analytics',
            label: 'Overall',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/analytics/tables',
            label: 'Table Analytics',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 0H5v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zm6 0H5v4h4v-4zm2-8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zm6 0h-4v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4zm6 0h-4v4h4v-4z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/analytics/staff',
            label: 'Staff Analytics',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/analytics/losses',
            label: 'Losses',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/analytics/labor',
            label: 'Labor Analytics',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            )
          }
        ]
      })
    }

    if (userType === 'owner') {
      items.push({
        href: '/dashboard/settings/restaurant-info',
        label: 'Settings',
        icon: (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        ),
        id: 'settings',
        children: [
          {
            href: '/dashboard/settings/restaurant-info',
            label: 'Restaurant Info',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/settings/tax-invoicing',
            label: 'Tax & Invoicing',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/settings/product-tax',
            label: 'Product Tax',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
              </svg>
            )
          },
          {
            href: '/dashboard/settings/security',
            label: 'Security & Auth',
            icon: (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/>
              </svg>
            )
          }
        ]
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="text-slate-500 mb-4">Loading...</div>
        {debug && (
          <pre className="bg-yellow-100 p-4 rounded text-xs max-w-2xl overflow-auto whitespace-pre-wrap">
            {debug}
          </pre>
        )}
      </div>
    )
  }

  const navItems = getNavItems()
  const userLabel = getUserLabel()
  const departmentLabel = getDepartmentLabel()

  return (
    <div className="min-h-screen bg-slate-50 flex">
  

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r-2 border-slate-100 flex flex-col`}>
        <div className="p-6 border-b-2 border-slate-100">
          <div className="flex items-center space-x-2">
            {restaurant?.logo_url ? (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-slate-50">
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 bg-[#6262bd] rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">M</span>
              </div>
            )}
            <span className="text-xl font-bold text-slate-700">
              {restaurant?.name || 'Menu Hub'}
            </span>
          </div>
        </div>

        <nav className="p-4">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                {item.children ? (
                  // Menu item with children (submenu)
                  <div>
                    <div
                      onClick={() => setExpandedMenus(prev => ({
                        ...prev,
                        [item.id]: !prev[item.id]
                      }))}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors cursor-pointer ${
                        pathname.startsWith(item.href)
                          ? 'bg-[#6262bd]/10 text-[#6262bd]'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          expandedMenus[item.id] ? 'rotate-180' : ''
                        }`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M7 10l5 5 5-5z"/>
                      </svg>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expandedMenus[item.id] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <ul className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className={`flex items-center space-x-3 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                pathname === child.href
                                  ? 'bg-[#6262bd]/10 text-[#6262bd]'
                                  : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {child.icon}
                              <span>{child.label}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  // Regular menu item without children
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${
                      pathname === item.href
                        ? 'bg-[#6262bd]/10 text-[#6262bd]'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                        item.label === 'Orders' ? 'bg-[#6262bd]' : 'bg-red-500'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </li>
            ))}

            {isPlatformAdmin && (
              <li className="pt-4 mt-4 border-t border-slate-100">
                <Link
                  href="/admin"
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                  <span>Platform Admin</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <div className="p-4 border-t-2 border-slate-100">
          <div className="px-4 py-3 mb-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 truncate">{restaurant?.name}</p>
                <p className="text-xs text-slate-400 truncate">{userEmail}</p>
              </div>
              <NotificationBell />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {userLabel && (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${userLabel.class}`}>
                  {userLabel.text}
                </span>
              )}
              {departmentLabel && (
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${departmentLabel.class}`}>
                  {departmentLabel.text}
                </span>
              )}
            </div>
          </div>
          {(userType === 'staff' || userType === 'staff-admin') ? (
            <button
              onClick={handleLogout}
              className="w-full bg-red-500 text-white px-4 py-4 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span>SIGN OUT</span>
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span>Logout</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className={`flex-1 p-8 ${debug ? 'mt-10' : ''}`}>
        {children}
      </main>
    </div>
  )
}