'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import InvoiceClientModal from '@/components/invoices/InvoiceClientModal'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { generateInvoicePdfBase64, downloadInvoicePdf } from '@/lib/invoicePdfGenerator'
import { getPendingOrders, getOrderItems as getOfflineOrderItems } from '@/lib/offlineQueue'
import { onSyncEvent, initAutoSync } from '@/lib/syncManager'
import { useOrderSounds } from '@/hooks/useOrderSounds'

export default function Orders() {
  const t = useTranslations('orders')
  const tc = useTranslations('common')
  const [orders, setOrders] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
  const [userType, setUserType] = useState(null) // 'owner' or 'staff'
  const [staffDepartment, setStaffDepartment] = useState(null) // staff department filter
  const [departmentPermissions, setDepartmentPermissions] = useState([]) // department permissions
  const [menuItems, setMenuItems] = useState([]) // menu items with departments
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState(null)

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceOrderId, setInvoiceOrderId] = useState(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [notification, setNotification] = useState(null)

  // Takeaway state
  const [orderTypeFilter, setOrderTypeFilter] = useState('all') // 'all', 'dine_in', 'takeaway'
  const [markingReady, setMarkingReady] = useState(null) // orderId being marked ready
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [pickupOrderId, setPickupOrderId] = useState(null)

  // Offline orders state
  const [offlineOrders, setOfflineOrders] = useState([])

  // Sound notifications
  const { playNewOrderSound, resumeAudio, soundSettings } = useOrderSounds(restaurant?.id)
  const knownOrderIdsRef = useRef(new Set())
  const isInitialLoadRef = useRef(true)
  const menuItemsRef = useRef([])
  const playNewOrderSoundRef = useRef(playNewOrderSound)

  // Keep sound function ref updated
  useEffect(() => {
    playNewOrderSoundRef.current = playNewOrderSound
  }, [playNewOrderSound])

  useEffect(() => {
    const fetchData = async () => {
      let restaurantData = null
      let userTypeData = null
      let departmentData = null

      // Check for staff session first (PIN-based login)
      const staffSessionData = localStorage.getItem('staff_session')
      if (staffSessionData) {
        try {
          const staffSession = JSON.parse(staffSessionData)
          restaurantData = staffSession.restaurant
          userTypeData = staffSession.role === 'admin' ? 'owner' : 'staff'
          departmentData = staffSession.department || 'universal'
          setUserType(userTypeData)
          setStaffDepartment(departmentData)
        } catch (err) {
          console.error('Error parsing staff session:', err)
          localStorage.removeItem('staff_session')
        }
      }

      // If not staff session, check for owner auth session
      if (!restaurantData) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        // Check if owner
        const { data: ownedRestaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (ownedRestaurant) {
          restaurantData = ownedRestaurant
          userTypeData = 'owner'
          departmentData = null // Owners see all
          setUserType(userTypeData)
          setStaffDepartment(departmentData)
        } else {
          // Check if staff by user_id (preferred) or email (fallback)
          const { data: staffRecords } = await supabase
            .from('staff')
            .select('*, restaurants(*)')
            .or(`user_id.eq.${user.id},email.eq.${user.email}`)
            .eq('status', 'active')

          const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null

          if (staffRecord && staffRecord.restaurants) {
            restaurantData = staffRecord.restaurants
            userTypeData = 'staff'
            departmentData = staffRecord.department || 'universal'
            setUserType(userTypeData)
            setStaffDepartment(departmentData)
          }
        }
      }

      if (!restaurantData) {
        setLoading(false)
        return
      }

      setRestaurant(restaurantData)

      // Fetch menu items to get departments
      const { data: items } = await supabase
        .from('menu_items')
        .select('id, name, department')
        .eq('restaurant_id', restaurantData.id)

      setMenuItems(items || [])
      menuItemsRef.current = items || []

      // Fetch department permissions for regular staff
      if (userTypeData === 'staff' && departmentData) {
        const { data: deptPerms } = await supabase
          .from('department_permissions')
          .select('permissions')
          .eq('restaurant_id', restaurantData.id)
          .eq('department_name', departmentData)
          .single()

        setDepartmentPermissions(deptPerms?.permissions || [])
      }

      await fetchOrders(restaurantData.id)
      setLoading(false)

      // Mark initial load complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 2000)
    }

    fetchData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Real-time subscription for orders - separate useEffect for proper cleanup
  useEffect(() => {
    if (!restaurant) return

    const restaurantId = restaurant.id
    console.log('🔔 Setting up real-time subscription for restaurant:', restaurantId)

    const channel = supabase
      .channel(`orders-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload) => {
          // New order inserted - fetch full order with items and play sound
          console.log('🔔 New order INSERT event received:', payload.new?.id)
          const newOrderId = payload.new?.id
          if (newOrderId && !knownOrderIdsRef.current.has(newOrderId)) {
            knownOrderIdsRef.current.add(newOrderId)
            console.log('🔔 New order detected (not in known list):', newOrderId)

            // Fetch the full order with items to determine department
            const { data: newOrder } = await supabase
              .from('orders')
              .select(`
                *,
                order_items (
                  id,
                  menu_item_id,
                  name
                )
              `)
              .eq('id', newOrderId)
              .single()

            console.log('🔔 Fetched new order:', newOrder?.id, 'isInitialLoad:', isInitialLoadRef.current)

            if (newOrder && !isInitialLoadRef.current) {
              // Play sound based on order type/department
              console.log('🔔 Calling playNewOrderSound')
              playNewOrderSoundRef.current(newOrder, menuItemsRef.current)
            }
          } else {
            console.log('🔔 Order already known or no ID:', newOrderId)
          }
          // Delay fetch to ensure database has committed
          setTimeout(() => fetchOrders(restaurantId), 100)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          console.log('🔔 Order UPDATE event received')
          setTimeout(() => fetchOrders(restaurantId), 100)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        () => {
          console.log('🔔 Order DELETE event received')
          setTimeout(() => fetchOrders(restaurantId), 100)
        }
      )
      .subscribe((status) => {
        console.log('🔔 Orders subscription status:', status)
      })

    return () => {
      console.log('🔔 Cleaning up orders subscription')
      supabase.removeChannel(channel)
    }
  }, [restaurant])

  // Load offline (pending sync) orders and listen for sync changes
  useEffect(() => {
    if (!restaurant) return

    const loadOfflineOrders = async () => {
      try {
        const pending = await getPendingOrders(restaurant.id)
        // For each pending order, also load its items
        const ordersWithItems = await Promise.all(
          pending.map(async (order) => {
            const items = await getOfflineOrderItems(order.client_id)
            return {
              ...order,
              id: `offline-${order.client_id}`,
              _isOffline: true,
              created_at: order.created_at,
              order_items: items.map((item) => ({
                ...item,
                price_at_time: item.price_at_time,
              })),
              tables: null,
            }
          })
        )
        setOfflineOrders(ordersWithItems)
      } catch (err) {
        console.error('Failed to load offline orders:', err)
      }
    }

    loadOfflineOrders()

    const cleanupAutoSync = initAutoSync()

    // Refresh offline orders after sync completes
    const unsubComplete = onSyncEvent('sync-complete', () => {
      loadOfflineOrders()
      // Also refresh server orders to pick up newly synced ones
      fetchOrders(restaurant.id)
    })

    return () => {
      cleanupAutoSync()
      unsubComplete()
    }
  }, [restaurant])

  const fetchOrders = async (restaurantId) => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        tables (table_number),
        order_items (
          *,
          preparing_started_at,
          marked_ready_at,
          delivered_at
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    console.log('📦 Fetched orders:', data?.length)
    if (data && data.length > 0) {
      console.log('📦 First order items:', data[0].order_items?.map(i => ({
        id: i.id,
        preparing_started_at: i.preparing_started_at,
        marked_ready_at: i.marked_ready_at
      })))
    }

    // Track known order IDs for sound notification detection
    if (data) {
      data.forEach(order => {
        knownOrderIdsRef.current.add(order.id)
      })
    }

    setOrders(data || [])
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    // Immediately refetch orders to update UI
    if (restaurant) {
      fetchOrders(restaurant.id)
    }
  }

  // Mark department as preparing
  const startPreparingDepartment = async (orderId, department) => {
    try {
      // Get order items for this department
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          order_items (
            id,
            menu_item_id,
            preparing_started_at
          )
        `)
        .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError

      // Filter items by department
      const itemsToStart = order.order_items.filter(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id)
        return menuItem?.department === department && !item.preparing_started_at
      })

      if (itemsToStart.length === 0) {
        showNotification('info', t('noItemsToStart').replace('{department}', t(department)))
        return
      }

      // Update preparing_started_at for these items
      console.log('Updating order_items with IDs:', itemsToStart.map(item => item.id))
      const updatePayload = { preparing_started_at: new Date().toISOString() }
      console.log('Update payload:', updatePayload)

      // Try updating WITHOUT .select() to see if that's the issue
      const { error: updateError, count } = await supabase
        .from('order_items')
        .update(updatePayload)
        .in('id', itemsToStart.map(item => item.id))

      console.log('Update result - error:', updateError)
      console.log('Update result - count:', count)

      if (updateError) {
        console.error('UPDATE ERROR DETAILS:', JSON.stringify(updateError, null, 2))
        throw updateError
      }

      // Verify the update worked by fetching the item directly
      const { data: verifyData, error: verifyError } = await supabase
        .from('order_items')
        .select('id, preparing_started_at')
        .in('id', itemsToStart.map(item => item.id))

      console.log('Verification SELECT - data:', verifyData)
      console.log('Verification SELECT - error:', verifyError)

      if (!verifyData || verifyData.length === 0) {
        console.error('VERIFICATION FAILED - Cannot read back updated rows')
        throw new Error('Update may have succeeded but cannot verify - SELECT policy issue')
      }

      // Update order status to 'preparing' if still pending
      if (order.status === 'pending') {
        await supabase
          .from('orders')
          .update({ status: 'preparing' })
          .eq('id', orderId)
      }

      // Refresh orders
      if (restaurant) {
        await fetchOrders(restaurant.id)
      }

      showNotification('success', t('startedPreparing').replace('{department}', t(department)))
    } catch (error) {
      console.error('Error starting department preparation:', error)
      showNotification('error', t('failedToStart'))
    }
  }

  // Mark items as ready for a specific department
  const markDepartmentReady = async (orderId, department) => {
    try {
      // First, get all order items for this order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          order_items (
            id,
            menu_item_id,
            marked_ready_at
          )
        `)
        .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError

      // Filter items by department
      const itemsToMark = order.order_items.filter(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id)
        return menuItem?.department === department && !item.marked_ready_at
      })

      console.log(`🔍 Mark ${department} ready - Total items in order:`, order.order_items.length)
      console.log(`🔍 Items filtered for ${department}:`, itemsToMark.length)
      console.log(`🔍 Item IDs to mark ready:`, itemsToMark.map(i => i.id))

      if (itemsToMark.length === 0) {
        showNotification('info', t('noItemsToMark').replace('{department}', t(department)))
        return
      }

      // Update marked_ready_at for these items
      const updatePayload = { marked_ready_at: new Date().toISOString() }
      console.log('🔍 Updating with payload:', updatePayload)
      console.log('🔍 Using item IDs:', itemsToMark.map(item => item.id))

      const { error: updateError, count } = await supabase
        .from('order_items')
        .update(updatePayload)
        .in('id', itemsToMark.map(item => item.id))

      console.log('🔍 Mark ready UPDATE - error:', updateError)
      console.log('🔍 Mark ready UPDATE - count:', count)

      if (updateError) throw updateError

      // Check if ALL items are now marked ready
      // If so, update order status to 'ready'
      const { data: allItems, error: checkError } = await supabase
        .from('order_items')
        .select('id, marked_ready_at')
        .eq('order_id', orderId)

      if (!checkError && allItems) {
        const allReady = allItems.every(item => item.marked_ready_at !== null)
        console.log('🔍 All items ready check:', allReady, `(${allItems.filter(i => i.marked_ready_at).length}/${allItems.length})`)

        if (allReady && order.status !== 'ready') {
          console.log('🔍 All items ready - updating order status to ready')
          await supabase
            .from('orders')
            .update({ status: 'ready' })
            .eq('id', orderId)
        }
      }

      // Refresh orders
      if (restaurant) {
        await fetchOrders(restaurant.id)
      }

      showNotification('success', t('markedReady').replace('{department}', t(department)))
    } catch (error) {
      console.error('Error marking department ready:', error)
      showNotification('error', t('failedToMark'))
    }
  }

  const confirmCancelOrder = (order) => {
    setOrderToCancel(order)
    setShowCancelModal(true)
  }

  const cancelOrder = async () => {
    if (!orderToCancel) return

    await updateOrderStatus(orderToCancel.id, 'cancelled')
    setShowCancelModal(false)
    setOrderToCancel(null)
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const openInvoiceModal = (orderId) => {
    setInvoiceOrderId(orderId)
    setShowInvoiceModal(true)
  }

  // Mark takeaway order as ready for pickup
  const markReadyForPickup = async (orderId) => {
    setMarkingReady(orderId)
    try {
      const response = await fetch('/api/takeaway/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark order ready')
      }

      if (data.emailSent) {
        showNotification('success', t('pickupNotificationSent') || 'Customer notified - order ready for pickup!')
      } else {
        showNotification('success', t('markedReadyForPickup') || 'Order marked ready for pickup')
      }

      // Refresh orders
      if (restaurant) {
        fetchOrders(restaurant.id)
      }
    } catch (error) {
      console.error('Error marking ready for pickup:', error)
      showNotification('error', error.message || t('failedToMarkReady') || 'Failed to mark ready')
    } finally {
      setMarkingReady(null)
    }
  }

  // Open pickup confirmation modal
  const openPickupModal = (orderId) => {
    setPickupOrderId(orderId)
    setShowPickupModal(true)
  }

  // Confirm pickup - staff verbally verifies the code
  const confirmPickup = async () => {
    if (!pickupOrderId) return

    try {
      // Use API endpoint to bypass RLS for staff members
      const response = await fetch('/api/takeaway/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: pickupOrderId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm pickup')
      }

      showNotification('success', t('orderPickedUp') || 'Order marked as picked up!')
      setShowPickupModal(false)
      setPickupOrderId(null)

      // Refresh orders
      if (restaurant) {
        fetchOrders(restaurant.id)
      }
    } catch (err) {
      console.error('Error confirming pickup:', err)
      showNotification('error', err.message || t('failedToConfirmPickup') || 'Failed to confirm pickup')
    }
  }

  const handleInvoiceGeneration = async ({ clientId, clientData, action }) => {
    if (!invoiceOrderId) return

    setGeneratingInvoice(true)

    try {
      // First, generate invoice data from API
      const generateResponse = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: invoiceOrderId,
          clientId,
          clientData
        })
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to generate invoice (${generateResponse.status})`)
      }

      const { invoice, restaurant: invoiceRestaurant } = await generateResponse.json()

      if (action === 'email') {
        // Generate PDF client-side and send via email API
        const pdfBase64 = await generateInvoicePdfBase64(invoice, invoiceRestaurant)

        const emailResponse = await fetch('/api/invoices/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: invoiceOrderId,
            clientId,
            clientData,
            pdfBase64
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `Failed to send invoice email (${emailResponse.status})`)
        }

        // Close modal
        setShowInvoiceModal(false)
        setInvoiceOrderId(null)
        showNotification('success', t('invoiceEmailSuccess').replace('{email}', clientData.email))
      } else {
        // Download invoice as PDF (generated client-side)
        await downloadInvoicePdf(invoice, invoiceRestaurant)

        // Close modal
        setShowInvoiceModal(false)
        setInvoiceOrderId(null)
        showNotification('success', t('invoiceDownloadSuccess'))
      }
    } catch (error) {
      console.error('Invoice generation error:', error)
      showNotification('error', error.message || t('invoiceError'))
    } finally {
      setGeneratingInvoice(false)
    }
  }

  // Merge server orders with offline (pending sync) orders
  const allOrders = [...offlineOrders, ...orders]

  const filteredOrders = allOrders.filter(order => {
    // Offline orders are always 'active'/'pending'
    if (order._isOffline) {
      if (filter === 'completed') return false
      if (orderTypeFilter !== 'all') {
        const orderType = order.order_type || 'dine_in'
        if (orderType !== orderTypeFilter) return false
      }
      return true
    }

    // Status filter
    if (filter === 'active') {
      if (!(['pending', 'preparing', 'ready'].includes(order.status) && !order.paid && order.status !== 'cancelled')) {
        return false
      }
    }
    if (filter === 'completed') {
      if (!(order.status === 'completed' || order.paid)) {
        return false
      }
    }

    // Order type filter
    if (orderTypeFilter !== 'all') {
      const orderType = order.order_type || 'dine_in'
      if (orderType !== orderTypeFilter) {
        return false
      }
    }

    return true
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700'
      case 'preparing': return 'bg-blue-100 text-blue-700'
      case 'ready': return 'bg-green-100 text-green-700'
      case 'completed': return 'bg-slate-100 text-slate-600'
      case 'cancelled': return 'bg-red-100 text-red-700'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter order items based on department permissions
  const filterOrderItems = (orderItems) => {
    if (!orderItems) return []

    // Owners and admins see all items
    if (userType === 'owner' || !staffDepartment) return orderItems

    // Check if staff has kitchen or bar permissions
    const hasKitchenPermission = departmentPermissions.includes('orders_kitchen')
    const hasBarPermission = departmentPermissions.includes('orders_bar')

    // If has both permissions, show all items
    if (hasKitchenPermission && hasBarPermission) return orderItems

    // If has no order permissions, show nothing
    if (!hasKitchenPermission && !hasBarPermission) return []

    // Filter items based on department permissions
    return orderItems.filter(orderItem => {
      const menuItem = menuItems.find(mi => mi.id === orderItem.menu_item_id)
      if (!menuItem) return true // Show if we can't find the menu item

      // Show kitchen items if has kitchen permission
      if (hasKitchenPermission && menuItem.department === 'kitchen') return true

      // Show bar items if has bar permission
      if (hasBarPermission && menuItem.department === 'bar') return true

      return false
    })
  }

  // Get department for an order item
  const getItemDepartment = (menuItemId) => {
    const menuItem = menuItems.find(mi => mi.id === menuItemId)
    return menuItem?.department || 'kitchen'
  }

  if (loading) {
    return <div className="text-slate-500">{t('loadingOrders')}</div>
  }

  return (
      <div onClick={resumeAudio}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
            <p className="text-slate-500">{t('subtitle')}</p>
          </div>
          {/* Sound indicator */}
          {soundSettings?.enabled && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <span>Sound alerts on</span>
            </div>
          )}
        </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['active', 'completed', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium ${
              filter === f
                ? 'bg-[#6262bd] text-white'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {t(f)}
          </button>
        ))}

        <div className="w-px bg-slate-200 mx-2"></div>

        {/* Order Type Filter */}
        <button
          onClick={() => setOrderTypeFilter('all')}
          className={`px-4 py-2 rounded-xl font-medium ${
            orderTypeFilter === 'all'
              ? 'bg-slate-700 text-white'
              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          {t('allOrders') || 'All Orders'}
        </button>
        <button
          onClick={() => setOrderTypeFilter('dine_in')}
          className={`px-4 py-2 rounded-xl font-medium ${
            orderTypeFilter === 'dine_in'
              ? 'bg-green-600 text-white'
              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          🍽️ {t('dineIn') || 'Dine-in'}
        </button>
        <button
          onClick={() => setOrderTypeFilter('takeaway')}
          className={`px-4 py-2 rounded-xl font-medium ${
            orderTypeFilter === 'takeaway'
              ? 'bg-cyan-600 text-white'
              : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          🥡 {t('takeaway') || 'Takeaway'}
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l4.59-4.58L18 11l-6 6z"/>
            </svg>
          </div>
          <p className="text-slate-500">
            {filter === 'active' ? t('noActiveOrders') : t('noOrders').replace('{filter}', t(filter))}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const filteredItems = filterOrderItems(order.order_items)

            // Debug: Log what filteredItems contains
            console.log(`📋 Order ${order.id.slice(0, 8)} filteredItems:`, filteredItems.map(i => ({
              name: i.name,
              preparing_started_at: i.preparing_started_at,
              marked_ready_at: i.marked_ready_at
            })))

            // Skip orders with no relevant items for this department
            if (filteredItems.length === 0 && staffDepartment && staffDepartment !== 'universal' && userType !== 'owner') {
              return null
            }

            return (
            <div key={order.id} className={`bg-white border-2 rounded-2xl p-6 ${
              order._isOffline ? 'border-orange-300 bg-orange-50/30' : order.order_type === 'takeaway' ? 'border-cyan-200' : 'border-slate-100'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    {order.order_type === 'takeaway' ? (
                      <>
                        <h3 className="text-lg font-bold text-cyan-700 flex items-center gap-2">
                          🥡 {t('takeaway') || 'Takeaway'}
                        </h3>
                        {order.pickup_code && (
                          <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm font-bold tracking-wider">
                            {order.pickup_code}
                          </span>
                        )}
                      </>
                    ) : (
                      <h3 className="text-lg font-bold text-slate-800">
                        {t('table')} {order.tables?.table_number || 'N/A'}
                      </h3>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {t(`status.${order.status}`)}
                    </span>
                    {order._isOffline && (
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium animate-pulse">
                        Pending sync
                      </span>
                    )}
                    {order.order_type === 'takeaway' && order.ready_for_pickup && !order.picked_up_at && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium animate-pulse">
                        {t('readyForPickup') || 'Ready for Pickup'}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-sm">
                    {t('orderNumber')}{order.id.slice(0, 8)} • {formatTime(order.created_at)}
                    {order.order_type === 'takeaway' && order.customer_name && (
                      <> • <span className="font-medium">{order.customer_name}</span></>
                    )}
                  </p>
                  {order.order_type === 'takeaway' && order.customer_email && (
                    <p className="text-slate-400 text-xs mt-1">{order.customer_email}</p>
                  )}
                </div>
                <p className="text-xl font-bold text-slate-800">£{order.total?.toFixed(2)}</p>
              </div>

              {/* Order Items */}
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                {filteredItems.map((item, index) => {
                  const department = getItemDepartment(item.menu_item_id)
                  return (
                    <div key={index} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-700">
                          {item.quantity}x {item.name}
                        </span>
                        {(userType === 'owner' || staffDepartment === 'universal') && (
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            department === 'bar'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {department === 'bar' ? '🍸' : '🍳'}
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500">£{(item.price_at_time * item.quantity).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>

              {order.notes && (
                <div className="mb-4 p-3 bg-amber-50 rounded-xl">
                  <p className="text-sm text-amber-700"><strong>{t('note')}:</strong> {order.notes}</p>
                </div>
              )}

              {/* Payment Information */}
              {order.paid && (
                <div className="mb-4 space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      <p className="text-sm font-semibold text-green-700">{t('paid')}</p>
                    </div>
                    <div className="text-xs text-green-600 space-y-0.5">
                      <p>{t('paymentMethod')}: <span className="font-medium capitalize">{order.payment_method}</span></p>
                      <p>{t('processedBy')}: <span className="font-medium">{order.payment_taken_by_name || 'Staff'}</span></p>
                      {order.payment_taken_at && (
                        <p>{t('paymentTime')}: {new Date(order.payment_taken_at).toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  {/* Invoice Button */}
                  {restaurant?.invoice_settings?.enabled && staffDepartment !== 'kitchen' && (
                    <button
                      onClick={() => openInvoiceModal(order.id)}
                      className="w-full bg-purple-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      {t('generateInvoice')}
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!order.paid && (
                <div className="flex flex-col gap-3">
                  {/* Group items by department for all statuses */}
                  {(() => {
                    const deptGroups = {}
                    filteredItems.forEach(item => {
                      const dept = getItemDepartment(item.menu_item_id)
                      if (!deptGroups[dept]) {
                        deptGroups[dept] = {
                          items: [],
                          hasStartedPreparing: false,
                          hasMarkedReady: false
                        }
                      }
                      deptGroups[dept].items.push(item)

                      // Check if any item in this department has started preparing
                      if (item.preparing_started_at) {
                        deptGroups[dept].hasStartedPreparing = true
                      }

                      // Check if any item in this department is marked ready
                      if (item.marked_ready_at) {
                        deptGroups[dept].hasMarkedReady = true
                      }
                    })

                    // Debug logging
                    console.log('🔍 Order', order.id.slice(0, 8), 'status:', order.status)
                    console.log('🔍 Dept groups:', Object.keys(deptGroups).map(dept => ({
                      dept,
                      hasStarted: deptGroups[dept].hasStartedPreparing,
                      hasReady: deptGroups[dept].hasMarkedReady,
                      items: deptGroups[dept].items.map(i => ({
                        name: i.name,
                        preparing_started_at: i.preparing_started_at,
                        marked_ready_at: i.marked_ready_at
                      }))
                    })))

                    const buttons = []

                    // For each department, show appropriate button
                    Object.keys(deptGroups).forEach(dept => {
                      const deptData = deptGroups[dept]
                      const deptLabel = dept.charAt(0).toUpperCase() + dept.slice(1)
                      const deptIcon = dept === 'bar' ? '🍸' : '🍳'

                      // Pending order: Show "Start Preparing" for each department
                      if (order.status === 'pending' || (order.status === 'preparing' && !deptData.hasStartedPreparing)) {
                        buttons.push(
                          <button
                            key={`start-${dept}`}
                            onClick={() => startPreparingDepartment(order.id, dept)}
                            className="bg-[#6262bd] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#5252a3] flex items-center justify-center gap-2"
                          >
                            <span>{deptIcon}</span>
                            <span>{t('startPreparing').replace('{department}', t(dept))}</span>
                          </button>
                        )
                      }
                      // Department has started but not marked ready: Show "Mark Ready"
                      else if ((order.status === 'preparing' || order.status === 'ready') && deptData.hasStartedPreparing && !deptData.hasMarkedReady) {
                        const deptColor = dept === 'bar' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                        buttons.push(
                          <button
                            key={`ready-${dept}`}
                            onClick={() => markDepartmentReady(order.id, dept)}
                            className={`${deptColor} text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2`}
                          >
                            <span>{deptIcon}</span>
                            <span>{t('markReady').replace('{department}', t(dept))}</span>
                          </button>
                        )
                      }
                    })

                    return <div className="space-y-2">{buttons}</div>
                  })()}

                  {/* Takeaway-specific buttons */}
                  {order.order_type === 'takeaway' && order.status === 'ready' && !order.ready_for_pickup && (
                    <button
                      onClick={() => markReadyForPickup(order.id)}
                      disabled={markingReady === order.id}
                      className="bg-cyan-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {markingReady === order.id ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                          </svg>
                          {t('sendingNotification') || 'Sending...'}
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                          </svg>
                          {t('notifyReadyForPickup') || 'Notify Ready for Pickup'}
                        </>
                      )}
                    </button>
                  )}

                  {/* Takeaway: Mark as Picked Up button */}
                  {order.order_type === 'takeaway' && order.ready_for_pickup && !order.picked_up_at && (
                    <button
                      onClick={() => openPickupModal(order.id)}
                      className="bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                      {t('markPickedUp') || 'Mark as Picked Up'}
                    </button>
                  )}

                  {/* Dine-in: Complete Order button */}
                  {order.status === 'ready' && order.order_type !== 'takeaway' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="bg-slate-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-slate-700"
                    >
                      {t('completeOrder')}
                    </button>
                  )}
                  {userType === 'owner' && ['pending', 'preparing'].includes(order.status) && (
                    <button
                      onClick={() => confirmCancelOrder(order)}
                      className="border-2 border-red-200 text-red-600 px-4 py-2 rounded-xl font-medium hover:bg-red-50"
                    >
                      {t('cancel')}
                    </button>
                  )}
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && orderToCancel && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCancelModal(false)
            setOrderToCancel(null)
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-4">{t('cancelOrderTitle')}</h2>
            <p className="text-slate-600 mb-6">
              {t('cancelOrderMessage').replace('{tableNumber}', orderToCancel.tables?.table_number)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setOrderToCancel(null)
                }}
                className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                {t('noKeepOrder')}
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700"
              >
                {t('yesCancelOrder')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100]">
          <div
            className={`${
              notification.type === 'success'
                ? 'bg-green-500'
                : notification.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            } text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 min-w-[300px]`}
          >
            {notification.type === 'success' ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
            ) : notification.type === 'error' ? (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            )}
            <p className="font-medium flex-1">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="text-white hover:text-white/80 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Pickup Confirmation Modal */}
      {showPickupModal && pickupOrderId && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowPickupModal(false)
            setPickupOrderId(null)
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {t('confirmPickup') || 'Confirm Pickup'}
              </h2>
              <p className="text-slate-600">
                {t('verifyCodeVerbally') || 'Ask the customer for their pickup code and verify it matches below.'}
              </p>
            </div>

            {/* Order Details & Code Display */}
            {(() => {
              const order = orders.find(o => o.id === pickupOrderId)
              return order ? (
                <div className="mb-6">
                  {/* Customer Info */}
                  {order.customer_name && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                      <p className="text-sm text-slate-500">{t('customerName') || 'Customer'}</p>
                      <p className="text-lg font-semibold text-slate-800">{order.customer_name}</p>
                    </div>
                  )}

                  {/* Pickup Code - Large Display */}
                  <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-6 text-center">
                    <p className="text-sm text-cyan-600 font-medium mb-2">{t('pickupCode') || 'Pickup Code'}</p>
                    <p className="text-4xl font-bold text-cyan-700 tracking-widest">{order.pickup_code}</p>
                  </div>

                  {/* Order Total */}
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-700 font-medium">{t('totalToPay') || 'Total to collect (Cash)'}</span>
                      <span className="text-xl font-bold text-amber-800">£{order.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : null
            })()}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPickupModal(false)
                  setPickupOrderId(null)
                }}
                className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                {tc('close') || 'Cancel'}
              </button>
              <button
                onClick={confirmPickup}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                {t('confirmAndFinalise') || 'Confirm & Finalise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Client Modal */}
      {showInvoiceModal && restaurant && (
        <InvoiceClientModal
          restaurant={restaurant}
          onSubmit={handleInvoiceGeneration}
          onClose={() => {
            setShowInvoiceModal(false)
            setInvoiceOrderId(null)
          }}
          isGenerating={generatingInvoice}
        />
      )}
      </div>
  )
}