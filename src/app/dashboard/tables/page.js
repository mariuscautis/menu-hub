'use client'

import { useState, useEffect } from 'react'
import { supabase, clearOrdersCacheForTable, clearTableOrdersLocalCache, clearAllOrdersCache, wasTablePaidOffline, clearTablePaidOfflineStatus } from '@/lib/supabase'
import QRCode from 'qrcode'
import InvoiceClientModal from '@/components/invoices/InvoiceClientModal'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { generateInvoicePdfBase64, downloadInvoicePdf } from '@/lib/invoicePdfGenerator'
import {
  addPendingOrder,
  updatePendingOrder,
  generateClientId,
  addPendingPayment,
  getPendingOrdersForTable,
  getPendingPaymentsForTable,
  markOrdersPaidOffline,
  getAllPendingOrdersByTable,
  getAllPendingOrderUpdatesByTable,
  clearPaidOfflineOrders,
  addPendingOrderUpdate,
  getPendingOrderUpdatesForTable,
  clearPendingOrderUpdates,
  clearAllOfflineOrdersForTable,
} from '@/lib/offlineQueue'

export default function Tables() {
  const t = useTranslations('tables')
  const [tables, setTables] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showOrderDetailsModal, setShowOrderDetailsModal] = useState(false)
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableOrderDetails, setTableOrderDetails] = useState([])
  const [newTableNumber, setNewTableNumber] = useState('')
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [unpaidOrders, setUnpaidOrders] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [tableOrderInfo, setTableOrderInfo] = useState({})
  const [userType, setUserType] = useState(null) // 'owner' or 'staff'
  const [staffDepartment, setStaffDepartment] = useState(null) // 'kitchen', 'bar', 'universal', or null for owners
  const [notification, setNotification] = useState(null) // { type: 'success'|'error'|'info', message: string }

  // Reservations state
  const [todayReservations, setTodayReservations] = useState({})
  const [showReservationsModal, setShowReservationsModal] = useState(false)
  const [showCreateReservationModal, setShowCreateReservationModal] = useState(false)
  const [selectedTableReservations, setSelectedTableReservations] = useState([])
  const [reservationForm, setReservationForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    partySize: 2,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    specialRequests: ''
  })

  // Waiter calls state
  const [waiterCalls, setWaiterCalls] = useState({})

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [reservationToCancel, setReservationToCancel] = useState(null)
  const [cancelReasonType, setCancelReasonType] = useState('no_show')
  const [customCancelReason, setCustomCancelReason] = useState('')

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceTableId, setInvoiceTableId] = useState(null)
  const [invoiceOrderId, setInvoiceOrderId] = useState(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  // Post-payment modal state
  const [showPostPaymentModal, setShowPostPaymentModal] = useState(false)
  const [completedOrderIds, setCompletedOrderIds] = useState([])

  // Split bill state
  const [showSplitBillModal, setShowSplitBillModal] = useState(false)
  const [splitBills, setSplitBills] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [splitBillTableId, setSplitBillTableId] = useState(null)

  // Show notification helper
  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000) // Auto-dismiss after 4 seconds
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Debug: Log when orderItems changes to detect duplicates
  useEffect(() => {
    console.log('>>>>> orderItems changed. Count:', orderItems.length)
    if (orderItems.length > 0) {
      console.log('>>>>> Current orderItems:', orderItems.map(i => `${i.name} (x${i.quantity})`))
      const itemIds = orderItems.map(item => item.menu_item_id)
      const uniqueIds = new Set(itemIds)
      if (itemIds.length !== uniqueIds.size) {
        console.error('🚨🚨🚨 DUPLICATE DETECTED IN ORDER ITEMS! 🚨🚨🚨')
        console.error('Total items:', itemIds.length, 'Unique items:', uniqueIds.size)
        console.error('Full orderItems array:', orderItems)

        // Show which items are duplicated
        const duplicates = itemIds.filter((id, index) => itemIds.indexOf(id) !== index)
        console.error('Duplicated menu_item_ids:', [...new Set(duplicates)])
      }
    }
  }, [orderItems])

  // Real-time subscriptions for live order updates
  useEffect(() => {
    if (!restaurant) return

    const restaurantId = restaurant.id

    // Subscribe to order changes to update table badges
    const ordersChannel = supabase
      .channel(`orders-realtime-tables-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Tables page - Order changed:', payload)
          // Skip refetch when offline to preserve local state
          if (!navigator.onLine) {
            console.log('Tables page - Skipping refetch (offline)')
            return
          }
          // Small delay to ensure database has committed the changes
          setTimeout(() => {
            console.log('Tables page - Fetching updated table order info after order change')
            fetchTableOrderInfo(restaurantId)
          }, 100)
        }
      )
      .subscribe((status) => {
        console.log('Tables page orders subscription status:', status)
      })

    // Subscribe to order_items changes (when items are added or updated)
    const orderItemsChannel = supabase
      .channel(`order-items-realtime-tables-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Changed from 'INSERT' to '*' to catch UPDATE events too
          schema: 'public',
          table: 'order_items'
        },
        (payload) => {
          console.log('Tables page - Order item changed:', payload)
          // Skip refetch when offline to preserve local state
          if (!navigator.onLine) {
            console.log('Tables page - Skipping refetch (offline)')
            return
          }
          // Refetch when items are added or updated (marked ready, delivered, etc.)
          setTimeout(() => {
            console.log('Tables page - Fetching updated table order info after order item change')
            fetchTableOrderInfo(restaurantId)
          }, 100)
        }
      )
      .subscribe((status) => {
        console.log('Tables page order_items subscription status:', status)
      })

    // Subscribe to table changes (status updates, cleaning, etc.)
    const tablesChannel = supabase
      .channel(`tables-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Tables page - Table updated:', payload)
          // Skip refetch when offline to preserve local state
          if (!navigator.onLine) {
            console.log('Tables page - Skipping refetch (offline)')
            return
          }
          // Refetch table data when any table is updated (status, cleaning, etc.)
          setTimeout(() => {
            fetchData()
          }, 100)
        }
      )
      .subscribe()

    // Subscribe to reservation changes (for today's reservations indicators)
    const reservationsChannel = supabase
      .channel(`reservations-tables-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Tables page - Reservation changed:', payload)
          // Skip refetch when offline to preserve local state
          if (!navigator.onLine) {
            console.log('Tables page - Skipping refetch (offline)')
            return
          }
          // Refetch today's reservations when any reservation changes
          setTimeout(() => {
            console.log('Tables page - Refetching today\'s reservations')
            fetchTodayReservations(restaurantId)
          }, 100)
        }
      )
      .subscribe((status) => {
        console.log('Tables page reservations subscription status:', status)
      })

    // Subscribe to waiter calls (for real-time waiter call notifications)
    const waiterCallsChannel = supabase
      .channel(`waiter-calls-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_calls',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Tables page - Waiter call changed:', payload)
          // Skip refetch when offline to preserve local state
          if (!navigator.onLine) {
            console.log('Tables page - Skipping refetch (offline)')
            return
          }
          // Refetch waiter calls
          setTimeout(() => {
            fetchWaiterCalls(restaurantId)
          }, 100)
        }
      )
      .subscribe((status) => {
        console.log('Tables page waiter calls subscription status:', status)
      })

    // Subscribe to split bills (for real-time split bill payment updates)
    const splitBillsChannel = supabase
      .channel(`split-bills-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'split_bills',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('Tables page - Split bill changed:', payload)
          // Skip refetch when offline to preserve local state
          if (!navigator.onLine) {
            console.log('Tables page - Skipping refetch (offline)')
            return
          }
          // Refetch table order info when split bills change
          setTimeout(() => {
            fetchTableOrderInfo(restaurantId)
          }, 100)
        }
      )
      .subscribe((status) => {
        console.log('Tables page split bills subscription status:', status)
      })

    // Polling fallback: Refresh order info every 15 seconds as a safety net
    // This ensures table indicators update even if real-time subscriptions fail
    const pollingInterval = setInterval(() => {
      console.log('Tables page - Polling fallback: refreshing table order info')
      fetchTableOrderInfo(restaurantId)
    }, 15000) // 15 seconds

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(orderItemsChannel)
      supabase.removeChannel(tablesChannel)
      supabase.removeChannel(reservationsChannel)
      supabase.removeChannel(waiterCallsChannel)
      supabase.removeChannel(splitBillsChannel)
      clearInterval(pollingInterval)
    }
  }, [restaurant])

  const fetchData = async () => {
    let restaurantData = null
    let userTypeData = null
    let user = null

    // Check for staff session first (PIN-based login)
    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        console.log('🔍 Staff session found:', {
          role: staffSession.role,
          email: staffSession.email
        })
        restaurantData = staffSession.restaurant
        userTypeData = staffSession.role === 'admin' ? 'owner' : 'staff'
        console.log('🔍 Setting userType to:', userTypeData, '(based on role:', staffSession.role, ')')
        setUserType(userTypeData)
        setStaffDepartment(staffSession.department || 'universal')
        // Create a pseudo user object for compatibility
        user = { id: staffSession.id, email: staffSession.email }
        setCurrentUser(user)
      } catch (err) {
        console.error('Error parsing staff session:', err)
        localStorage.removeItem('staff_session')
      }
    }

    // If not staff session, check for owner auth session
    if (!restaurantData) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        setLoading(false)
        return
      }

      user = authUser
      setCurrentUser(user)

      // Check if owner
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (ownedRestaurant) {
        restaurantData = ownedRestaurant
        userTypeData = 'owner'
        setUserType(userTypeData)
        setStaffDepartment(null) // Owners see all
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
          setUserType(userTypeData)
          setStaffDepartment(staffRecord.department || 'universal')
        }
      }
    }

    if (!restaurantData) {
      setLoading(false)
      return
    }

    setRestaurant(restaurantData)

    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .order('table_number')

    setTables(tablesData || [])

    // Fetch menu items for order placement (only in-stock items)
    const { data: items, error: itemsError } = await supabase
      .rpc('get_available_menu_items', { p_restaurant_id: restaurantData.id })

    const { data: cats, error: catsError } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('restaurant_id', restaurantData.id)
      .order('sort_order')

    if (itemsError) {
      console.error('Menu items error:', itemsError)
      // Fallback to regular query if RPC fails
      const { data: fallbackItems } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .eq('available', true)
        .order('sort_order')
      setMenuItems(fallbackItems || [])
    } else {
      console.log('Menu items loaded (in stock only):', items)
      setMenuItems(items || [])
    }

    if (catsError) console.error('Categories error:', catsError)
    console.log('Categories loaded:', cats)

    setCategories(cats || [])

    // Fetch unpaid order info for all tables
    await fetchTableOrderInfo(restaurantData.id)

    // Fetch today's reservations for all tables
    await fetchTodayReservations(restaurantData.id)

    // Fetch pending waiter calls for all tables
    await fetchWaiterCalls(restaurantData.id)

    setLoading(false)
  }

  const fetchTableOrderInfo = async (restaurantId) => {
    // Get all unpaid, non-cancelled orders with their items
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        table_id,
        total,
        status,
        delivered_at,
        order_items (
          id,
          quantity,
          price_at_time,
          marked_ready_at,
          delivered_at,
          menu_items (
            department
          )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .eq('paid', false)
      .neq('status', 'cancelled')

    // Get all completed split bills to calculate amounts already paid
    const { data: splitBills } = await supabase
      .from('split_bills')
      .select('table_id, total_amount, payment_status')
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'completed')

    // Calculate total paid via split bills per table
    const splitBillTotalsByTable = {}
    splitBills?.forEach(bill => {
      if (!splitBillTotalsByTable[bill.table_id]) {
        splitBillTotalsByTable[bill.table_id] = 0
      }
      splitBillTotalsByTable[bill.table_id] += parseFloat(bill.total_amount) || 0
    })

    // Group by table and calculate totals
    const orderInfo = {}
    orders?.forEach(order => {
      if (!orderInfo[order.table_id]) {
        orderInfo[order.table_id] = {
          count: 0,
          total: 0,
          readyDepartments: [] // Array of departments with ready items
        }
      }
      orderInfo[order.table_id].count += 1

      // Calculate total from order items instead of using stored total
      // This handles cases where order.total might be 0 but items exist
      let orderTotal = 0
      if (order.order_items && order.order_items.length > 0) {
        orderTotal = order.order_items.reduce((sum, item) => {
          return sum + ((item.quantity || 0) * (item.price_at_time || 0))
        }, 0)
      } else {
        // Fallback to stored total if no items found
        orderTotal = order.total || 0
      }
      orderInfo[order.table_id].total += orderTotal

      // Track which departments have ready items that aren't delivered yet
      // Check items regardless of order status
      if (order.order_items) {
        order.order_items.forEach(item => {
          // Item is ready if marked_ready_at is set and delivered_at is null
          if (item.marked_ready_at && !item.delivered_at) {
            const department = item.menu_items?.department || 'kitchen'
            // Add to readyDepartments if not already there
            if (!orderInfo[order.table_id].readyDepartments.includes(department)) {
              orderInfo[order.table_id].readyDepartments.push(department)
            }
          }
        })
      }
    })

    // Subtract split bill amounts from totals
    Object.keys(splitBillTotalsByTable).forEach(tableId => {
      if (orderInfo[tableId]) {
        orderInfo[tableId].total -= splitBillTotalsByTable[tableId]
        // Ensure total doesn't go negative (should be 0 if fully paid via split bills)
        if (orderInfo[tableId].total < 0) {
          orderInfo[tableId].total = 0
        }
      }
    })

    // Merge with pending offline orders (so they persist in UI when offline)
    try {
      const offlineOrdersByTable = await getAllPendingOrdersByTable()
      Object.entries(offlineOrdersByTable).forEach(([tableId, offlineData]) => {
        if (orderInfo[tableId]) {
          // Add offline orders to existing table data
          orderInfo[tableId].count += offlineData.count
          orderInfo[tableId].total += offlineData.total
        } else {
          // Table only has offline orders
          orderInfo[tableId] = {
            count: offlineData.count,
            total: offlineData.total,
            readyDepartments: [], // Offline orders are never "ready" (not prepared yet)
          }
        }
      })
    } catch (err) {
      console.warn('Failed to get offline orders for merge:', err)
    }

    // Also merge pending order updates (items added to existing orders while offline)
    try {
      const offlineUpdatesByTable = await getAllPendingOrderUpdatesByTable()
      Object.entries(offlineUpdatesByTable).forEach(([tableId, updateData]) => {
        if (orderInfo[tableId]) {
          // Add offline update totals to existing table data
          orderInfo[tableId].total += updateData.total
        } else {
          // Table has only offline updates (order exists in Supabase but wasn't fetched)
          orderInfo[tableId] = {
            count: 0, // Don't add count, the order already exists
            total: updateData.total,
            readyDepartments: [],
          }
        }
      })
    } catch (err) {
      console.warn('Failed to get offline order updates for merge:', err)
    }

    console.log('fetchTableOrderInfo result:', orderInfo)
    setTableOrderInfo(orderInfo)
  }

  const fetchTodayReservations = async (restaurantId) => {
    const today = new Date().toISOString().split('T')[0]

    // Get all confirmed reservations for today grouped by table
    const { data: reservations } = await supabase
      .from('reservations')
      .select('*, tables(table_number)')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', today)
      .eq('status', 'confirmed')
      .not('table_id', 'is', null)
      .order('reservation_time')

    // Group by table_id
    const reservationsByTable = {}
    reservations?.forEach(reservation => {
      if (!reservationsByTable[reservation.table_id]) {
        reservationsByTable[reservation.table_id] = []
      }
      reservationsByTable[reservation.table_id].push(reservation)
    })

    setTodayReservations(reservationsByTable)
  }

  const fetchWaiterCalls = async (restaurantId) => {
    console.log('Fetching waiter calls for restaurant:', restaurantId)

    // Get all pending waiter calls grouped by table
    const { data: calls, error } = await supabase
      .from('waiter_calls')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching waiter calls:', error)
      return
    }

    console.log('Waiter calls fetched:', calls)

    // Group by table_id
    const callsByTable = {}
    calls?.forEach(call => {
      if (!callsByTable[call.table_id]) {
        callsByTable[call.table_id] = []
      }
      callsByTable[call.table_id].push(call)
    })

    console.log('Waiter calls by table:', callsByTable)
    setWaiterCalls(callsByTable)
  }

  const acknowledgeWaiterCall = async (callId) => {
    console.log('Acknowledging waiter call:', callId)

    // Get current staff info
    let acknowledgedByName = 'Staff'
    let acknowledgedByStaffId = null

    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        acknowledgedByName = staffSession.name || staffSession.email || 'Staff'
        acknowledgedByStaffId = staffSession.id || null
      } catch (err) {
        console.error('Error parsing staff session:', err)
      }
    } else if (currentUser) {
      acknowledgedByName = currentUser.email || 'Manager'
    }

    const { error } = await supabase
      .from('waiter_calls')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        acknowledged_by_name: acknowledgedByName,
        acknowledged_by_staff_id: acknowledgedByStaffId
      })
      .eq('id', callId)

    if (error) {
      console.error('Failed to acknowledge waiter call:', error)
      showNotification('error', t('notifications.waiterCallFailed'))
    } else {
      console.log('Waiter call acknowledged successfully by:', acknowledgedByName)
      showNotification('success', t('notifications.waiterCallAcknowledged'))
      // The real-time subscription should handle the update, but let's trigger a manual refetch just in case
      if (restaurant) {
        setTimeout(() => fetchWaiterCalls(restaurant.id), 100)
      }
    }
  }

  const openViewReservationsModal = (table) => {
    const reservations = todayReservations[table.id] || []
    setSelectedTableReservations(reservations)
    setSelectedTable(table)
    setShowReservationsModal(true)
  }

  const openCreateReservationModal = (table) => {
    setSelectedTable(table)
    setReservationForm({
      date: new Date().toISOString().split('T')[0],
      time: '19:00',
      partySize: 2,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      specialRequests: ''
    })
    setShowCreateReservationModal(true)
  }

  const submitReservation = async (e) => {
    e.preventDefault()

    try {
      const { data, error } = await supabase
        .from('reservations')
        .insert({
          restaurant_id: restaurant.id,
          table_id: selectedTable.id,
          customer_name: reservationForm.customerName,
          customer_email: reservationForm.customerEmail,
          customer_phone: reservationForm.customerPhone,
          party_size: reservationForm.partySize,
          reservation_date: reservationForm.date,
          reservation_time: reservationForm.time,
          special_requests: reservationForm.specialRequests,
          status: 'confirmed', // Staff-created reservations are auto-confirmed
          confirmed_by_staff_name: currentUser?.email || 'Staff',
          confirmed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Send confirmation email to customer (non-blocking)
      fetch('/api/reservations/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: data.id,
          isConfirmation: true
        })
      }).catch(err => console.error('Email error:', err))

      setShowCreateReservationModal(false)
      setSelectedTable(null)
      showNotification('success', t('notifications.reservationCreated'))

      // Refresh today's reservations
      await fetchTodayReservations(restaurant.id)
    } catch (error) {
      console.error('Error creating reservation:', error)
      showNotification('error', t('notifications.reservationFailed'))
    }
  }

  const addTable = async (e) => {
    e.preventDefault()
    if (!newTableNumber.trim()) return

    const { error } = await supabase.from('tables').insert({
      restaurant_id: restaurant.id,
      table_number: newTableNumber.trim()
    })

    if (!error) {
      setNewTableNumber('')
      setShowModal(false)
      fetchData()
    }
  }

  const deleteTable = async (id) => {
    if (!confirm(t('deleteTableConfirm'))) return

    await supabase.from('tables').delete().eq('id', id)
    fetchData()
  }

  const generateQRCode = async (table) => {
    const url = `${window.location.origin}/${restaurant.slug}/table/${table.id}`

    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#6262bd',
          light: '#ffffff'
        }
      })
      return qrDataUrl
    } catch (err) {
      console.error('QR generation error:', err)
      return null
    }
  }

  const downloadQR = async (table) => {
    const qrDataUrl = await generateQRCode(table)
    if (!qrDataUrl) return

    const link = document.createElement('a')
    link.download = `table-${table.table_number}-qr.png`
    link.href = qrDataUrl
    link.click()
  }

  const downloadAllQR = async () => {
    for (const table of tables) {
      await downloadQR(table)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }

  const openOrderModal = async (table) => {
    console.log('========== OPENING ORDER MODAL ==========')
    console.log('Table:', table.table_number, 'ID:', table.id)

    // IMPORTANT: Clear state FIRST to prevent duplicates from previous modal opens
    console.log('STEP 1: Clearing ALL state completely')
    setOrderItems([])
    setCurrentOrder(null)
    setSelectedTable(null)

    // AGGRESSIVE CACHE CLEARING: Clear ALL order caches to prevent stale data
    // This is critical because cached Supabase responses may show orders as unpaid
    // when they've actually been paid (after offline payment + sync)
    clearAllOrdersCache()
    clearTableOrdersLocalCache(table.id)

    // Small delay to ensure React has processed the state clears
    await new Promise(resolve => setTimeout(resolve, 0))

    console.log('STEP 2: Setting selected table')
    setSelectedTable(table)

    // CRITICAL CHECK: If there's a pending payment for this table, it means the table
    // was just paid (even if offline). Don't load any cached order data - start fresh.
    try {
      const pendingPayments = await getPendingPaymentsForTable(table.id)
      if (pendingPayments && pendingPayments.length > 0) {
        console.log('Table has pending payment - starting fresh (table was paid offline)')
        setShowOrderModal(true)
        return
      }
    } catch (err) {
      console.warn('Error checking pending payments:', err)
    }

    // Check for pending offline orders for this table in IndexedDB
    // These are orders created offline that haven't been synced yet
    try {
      const pendingOrders = await getPendingOrdersForTable(table.id)
      if (pendingOrders && pendingOrders.length > 0) {
        // Use the most recent pending offline order
        const latestOrder = pendingOrders[pendingOrders.length - 1]
        console.log('Found pending offline order:', latestOrder.client_id)

        // Format it as currentOrder so we can add items to it
        setCurrentOrder({
          client_id: latestOrder.client_id,
          table_id: latestOrder.table_id,
          order_items: latestOrder.order_items || [],
          isOfflineOrder: true
        })

        // Load the items
        const itemsMap = {}
        latestOrder.order_items?.forEach(item => {
          if (itemsMap[item.menu_item_id]) {
            itemsMap[item.menu_item_id].quantity += item.quantity
          } else {
            itemsMap[item.menu_item_id] = {
              menu_item_id: item.menu_item_id,
              name: item.name,
              price_at_time: item.price_at_time,
              quantity: item.quantity,
              isExisting: true,
              existingQuantity: item.quantity
            }
          }
        })
        setOrderItems(Object.values(itemsMap))
        setShowOrderModal(true)
        return
      }
    } catch (err) {
      console.warn('Error checking offline orders:', err)
    }

    // If offline and no pending orders, start fresh
    if (!navigator.onLine) {
      console.log('OFFLINE MODE: No pending orders - starting fresh')
      setShowOrderModal(true)
      return
    }

    // ONLINE MODE: Fetch fresh data from Supabase (not from cache)
    // Check if there's an existing open order for this table that is not completed and not paid
    console.log('STEP 3: Fetching existing order from database...')
    console.log('Looking for orders with table_id:', table.id)

    let existingOrder = null

    try {
      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_id', table.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .is('paid', false)
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) {
        console.error('Error fetching existing order:', fetchError)
        // Don't throw - we'll proceed with empty order
      } else {
        existingOrder = existingOrders && existingOrders.length > 0 ? existingOrders[0] : null

        // CRITICAL VALIDATION: Ensure the returned order actually belongs to this table
        // This prevents cached responses from other tables being used incorrectly
        if (existingOrder && existingOrder.table_id !== table.id) {
          console.error('CACHE MISMATCH: Order table_id', existingOrder.table_id, 'does not match selected table', table.id)
          console.error('Discarding stale cached order to prevent cross-table pollution')
          existingOrder = null
        }
      }

      console.log('STEP 4: Existing order found?', !!existingOrder)
      if (!existingOrder) {
        // Debug: Let's see ALL orders for this table to understand why
        const { data: allOrders } = await supabase
          .from('orders')
          .select('id, status, paid, created_at')
          .eq('table_id', table.id)
          .order('created_at', { ascending: false })
          .limit(5)
        console.log('All recent orders for this table:', allOrders)
      }
    } catch (err) {
      // Network error - offline mode
      console.warn('Offline: could not fetch existing order for table', table.table_number)
      if (!navigator.onLine) {
        showNotification('info', 'Offline mode — starting new order')
      }
      // existingOrder remains null, so we'll start with empty order
    }

    if (existingOrder) {
      console.log('Existing order ID:', existingOrder.id)
      console.log('Raw order_items from DB:', existingOrder.order_items)

      // Consolidate existing order items (in case there are duplicates in DB)
      const itemsMap = {}
      existingOrder.order_items?.forEach(item => {
        if (itemsMap[item.menu_item_id]) {
          // If duplicate exists, sum quantities
          console.warn('DUPLICATE FOUND IN DB:', item.menu_item_id, item.name)
          itemsMap[item.menu_item_id].quantity += item.quantity
          itemsMap[item.menu_item_id].existingQuantity += item.quantity
        } else {
          // New item
          itemsMap[item.menu_item_id] = {
            menu_item_id: item.menu_item_id,
            name: item.name,
            price_at_time: item.price_at_time,
            quantity: item.quantity,
            isExisting: true,
            existingQuantity: item.quantity
          }
        }
      })

      // ALSO merge any pending order updates (items added offline to this order)
      try {
        const pendingUpdates = await getPendingOrderUpdatesForTable(table.id)
        const orderUpdates = pendingUpdates.filter(u => u.order_id === existingOrder.id)
        if (orderUpdates.length > 0) {
          console.log('Found pending order updates:', orderUpdates.length)
          for (const update of orderUpdates) {
            for (const item of update.items || []) {
              if (itemsMap[item.menu_item_id]) {
                // Add to existing item quantity
                itemsMap[item.menu_item_id].quantity += item.quantity
                // ALSO update existingQuantity so these aren't treated as "new" on next submit
                itemsMap[item.menu_item_id].existingQuantity += item.quantity
              } else {
                // New item from offline update
                itemsMap[item.menu_item_id] = {
                  menu_item_id: item.menu_item_id,
                  name: item.name,
                  price_at_time: item.price_at_time,
                  quantity: item.quantity,
                  isExisting: true, // Mark as existing so staff can't reduce
                  existingQuantity: item.quantity
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to get pending order updates:', err)
      }

      const normalizedItems = Object.values(itemsMap)
      console.log('STEP 5: Setting orderItems to:', normalizedItems.length, 'items')
      console.log('Items:', normalizedItems.map(i => `${i.name} x${i.quantity}`))

      // CRITICAL: Update currentOrder.order_items to include merged offline items
      // This ensures that when submitting, the comparison uses ALL existing items
      // (both from Supabase AND from pending offline updates) to avoid creating
      // duplicate pending updates for items that were already added offline
      const mergedOrderItems = normalizedItems.map(item => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        price_at_time: item.price_at_time,
        quantity: item.quantity, // Use the merged quantity (online + offline)
      }))
      setCurrentOrder({
        ...existingOrder,
        order_items: mergedOrderItems
      })

      setOrderItems(normalizedItems)
    } else {
      console.log('STEP 5: No existing order - confirmed empty orderItems')
      setCurrentOrder(null)
      setOrderItems([])
    }

    console.log('STEP 6: Opening modal')
    setShowOrderModal(true)
    console.log('========== MODAL OPEN COMPLETE ==========')
  }

  const openPaymentModal = async (table) => {
    setSelectedTable(table)

    // Clear Supabase cache for this table to prevent stale cached responses
    clearOrdersCacheForTable(table.id)

    const cacheKey = `table_orders_${table.id}`

    try {
      let orders = []
      let existingSplitBills = []

      if (navigator.onLine) {
        // Online: fetch from Supabase and cache
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('table_id', table.id)
          .is('paid', false)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: true })

        if (ordersError) {
          throw ordersError
        }

        // CRITICAL VALIDATION: Filter to only orders that actually belong to this table
        // This prevents cached responses from other tables being used incorrectly
        orders = (ordersData || []).filter(order => order.table_id === table.id)

        if (orders.length !== (ordersData || []).length) {
          console.warn('CACHE MISMATCH: Filtered out', (ordersData || []).length - orders.length, 'orders with wrong table_id')
        }

        // Cache the orders for offline use
        if (orders.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(orders))
          } catch (e) {
            console.warn('Failed to cache orders:', e)
          }
        } else {
          // Clear cache if no orders
          localStorage.removeItem(cacheKey)
        }

        // Also fetch split bills when online
        try {
          const { data: splitBillsData } = await supabase
            .from('split_bills')
            .select('*, split_bill_items(*)')
            .eq('table_id', table.id)
            .eq('payment_status', 'completed')
          existingSplitBills = splitBillsData || []
        } catch {
          // Ignore split bills fetch error
        }
      } else {
        // Offline: try to use cached data
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            const cachedOrders = JSON.parse(cached)
            // CRITICAL VALIDATION: Filter to only orders that belong to this table
            orders = cachedOrders.filter(order => order.table_id === table.id)

            if (orders.length !== cachedOrders.length) {
              console.warn('CACHE MISMATCH: Filtered out', cachedOrders.length - orders.length, 'cached orders with wrong table_id')
              // Clear the corrupted cache
              localStorage.removeItem(cacheKey)
            }
          }
        } catch (e) {
          console.warn('Failed to load cached orders:', e)
        }
      }

      // Also get pending offline orders for this table
      const offlineOrders = await getPendingOrdersForTable(table.id)

      // Get pending order updates (items added to existing orders while offline)
      const pendingUpdates = await getPendingOrderUpdatesForTable(table.id)

      // Convert offline orders to the same format as Supabase orders
      const formattedOfflineOrders = offlineOrders.map(order => ({
        client_id: order.client_id,
        table_id: order.table_id,
        total: order.total,
        status: order.status,
        created_at: order.created_at,
        order_items: order.order_items?.map(item => ({
          id: `offline_${item.id || Math.random()}`,
          menu_item_id: item.menu_item_id,
          name: item.name,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
        })) || []
      }))

      // Deduplicate: filter out offline orders that were already synced to Supabase
      // (their client_id will match an order in Supabase)
      // Also double-check table_id matches to prevent cross-table pollution
      const supabaseClientIds = new Set(orders.filter(o => o.client_id).map(o => o.client_id))
      const uniqueOfflineOrders = formattedOfflineOrders.filter(o =>
        !supabaseClientIds.has(o.client_id) && o.table_id === table.id
      )

      // Merge pending order updates into their parent orders
      // This handles items added to existing orders while offline
      const ordersWithUpdates = orders.map(order => {
        const updates = pendingUpdates.filter(u => u.order_id === order.id)
        if (updates.length === 0) return order

        // Merge all update items into this order
        const mergedItems = [...(order.order_items || [])]
        let additionalTotal = 0

        for (const update of updates) {
          for (const item of update.items || []) {
            const existingIdx = mergedItems.findIndex(i => i.menu_item_id === item.menu_item_id)
            if (existingIdx >= 0) {
              mergedItems[existingIdx] = {
                ...mergedItems[existingIdx],
                quantity: mergedItems[existingIdx].quantity + item.quantity
              }
            } else {
              mergedItems.push({
                id: `offline_update_${Date.now()}_${Math.random()}`,
                menu_item_id: item.menu_item_id,
                name: item.name,
                quantity: item.quantity,
                price_at_time: item.price_at_time,
              })
            }
            additionalTotal += (item.price_at_time || 0) * (item.quantity || 0)
          }
        }

        return {
          ...order,
          order_items: mergedItems,
          total: (order.total || 0) + additionalTotal
        }
      })

      // Combine online orders (with updates merged) and unique offline orders
      const allOrders = [...ordersWithUpdates, ...uniqueOfflineOrders]

      // Create a map of order_item_id -> total quantity already paid
      const paidQuantities = {}
      existingSplitBills?.forEach(splitBill => {
        splitBill.split_bill_items?.forEach(item => {
          if (!paidQuantities[item.order_item_id]) {
            paidQuantities[item.order_item_id] = 0
          }
          paidQuantities[item.order_item_id] += item.quantity
        })
      })

      // Filter out fully paid items and adjust quantities for partially paid items
      const filteredOrders = allOrders?.map(order => {
        const filteredItems = order.order_items?.map(item => {
          const alreadyPaid = paidQuantities[item.id] || 0
          const remainingQuantity = item.quantity - alreadyPaid

          if (remainingQuantity <= 0) {
            return null // Item fully paid via split bills
          }

          // Return item with adjusted quantity
          return {
            ...item,
            quantity: remainingQuantity
          }
        }).filter(item => item !== null) // Remove null entries

        // Recalculate order total based on remaining items
        const newTotal = filteredItems?.reduce((sum, item) => {
          return sum + ((item.quantity || 0) * (item.price_at_time || 0))
        }, 0) || 0

        return {
          ...order,
          order_items: filteredItems,
          total: newTotal
        }
      }).filter(order => order.order_items && order.order_items.length > 0) // Remove orders with no remaining items

      if (filteredOrders.length === 0) {
        showNotification('info', 'No unpaid orders found for this table.')
        return
      }

      setUnpaidOrders(filteredOrders || [])
      setShowPaymentModal(true)
    } catch (err) {
      console.error('Error opening payment modal:', err)
      showNotification('error', t('notifications.paymentFailed'))
    }
  }

  const openSplitBillModal = async (table) => {
    setSelectedTable(table)
    setSplitBillTableId(table.id)

    try {
      // Get all unpaid, non-cancelled orders for this table
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_id', table.id)
        .is('paid', false)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true })

      if (ordersError) throw ordersError

      // Get existing paid split bills for this table to know what's already been paid
      const { data: existingSplitBills } = await supabase
        .from('split_bills')
        .select('*, split_bill_items(*)')
        .eq('table_id', table.id)
        .eq('payment_status', 'completed')

      // Create a map of order_item_id -> total quantity already paid
      const paidQuantities = {}
      existingSplitBills?.forEach(splitBill => {
        splitBill.split_bill_items?.forEach(item => {
          if (!paidQuantities[item.order_item_id]) {
            paidQuantities[item.order_item_id] = 0
          }
          paidQuantities[item.order_item_id] += item.quantity
        })
      })

      // Flatten all order items into a single list with orderId reference
      // Subtract already paid quantities from available quantities
      const items = []
      orders?.forEach(order => {
        order.order_items?.forEach(item => {
          const alreadyPaid = paidQuantities[item.id] || 0
          const remainingQuantity = item.quantity - alreadyPaid

          if (remainingQuantity > 0) {
            items.push({
              id: item.id,
              name: item.name,
              quantity: remainingQuantity,
              price: item.price_at_time,
              orderId: order.id
            })
          }
        })
      })

      setAvailableItems(items)
      setSplitBills([]) // Reset split bills
      setShowSplitBillModal(true)
    } catch (err) {
      console.error('Error opening split bill modal:', err)
      if (!navigator.onLine) {
        showNotification('error', 'Split bill is not available offline. Please connect to the internet.')
      } else {
        showNotification('error', t('notifications.splitBillPaymentFailed'))
      }
    }
  }

  const openOrderDetailsModal = async (table) => {
    setSelectedTable(table)

    try {
      let orders = []

      // Try to get orders from Supabase
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('table_id', table.id)
          .is('paid', false)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: true })

        if (ordersError) throw ordersError
        orders = ordersData || []
      } catch (fetchErr) {
        console.warn('Could not fetch orders from Supabase:', fetchErr)
        // Continue with offline data if available
      }

      // Get pending order updates (items added to existing orders while offline)
      const pendingUpdates = await getPendingOrderUpdatesForTable(table.id)

      // Merge pending order updates into their parent orders
      const ordersWithUpdates = orders.map(order => {
        const updates = pendingUpdates.filter(u => u.order_id === order.id)
        if (updates.length === 0) return order

        // Merge all update items into this order
        const mergedItems = [...(order.order_items || [])]
        let additionalTotal = 0

        for (const update of updates) {
          for (const item of update.items || []) {
            const existingIdx = mergedItems.findIndex(i => i.menu_item_id === item.menu_item_id)
            if (existingIdx >= 0) {
              mergedItems[existingIdx] = {
                ...mergedItems[existingIdx],
                quantity: mergedItems[existingIdx].quantity + item.quantity
              }
            } else {
              mergedItems.push({
                id: `offline_update_${Date.now()}_${Math.random()}`,
                menu_item_id: item.menu_item_id,
                name: item.name,
                quantity: item.quantity,
                price_at_time: item.price_at_time,
              })
            }
            additionalTotal += (item.price_at_time || 0) * (item.quantity || 0)
          }
        }

        return {
          ...order,
          order_items: mergedItems,
          total: (order.total || 0) + additionalTotal
        }
      })

      // Also get pending offline orders (not yet synced to Supabase)
      const offlineOrders = await getPendingOrdersForTable(table.id)
      const formattedOfflineOrders = offlineOrders.map(order => ({
        id: order.client_id, // Use client_id as temporary id
        client_id: order.client_id,
        table_id: order.table_id,
        total: order.total,
        status: order.status || 'pending',
        created_at: order.created_at,
        order_items: order.order_items?.map(item => ({
          id: `offline_${item.id || Math.random()}`,
          menu_item_id: item.menu_item_id,
          name: item.name,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
        })) || []
      }))

      // Combine and deduplicate
      const supabaseClientIds = new Set(orders.filter(o => o.client_id).map(o => o.client_id))
      const uniqueOfflineOrders = formattedOfflineOrders.filter(o =>
        !supabaseClientIds.has(o.client_id)
      )

      const allOrders = [...ordersWithUpdates, ...uniqueOfflineOrders]

      if (allOrders.length === 0 && !navigator.onLine) {
        showNotification('info', 'No order data available offline.')
        return
      }

      setTableOrderDetails(allOrders)
      setShowOrderDetailsModal(true)
    } catch (err) {
      console.error('Error opening order details modal:', err)
      if (!navigator.onLine) {
        showNotification('error', 'Order details not available offline.')
      } else {
        showNotification('error', 'Failed to load order details')
      }
    }
  }

  const markTableAsCleaned = async (table) => {
    // OFFLINE: Update local state immediately
    if (!navigator.onLine) {
      setTables(prev => prev.map(t =>
        t.id === table.id
          ? { ...t, status: 'available', payment_completed_at: null }
          : t
      ))
      showNotification('success', `Table ${table.table_number} marked as cleaned (will sync when online)`)
      return
    }

    try {
      // Call the RPC function to mark table as cleaned
      // This function has SECURITY DEFINER so it works for staff too
      const { data, error } = await supabase
        .rpc('mark_table_cleaned', {
          p_table_id: table.id,
          p_payment_completed_at: table.payment_completed_at
        })

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to mark table as cleaned')
      }

      // Refresh table list
      await fetchData()

      const cleanupTime = data?.cleanup_duration_minutes
      const message = cleanupTime
        ? t('tableCleanedWithTime').replace('{tableNumber}', table.table_number).replace('{minutes}', cleanupTime)
        : t('tableCleanedReady').replace('{tableNumber}', table.table_number)

      showNotification('success', message)
    } catch (error) {
      console.error('Error marking table as cleaned:', error)
      // If network failed mid-request, update local state anyway
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setTables(prev => prev.map(t =>
          t.id === table.id
            ? { ...t, status: 'available', payment_completed_at: null }
            : t
        ))
        showNotification('success', `Table ${table.table_number} marked as cleaned (will sync when online)`)
        return
      }
      showNotification('error', t('notifications.tableCleanedFailed'))
    }
  }

  const markOrderDelivered = async (table, department) => {
    try {
      // Get all unpaid orders for this table with their items
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          order_items (
            id,
            marked_ready_at,
            delivered_at,
            menu_items (
              department,
              name
            )
          )
        `)
        .eq('table_id', table.id)
        .is('paid', false)

      if (fetchError) throw fetchError

      if (!orders || orders.length === 0) {
        showNotification('info', t('notifications.noOrdersToDeliver'))
        return
      }

      // Find all items from the specified department that are ready but not delivered
      const itemsToDeliver = []
      orders.forEach(order => {
        order.order_items?.forEach(item => {
          const itemDepartment = item.menu_items?.department || 'kitchen'
          // Match items from this department that are ready but not delivered
          if (itemDepartment === department && item.marked_ready_at && !item.delivered_at) {
            itemsToDeliver.push(item.id)
          }
        })
      })

      if (itemsToDeliver.length === 0) {
        showNotification('info', `No ready ${department} items to deliver`)
        return
      }

      // Mark items as delivered
      const { error: updateError } = await supabase
        .from('order_items')
        .update({
          delivered_at: new Date().toISOString()
        })
        .in('id', itemsToDeliver)

      if (updateError) throw updateError

      // Refresh table order info
      await fetchTableOrderInfo(restaurant.id)

      const departmentLabel = department.charAt(0).toUpperCase() + department.slice(1)
      showNotification('success', `${itemsToDeliver.length} ${departmentLabel} item${itemsToDeliver.length > 1 ? 's' : ''} delivered to Table ${table.table_number}!`)
    } catch (error) {
      console.error('Error marking items as delivered:', error)
      showNotification('error', t('notifications.itemsDeliveredFailed'))
    }
  }

  const processPayment = async (paymentMethod) => {
    if (unpaidOrders.length === 0) return

    // Get user info for payment tracking
    let userName = 'Unknown'
    let userId = null

    // Check if staff session (PIN login)
    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      const staffSession = JSON.parse(staffSessionData)
      userName = staffSession.name || staffSession.email || 'Staff'
      // Don't set userId for staff (they don't have a Supabase Auth user)
    } else {
      // Owner/admin with Supabase Auth
      try {
        const { data: userData } = await supabase.auth.getUser()
        userName = userData.user?.user_metadata?.name || userData.user?.email || 'Unknown'
        userId = userData.user?.id || null
      } catch {
        // Offline — use default
      }
    }

    const totalAmount = calculateTableTotal()

    // OFFLINE CASH PAYMENT HANDLING
    if (!navigator.onLine) {
      if (paymentMethod !== 'cash') {
        showNotification('error', 'Only cash payments are available offline. Card payments require internet.')
        return
      }

      try {
        // Separate orders by type:
        // - Orders with real ID (from Supabase) go to orderIds - these need to be processed by RPC on sync
        // - Orders with only client_id (pure offline, not yet synced) go to orderClientIds
        // Note: Synced orders have BOTH id and client_id - they should go to orderIds since they exist in Supabase
        const orderIds = unpaidOrders
          .filter(o => o.id && !o.id.toString().startsWith('offline_'))
          .map(o => o.id)
        const orderClientIds = unpaidOrders
          .filter(o => o.client_id && !o.id) // Only pure offline orders (no Supabase ID yet)
          .map(o => o.client_id)

        // Store payment locally for later sync
        await addPendingPayment({
          restaurant_id: restaurant.id,
          table_id: selectedTable.id,
          order_ids: orderIds,
          order_client_ids: orderClientIds,
          total_amount: totalAmount,
          payment_method: 'cash',
          staff_name: userName,
          user_id: userId,
        })

        // Mark pure offline orders as paid locally (these are in IndexedDB)
        if (orderClientIds.length > 0) {
          await markOrdersPaidOffline(orderClientIds)
        }

        // Update local table state immediately
        setTableOrderInfo(prev => {
          const updated = { ...prev }
          delete updated[selectedTable.id] // Remove this table's order info (it's now paid)
          return updated
        })

        // Update table to show as needing cleaning
        setTables(prev => prev.map(t =>
          t.id === selectedTable.id
            ? { ...t, status: 'needs_cleaning', payment_completed_at: new Date().toISOString() }
            : t
        ))

        // Close payment modal
        setShowPaymentModal(false)
        setUnpaidOrders([])

        // AGGRESSIVE CLEANUP: Remove ALL offline data for this table to prevent stale orders
        // This is critical because old orders must not appear when creating new orders
        await clearAllOfflineOrdersForTable(selectedTable.id)

        // Also clear localStorage cache for this table
        localStorage.removeItem(`table_orders_${selectedTable.id}`)

        // Clear the Supabase query cache for this table's orders
        // This prevents stale cached orders from appearing when placing new orders
        clearOrdersCacheForTable(selectedTable.id)

        showNotification('success', `Cash payment of £${totalAmount.toFixed(2)} saved offline. Will sync when internet is restored.`)

        // Don't show post-payment modal for offline payments (invoice generation needs internet)
        return
      } catch (offlineErr) {
        console.error('Offline payment error:', offlineErr)
        showNotification('error', 'Failed to save offline payment. Please try again.')
        return
      }
    }

    // ONLINE PAYMENT HANDLING
    try {
      // Get order IDs - filter out offline-only orders that don't have real IDs
      const orderIds = unpaidOrders.filter(order => order.id && !order.id.toString().startsWith('offline_')).map(order => order.id)

      // Use RPC function to process payment (bypasses RLS)
      // This function also marks the table as needs cleaning
      const { data, error } = await supabase.rpc('process_table_payment', {
        p_order_ids: orderIds,
        p_payment_method: paymentMethod,
        p_staff_name: userName,
        p_user_id: userId
      })

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to process payment')
      }

      // Close payment modal
      setShowPaymentModal(false)
      setUnpaidOrders([])

      // Store completed order IDs for invoice generation
      setCompletedOrderIds(orderIds)

      // Clean up any stale offline orders for this table
      await clearPaidOfflineOrders(selectedTable.id)

      // Clear any pending order updates for this table
      await clearPendingOrderUpdates(selectedTable.id)

      // Clear the localStorage cache for this table
      localStorage.removeItem(`table_orders_${selectedTable.id}`)

      // Refresh table order info and table list
      await fetchTableOrderInfo(restaurant.id)
      await fetchData()

      showNotification('success', `Payment of £${totalAmount.toFixed(2)} processed successfully via ${paymentMethod}!`)

      // Show post-payment modal (with invoice option)
      setShowPostPaymentModal(true)
    } catch (error) {
      console.error('Payment error:', error)
      showNotification('error', t('notifications.paymentFailed'))
    }
  }

  const calculateTableTotal = () => {
    // Calculate total from items instead of using stored order.total
    // This ensures accuracy even when stored totals are stale or incorrect
    return unpaidOrders.reduce((orderSum, order) => {
      const orderItemsTotal = (order.order_items || []).reduce((itemSum, item) => {
        return itemSum + ((item.price_at_time || 0) * (item.quantity || 0))
      }, 0)
      // Fall back to order.total if no items (shouldn't happen, but safety first)
      return orderSum + (orderItemsTotal > 0 ? orderItemsTotal : (order.total || 0))
    }, 0)
  }

  const processSplitBillPayment = async (bill, paymentMethod) => {
    if (!bill || bill.items.length === 0) {
      showNotification('error', t('notifications.noItemsInBill'))
      return
    }

    try {
      let userName = 'Unknown'
      let userId = null

      // Check if staff session (PIN login)
      const staffSessionData = localStorage.getItem('staff_session')
      if (staffSessionData) {
        const staffSession = JSON.parse(staffSessionData)
        userName = staffSession.name || staffSession.email || 'Staff'
      } else {
        const { data: userData } = await supabase.auth.getUser()
        userName = userData.user?.user_metadata?.name || userData.user?.email || 'Unknown'
        userId = userData.user?.id || null
      }

      // Prepare split bill items for RPC function
      const splitBillItems = bill.items.map(item => ({
        order_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
        item_total: item.total
      }))

      // Use RPC function to process split bill payment (bypasses RLS for PIN-based staff logins)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('process_split_bill_payment', {
        p_restaurant_id: restaurant.id,
        p_table_id: splitBillTableId,
        p_split_name: bill.name,
        p_total_amount: bill.total,
        p_payment_method: paymentMethod,
        p_paid_by: userName,
        p_split_bill_items: splitBillItems,
        p_paid_by_user_id: userId
      })

      if (rpcError) throw rpcError
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error)

      // Mark this bill as paid in the state and get updated bills
      let updatedSplitBills = []
      setSplitBills(prev => {
        updatedSplitBills = prev.map(b => b.id === bill.id ? { ...b, paid: true, paymentMethod, tableId: splitBillTableId } : b)
        return updatedSplitBills
      })

      showNotification('success', `${bill.name} paid successfully: £${bill.total.toFixed(2)} via ${paymentMethod}`)

      // Refresh table order info immediately after each split bill payment
      await fetchTableOrderInfo(restaurant.id)

      // Check if all original items have been paid
      const remainingQuantity = availableItems.reduce((sum, item) => sum + item.quantity, 0)
      const unpaidBillsWithItems = updatedSplitBills.filter(b => !b.paid && b.items.length > 0)
      const allItemsPaid = remainingQuantity === 0 && unpaidBillsWithItems.length === 0

      if (allItemsPaid) {
        // All items have been paid across all split bills - complete the order
        const allOrderIds = [...new Set(
          availableItems.map(item => item.orderId).filter(Boolean)
        )]

        const { error: updateError } = await supabase.rpc('process_table_payment', {
          p_order_ids: allOrderIds,
          p_payment_method: 'split',
          p_staff_name: userName,
          p_user_id: userId
        })

        if (updateError) {
          console.error('Error marking orders as paid:', updateError)
        } else {
          // Update table status to needs_cleaning
          const { error: tableUpdateError } = await supabase
            .from('tables')
            .update({ status: 'needs_cleaning' })
            .eq('id', splitBillTableId)

          if (tableUpdateError) {
            console.error('Error updating table status:', tableUpdateError)
          }

          setCompletedOrderIds(allOrderIds)

          // Refresh data
          await fetchTableOrderInfo(restaurant.id)
          await fetchData()

          showNotification('success', t('notifications.allBillsPaid'))
        }
      }
    } catch (error) {
      console.error('Split bill payment error:', error)
      showNotification('error', t('notifications.splitBillPaymentFailed'))
    }
  }

  const openInvoiceModal = (orderId = null, tableId = null) => {
    setInvoiceOrderId(orderId)
    setInvoiceTableId(tableId)
    setShowInvoiceModal(true)
  }

  const handleInvoiceGeneration = async ({ clientId, clientData, action }) => {
    setGeneratingInvoice(true)

    try {
      let orderId = invoiceOrderId

      // If no specific order ID, find the most recent paid order for this table
      if (!orderId && invoiceTableId) {
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('table_id', invoiceTableId)
          .eq('paid', true)
          .order('created_at', { ascending: false })
          .limit(1)

        if (ordersError) throw ordersError

        if (!orders || orders.length === 0) {
          showNotification('error', t('notifications.noPaidOrders'))
          setGeneratingInvoice(false)
          return
        }

        orderId = orders[0].id
      }

      if (!orderId) {
        showNotification('error', t('notifications.noOrderId'))
        setGeneratingInvoice(false)
        return
      }

      // First, generate invoice data from API
      const generateResponse = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderId,
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
            orderId: orderId,
            clientId,
            clientData,
            pdfBase64
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `Failed to send invoice email (${emailResponse.status})`)
        }

        // Close modals and show success
        setShowInvoiceModal(false)
        setShowPostPaymentModal(false)
        setInvoiceTableId(null)
        setInvoiceOrderId(null)
        setSelectedTable(null)
        setUnpaidOrders([])
        setCompletedOrderIds([])
        showNotification('success', `Invoice emailed successfully to ${clientData.email}!`)
      } else {
        // Download invoice as PDF (generated client-side)
        await downloadInvoicePdf(invoice, invoiceRestaurant)

        // Close modals and show success
        setShowInvoiceModal(false)
        setShowPostPaymentModal(false)
        setInvoiceTableId(null)
        setInvoiceOrderId(null)
        setSelectedTable(null)
        setUnpaidOrders([])
        setCompletedOrderIds([])
        showNotification('success', t('notifications.invoiceGenerated'))
      }
    } catch (error) {
      console.error('Invoice generation error:', error)
      showNotification('error', error.message || t('notifications.invoiceFailed'))
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const addItemToOrder = (item) => {
    console.log('===== ADD ITEM TO ORDER =====')
    console.log('Item to add:', item.name, 'ID:', item.id)

    setOrderItems(prevItems => {
      console.log('Current orderItems before add:', prevItems.length)
      console.log('Current items:', prevItems.map(i => `${i.name} x${i.quantity} (ID: ${i.menu_item_id})`))

      // Check for existing item
      const existingItemIndex = prevItems.findIndex(oi => oi.menu_item_id === item.id)
      console.log('Existing item index:', existingItemIndex)

      if (existingItemIndex !== -1) {
        // Update existing item's quantity
        console.log('Item already exists, incrementing quantity from', prevItems[existingItemIndex].quantity, 'to', prevItems[existingItemIndex].quantity + 1)
        const updated = [...prevItems]
        updated[existingItemIndex] = {
          ...updated[existingItemIndex],
          quantity: updated[existingItemIndex].quantity + 1
        }
        console.log('After update, total items:', updated.length)
        return updated
      } else {
        // Add new item
        console.log('Adding new item with quantity 1')
        const newItem = {
          menu_item_id: item.id,
          name: item.name,
          price_at_time: item.price,
          quantity: 1,
          isExisting: false,
          existingQuantity: 0
        }
        const newItems = [...prevItems, newItem]
        console.log('After add, total items:', newItems.length)
        return newItems
      }
    })
    console.log('===== ADD ITEM COMPLETE =====')
  }

  const updateItemQuantity = (menuItemId, newQuantity) => {
    setOrderItems(prevItems => {
      const itemIndex = prevItems.findIndex(oi => oi.menu_item_id === menuItemId)

      if (itemIndex === -1) return prevItems

      const item = prevItems[itemIndex]


      // For staff: cannot reduce below existing quantity
      if (userType === 'staff' && item.isExisting && newQuantity < item.existingQuantity) {
        showNotification('error', t('notifications.staffCannotReduceItems').replace('{quantity}', item.existingQuantity))
        return prevItems
      }

      // For staff: cannot delete existing items
      if (userType === 'staff' && item.isExisting && newQuantity === 0) {
        showNotification('error', t('notifications.staffCannotRemoveItems'))
        return prevItems
      }

      if (newQuantity === 0) {
        // Remove item
        return prevItems.filter(oi => oi.menu_item_id !== menuItemId)
      } else {
        // Update quantity
        const updated = [...prevItems]
        updated[itemIndex] = { ...updated[itemIndex], quantity: newQuantity }
        return updated
      }
    })
  }

  // Consolidate duplicate items in the array (safety measure)
  const consolidateOrderItems = (items) => {
    const consolidated = {}
    items.forEach(item => {
      const key = item.menu_item_id
      if (consolidated[key]) {
        consolidated[key].quantity += item.quantity
        // Preserve existing flags - if either is marked as existing, the consolidated one should be too
        if (item.isExisting) {
          consolidated[key].isExisting = true
          consolidated[key].existingQuantity = (consolidated[key].existingQuantity || 0) + (item.existingQuantity || 0)
        }
      } else {
        consolidated[key] = { ...item }
      }
    })
    return Object.values(consolidated)
  }

  const calculateTotal = () => {
    const consolidated = consolidateOrderItems(orderItems)
    return consolidated.reduce((sum, item) => sum + ((item.price_at_time || 0) * (item.quantity || 0)), 0)
  }

  const submitOrder = async () => {
    if (orderItems.length === 0) return

    // Consolidate items before submitting
    const consolidatedItems = consolidateOrderItems(orderItems)
    const total = consolidatedItems.reduce((sum, item) => sum + ((item.price_at_time || 0) * (item.quantity || 0)), 0)

    try {
      if (currentOrder) {
        // Updating existing order
        // For staff: prevent reducing quantities from the original order
        if (userType === 'staff') {
          const originalItems = currentOrder.order_items || []

          // Check if any item quantity was reduced
          for (const originalItem of originalItems) {
            const newItem = consolidatedItems.find(item => item.menu_item_id === originalItem.menu_item_id)
            if (newItem && newItem.quantity < originalItem.quantity) {
              showNotification('error', t('notifications.staffCannotReduceQuantities'))
              setLoggingIn(false)
              return
            }
          }

          // Check if any item was removed
          for (const originalItem of originalItems) {
            const stillExists = consolidatedItems.find(item => item.menu_item_id === originalItem.menu_item_id)
            if (!stillExists) {
              showNotification('error', t('notifications.staffCannotRemoveFromOrders'))
              setLoggingIn(false)
              return
            }
          }
        }

        // Update existing order
        const { error: orderError } = await supabase
          .from('orders')
          .update({ total })
          .eq('id', currentOrder.id)

        if (orderError) throw orderError

        // Delete old order items FIRST (with error checking!)
        console.log('Deleting old order items for order:', currentOrder.id)
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', currentOrder.id)

        if (deleteError) {
          console.error('ERROR deleting old order items:', deleteError)
          throw deleteError
        }
        console.log('Old items deleted successfully')

        // Now insert new items
        const itemsToInsert = consolidatedItems.map(item => ({
          order_id: currentOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
          name: item.name
        }))

        console.log('Inserting new order items:', itemsToInsert.length, 'items')
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('ERROR inserting new order items:', itemsError)
          throw itemsError
        }
        console.log('New items inserted successfully')

      } else {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            restaurant_id: restaurant.id,
            table_id: selectedTable.id,
            status: 'pending',
            total,
            paid: false
          })
          .select()
          .single()

        if (orderError) throw orderError

        const itemsToInsert = consolidatedItems.map(item => ({
          order_id: newOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
          name: item.name
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      // Cache orders for this table (for offline payment support)
      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('table_id', selectedTable.id)
          .is('paid', false)
          .neq('status', 'cancelled')
          .order('created_at', { ascending: true })
        if (ordersData && ordersData.length > 0) {
          localStorage.setItem(`table_orders_${selectedTable.id}`, JSON.stringify(ordersData))
        }
      } catch (e) {
        console.warn('Failed to cache orders:', e)
      }

      // Close modal and reset
      setShowOrderModal(false)
      setSelectedTable(null)
      setCurrentOrder(null)
      setOrderItems([])

      // Refresh table order info
      await fetchTableOrderInfo(restaurant.id)

      showNotification('success', currentOrder ? t('notifications.orderUpdated') : t('notifications.orderPlaced'))
    } catch (error) {
      // Check if this is a network error (offline or connection dropped)
      const isNetworkError = !navigator.onLine ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.code === 'NETWORK_ERROR'

      // If offline/network error, queue order locally
      if (isNetworkError) {
        try {
          let itemsToSave = consolidatedItems
          let totalToSave = total

          // If updating an existing order, only save the NEW items
          if (currentOrder) {
            const originalItems = currentOrder.order_items || []
            itemsToSave = consolidatedItems.filter(newItem => {
              const original = originalItems.find(o => o.menu_item_id === newItem.menu_item_id)
              if (!original) return true // completely new item
              return newItem.quantity > original.quantity // increased quantity
            }).map(newItem => {
              const original = originalItems.find(o => o.menu_item_id === newItem.menu_item_id)
              if (!original) return newItem
              // Only save the additional quantity
              return {
                ...newItem,
                quantity: newItem.quantity - original.quantity
              }
            }).filter(item => item.quantity > 0)

            if (itemsToSave.length === 0) {
              showNotification('info', 'No new items to add. Reducing quantities requires internet.')
              return
            }

            totalToSave = itemsToSave.reduce((sum, item) => sum + ((item.price_at_time || 0) * (item.quantity || 0)), 0)

            // If this is an existing order from Supabase, store as an ORDER UPDATE
            // so items get added to the same order (not as separate orders)
            if (currentOrder.id) {
              await addPendingOrderUpdate(currentOrder.id, selectedTable.id, itemsToSave.map(item => ({
                menu_item_id: item.menu_item_id,
                name: item.name,
                quantity: item.quantity,
                price_at_time: item.price_at_time,
              })))

              // NOTE: We intentionally do NOT update localStorage cache here.
              // The items are stored in IndexedDB and will be merged by openPaymentModal/openOrderModal.
              // Updating localStorage too would cause duplicate items when the modal reads from both sources.

              // Recalculate table order info to include the new offline items
              // This uses getAllPendingOrderUpdatesByTable() which will include our just-added items
              // We do NOT manually update the total here to avoid double-counting
              await fetchTableOrderInfo(restaurant.id)

              setShowOrderModal(false)
              setSelectedTable(null)
              setCurrentOrder(null)
              setOrderItems([])
              showNotification('success', 'Items added to order offline. Will sync when internet is restored.')
              return
            }
          }

          // Check if this is an existing OFFLINE order (has client_id but no Supabase id)
          if (currentOrder && currentOrder.client_id && !currentOrder.id) {
            // Update the existing offline order in IndexedDB
            console.log('Updating existing offline order:', currentOrder.client_id)
            await updatePendingOrder(
              currentOrder.client_id,
              itemsToSave.map(item => ({
                menu_item_id: item.menu_item_id,
                name: item.name,
                quantity: item.quantity,
                price_at_time: item.price_at_time,
              })),
              totalToSave
            )

            // Recalculate table order info to include the updated offline items
            await fetchTableOrderInfo(restaurant.id)

            setShowOrderModal(false)
            setSelectedTable(null)
            setCurrentOrder(null)
            setOrderItems([])
            showNotification('success', 'Items added to offline order. Will sync when internet is restored.')
            return
          }

          // New order - create a fresh pending order
          const clientId = generateClientId()
          await addPendingOrder({
            client_id: clientId,
            restaurant_id: restaurant.id,
            table_id: selectedTable.id,
            total: totalToSave,
            status: 'pending',
            order_type: 'dine_in',
          }, itemsToSave.map(item => ({
            menu_item_id: item.menu_item_id,
            name: item.name,
            quantity: item.quantity,
            price_at_time: item.price_at_time,
          })))

          // Recalculate table order info to include the new offline order
          // This uses getAllPendingOrderUpdatesByTable() which will include our just-added items
          // We do NOT manually update the total here to avoid double-counting
          await fetchTableOrderInfo(restaurant.id)

          setShowOrderModal(false)
          setSelectedTable(null)
          setCurrentOrder(null)
          setOrderItems([])
          const message = currentOrder
            ? 'Additional items saved offline — will sync when internet is restored.'
            : 'Order saved offline — will sync when internet is restored.'
          showNotification('success', message)
          return
        } catch (offlineErr) {
          console.error('Failed to save order offline:', offlineErr)
        }
      }

      console.error('Error submitting order:', error)
      showNotification('error', t('notifications.orderFailed'))
    }
  }

  if (loading) {
    return <div className="text-slate-500">{t('loading')}</div>
  }

  return (

      <div>
        {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] transition-all duration-300 ease-out animate-in slide-in-from-right">
          <div className={`rounded-xl shadow-lg p-4 min-w-[300px] max-w-md ${
            notification.type === 'success'
              ? 'bg-green-50 border-2 border-green-200'
              : notification.type === 'error'
              ? 'bg-red-50 border-2 border-red-200'
              : 'bg-blue-50 border-2 border-blue-200'
          }`}>
            <div className="flex items-start gap-3">
              {notification.type === 'success' && (
                <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              )}
              {notification.type === 'info' && (
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  notification.type === 'success'
                    ? 'text-green-900'
                    : notification.type === 'error'
                    ? 'text-red-900'
                    : 'text-blue-900'
                }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`flex-shrink-0 ${
                  notification.type === 'success'
                    ? 'text-green-600 hover:text-green-800'
                    : notification.type === 'error'
                    ? 'text-red-600 hover:text-red-800'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex gap-3">
          {userType === 'owner' && tables.length > 0 && (
            <button
              onClick={downloadAllQR}
              className="border-2 border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-medium hover:bg-slate-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              {t('downloadAllQR')}
            </button>
          )}
          {userType === 'owner' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              {t('addTable')}
            </button>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 5a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm6 0H5v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4zm6 0H5v4h4v-4zm2-8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5zm6 0h-4v4h4V5zm-6 8a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2v-4zm6 0h-4v4h4v-4z"/>
            </svg>
          </div>
          <p className="text-slate-500 mb-4">{t('noTablesYet')}</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-[#6262bd] font-medium hover:underline"
          >
            {t('addFirstTable')}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              orderInfo={tableOrderInfo[table.id]}
              reservations={todayReservations[table.id]}
              waiterCalls={waiterCalls[table.id]}
              userType={userType}
              onDownload={() => downloadQR(table)}
              onDelete={() => deleteTable(table.id)}
              onPlaceOrder={() => openOrderModal(table)}
              onPayBill={() => openPaymentModal(table)}
              onSplitBill={() => openSplitBillModal(table)}
              onViewOrders={() => openOrderDetailsModal(table)}
              onMarkCleaned={() => markTableAsCleaned(table)}
              onMarkDelivered={(department) => markOrderDelivered(table, department)}
              onViewReservations={() => openViewReservationsModal(table)}
              onCreateReservation={() => openCreateReservationModal(table)}
              onAcknowledgeWaiterCall={acknowledgeWaiterCall}
            />
          ))}
        </div>
      )}

      {/* Add Table Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">{t('addNewTable')}</h2>

            <form onSubmit={addTable}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('tableNumberName')}
                </label>
                <input
                  type="text"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder={t('tableNumberPlaceholder')}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                >
                  {t('addTable')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Place Order Modal */}
      {showOrderModal && selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => {
            setShowOrderModal(false)
            setSelectedTable(null)
            setCurrentOrder(null)
            setOrderItems([])
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-4xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {currentOrder ? 'Update Order' : 'Place Order'} - Table {selectedTable.table_number}
                </h2>
                {currentOrder && (
                  <p className="text-sm text-slate-500">Order #{currentOrder.id.slice(0, 8)}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setSelectedTable(null)
                  setCurrentOrder(null)
                  setOrderItems([])
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Info banner for staff editing existing orders */}
            {currentOrder && userType === 'staff' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">{t('orderModal.updatingExistingOrder')}</p>
                    <p className="text-xs text-blue-700 mt-1">
                      {t('orderModal.staffEditingInfo')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Menu Items */}
              <div className="lg:col-span-2">
                <h3 className="font-semibold text-slate-700 mb-4">{t('orderModal.menuItems')}</h3>
                {menuItems.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-8 text-center">
                    <p className="text-slate-500">{t('orderModal.noMenuItems')}</p>
                    <p className="text-sm text-slate-400 mt-2">{t('orderModal.addItemsFirst')}</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {categories.length > 0 ? (
                      categories.map(category => {
                        const categoryItems = menuItems.filter(item => item.category_id === category.id)
                        if (categoryItems.length === 0) return null

                        return (
                          <div key={category.id}>
                            <h4 className="font-medium text-slate-600 mb-2">{category.name}</h4>
                            <div className="space-y-2">
                              {categoryItems.map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => addItemToOrder(item)}
                                  className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                                >
                                  {item.image_url && (
                                    <img
                                      src={item.image_url}
                                      alt={item.name}
                                      className="w-16 h-16 rounded-lg object-cover"
                                    />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-800">{item.name}</p>
                                    {item.description && (
                                      <p className="text-sm text-slate-500">{item.description}</p>
                                    )}
                                    {!item.available && (
                                      <span className="text-xs text-red-500">{t('orderModal.unavailable')}</span>
                                    )}
                                  </div>
                                  <span className="font-semibold text-[#6262bd] ml-2">£{item.price.toFixed(2)}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      // Show all items without categories if no categories exist
                      <div className="space-y-2">
                        {menuItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => addItemToOrder(item)}
                            className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-left"
                          >
                            {item.image_url && (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-slate-800">{item.name}</p>
                              {item.description && (
                                <p className="text-sm text-slate-500">{item.description}</p>
                              )}
                              {!item.available && (
                                <span className="text-xs text-red-500">{t('orderModal.unavailable')}</span>
                              )}
                            </div>
                            <span className="font-semibold text-[#6262bd] ml-2">£{item.price.toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-4">{t('orderModal.orderSummary')}</h3>
                {orderItems.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-6 text-center">
                    <p className="text-slate-500">{t('orderModal.noItemsAdded')}</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-50 rounded-xl p-4 mb-4 max-h-64 overflow-y-auto">
                      {orderItems.map((item) => {
                        const newQuantity = item.isExisting ? item.quantity - item.existingQuantity : item.quantity
                        const hasNewItems = newQuantity > 0

                        return (
                          <div key={item.menu_item_id} className={`mb-3 last:mb-0 rounded-lg p-2 ${item.isExisting ? 'bg-blue-50/50 border border-blue-200' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 text-sm">{item.quantity}x {item.name}</p>
                                <p className="text-xs text-slate-500">£{(item.price_at_time || 0).toFixed(2)} each</p>

                                {/* Show breakdown if item has both existing and new quantities */}
                                {item.isExisting && hasNewItems && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    {t('orderModal.quantityBreakdown').replace('{existing}', item.existingQuantity).replace('{new}', newQuantity)}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {(() => {
                                  // Debug: Only log once per render
                                  if (orderItems.indexOf(item) === 0) {
                                    console.log('🔍 Modal Controls Debug:', {
                                      userType,
                                      currentOrder: !!currentOrder,
                                      condition: userType === 'owner' || !currentOrder,
                                      willShowOwnerControls: userType === 'owner' || !currentOrder
                                    })
                                  }
                                  return null
                                })()}
                                {userType === 'owner' || !currentOrder ? (
                                  // Owners can always modify, staff can only modify NEW orders
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        updateItemQuantity(item.menu_item_id, item.quantity - 1)
                                      }}
                                      className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                                    >
                                      -
                                    </button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        updateItemQuantity(item.menu_item_id, item.quantity + 1)
                                      }}
                                      className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
                                    >
                                      +
                                    </button>
                                  </>
                                ) : (
                                  // Staff editing existing order: restricted controls
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        updateItemQuantity(item.menu_item_id, item.quantity - 1)
                                      }}
                                      disabled={item.isExisting && item.quantity <= item.existingQuantity}
                                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                        item.isExisting && item.quantity <= item.existingQuantity
                                          ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                          : 'bg-slate-200 hover:bg-slate-300'
                                      }`}
                                      title={item.isExisting && item.quantity <= item.existingQuantity ? t('orderModal.cannotReduceExisting') : ''}
                                    >
                                      -
                                    </button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        updateItemQuantity(item.menu_item_id, item.quantity + 1)
                                      }}
                                      className="w-6 h-6 rounded bg-green-600 hover:bg-green-700 text-white flex items-center justify-center text-lg transition-colors"
                                    >
                                      +
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="bg-[#6262bd]/10 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">{t('orderModal.total')}</span>
                        <span className="text-xl font-bold text-[#6262bd]">£{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={submitOrder}
                      className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3]"
                    >
                      {currentOrder ? t('orderModal.updateOrder') : t('orderModal.placeOrder')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {t('paymentModal.title').replace('{tableNumber}', selectedTable.table_number)}
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedTable(null)
                  setUnpaidOrders([])
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {unpaidOrders.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center mb-6">
                <p className="text-slate-500">{t('paymentModal.noUnpaidOrders')}</p>
              </div>
            ) : (
              <>
                {/* Order Summary */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-700 mb-3">{t('paymentModal.ordersSummary')}</h3>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto">
                    {unpaidOrders.map((order, index) => {
                      // Calculate order total from items for accuracy
                      const orderTotal = (order.order_items || []).reduce((sum, item) => {
                        return sum + ((item.price_at_time || 0) * (item.quantity || 0))
                      }, 0) || order.total || 0
                      return (
                      <div key={order.id} className="border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-slate-600">{t('paymentModal.orderNumber').replace('{number}', index + 1)}</span>
                          <span className="text-sm font-semibold text-[#6262bd]">£{orderTotal.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          {order.order_items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <span>{item.quantity}x {item.name}</span>
                              <span className="text-slate-600 font-medium">£{((item.price_at_time || 0) * (item.quantity || 1)).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {t('paymentModal.status')}: <span className="capitalize">{order.status}</span>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-[#6262bd]/10 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">{t('paymentModal.totalToPay')}</span>
                    <span className="text-2xl font-bold text-[#6262bd]">£{calculateTableTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3">
                  <button
                    onClick={() => processPayment('cash')}
                    className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                    {t('paymentModal.payWithCash')}
                  </button>
                  <button
                    onClick={() => processPayment('card')}
                    className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                    {t('paymentModal.payWithCard')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {showSplitBillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">
                {t('splitBillModal.title').replace('{tableNumber}', selectedTable?.table_number)}
              </h2>
              <button
                onClick={() => {
                  setShowSplitBillModal(false)
                  setSplitBills([])
                  setAvailableItems([])
                  setSplitBillTableId(null)
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side: Available Items */}
              <div>
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-slate-800 mb-2">{t('splitBillModal.availableItems')}</h3>
                  <p className="text-sm text-slate-600">{t('splitBillModal.clickToAssign')}</p>
                </div>

                <div className="space-y-2">
                  {availableItems.filter(item => item.quantity > 0).map((item) => (
                    <div key={item.id} className="bg-white border-2 border-slate-200 rounded-xl p-4 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">{item.name}</h4>
                          <p className="text-sm text-slate-600">
                            {t('splitBillModal.quantityAvailable').replace('{quantity}', item.quantity).replace('{price}', item.price.toFixed(2))}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800">£{(item.quantity * item.price).toFixed(2)}</span>
                      </div>

                      {/* Bill Assignment Buttons - Only show unpaid bills */}
                      <div className="space-y-2">
                        {splitBills.filter(b => !b.paid).map((bill) => (
                          <div key={bill.id} className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (item.quantity <= 0) return

                                // Decrease available quantity
                                setAvailableItems(prev =>
                                  prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)
                                )

                                // Add 1 quantity to bill
                                setSplitBills(prev =>
                                  prev.map(b => {
                                    if (b.id === bill.id) {
                                      const existingItem = b.items.find(i => i.id === item.id)
                                      if (existingItem) {
                                        return {
                                          ...b,
                                          items: b.items.map(i =>
                                            i.id === item.id
                                              ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
                                              : i
                                          ),
                                          total: b.total + item.price
                                        }
                                      } else {
                                        return {
                                          ...b,
                                          items: [...b.items, { ...item, quantity: 1, total: item.price }],
                                          total: b.total + item.price
                                        }
                                      }
                                    }
                                    return b
                                  })
                                )
                              }}
                              disabled={item.quantity <= 0}
                              className="flex-1 px-3 py-2 bg-[#6262bd] text-white text-sm rounded-lg hover:bg-[#5252a3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                              </svg>
                              {t('splitBillModal.addToBill').replace('{billName}', bill.name)}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {availableItems.filter(item => item.quantity > 0).length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      {t('splitBillModal.allItemsAssigned')}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Split Bills */}
              <div>
                {/* Paid Bills */}
                {splitBills.filter(b => b.paid).length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-800 mb-3">{t('splitBillModal.paidBills')}</h3>
                    <div className="space-y-2">
                      {splitBills.filter(b => b.paid).map((bill) => (
                        <div key={bill.id} className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            <span className="font-semibold text-slate-800">{bill.name}</span>
                            <span className="text-slate-600">£{bill.total.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => {
                              setInvoiceOrderId(null)
                              setInvoiceTableId(bill.tableId || selectedTable?.id || null)
                              setShowInvoiceModal(true)
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                            {t('splitBillModal.invoice')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unpaid Bills */}
                <div className="space-y-4">
                  {splitBills.filter(b => !b.paid).map((bill) => (
                    <div key={bill.id} className="bg-white border-2 border-[#6262bd]/30 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-lg text-slate-800">{bill.name}</h4>
                        {splitBills.filter(b => !b.paid).length > 1 && (
                          <button
                            onClick={() => {
                              // Return all quantities to available
                              const billItems = bill.items
                              setAvailableItems(prev =>
                                prev.map(i => {
                                  const billItem = billItems.find(bi => bi.id === i.id)
                                  return billItem ? { ...i, quantity: i.quantity + billItem.quantity } : i
                                })
                              )
                              setSplitBills(prev => prev.filter(b => b.id !== bill.id))
                            }}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {bill.items.length > 0 ? (
                        <>
                          <div className="space-y-2 mb-3">
                            {bill.items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-sm bg-slate-50 rounded-lg p-2">
                                <div className="flex-1">
                                  <div className="font-medium text-slate-800">{item.name}</div>
                                  <div className="text-xs text-slate-600">
                                    {item.quantity} × £{item.price.toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">£{item.total.toFixed(2)}</span>
                                  <button
                                    onClick={() => {
                                      // Return 1 quantity back to available
                                      setAvailableItems(prev =>
                                        prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
                                      )

                                      // Decrease quantity in bill
                                      setSplitBills(prev =>
                                        prev.map(b => {
                                          if (b.id === bill.id) {
                                            const updatedItems = b.items.map(i =>
                                              i.id === item.id && i.quantity > 1
                                                ? { ...i, quantity: i.quantity - 1, total: (i.quantity - 1) * i.price }
                                                : i
                                            ).filter(i => i.id !== item.id || i.quantity > 0)

                                            return {
                                              ...b,
                                              items: updatedItems,
                                              total: b.total - item.price
                                            }
                                          }
                                          return b
                                        })
                                      )
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="border-t-2 border-slate-200 pt-3">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-slate-700">{t('splitBillModal.total')}</span>
                              <span className="text-xl font-bold text-[#6262bd]">£{bill.total.toFixed(2)}</span>
                            </div>

                            {/* Payment buttons */}
                            <div className="space-y-2">
                              <button
                                onClick={() => processSplitBillPayment(bill, 'cash')}
                                className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                                </svg>
                                {t('splitBillModal.payCash').replace('{amount}', bill.total.toFixed(2))}
                              </button>
                              <button
                                onClick={() => processSplitBillPayment(bill, 'card')}
                                className="w-full bg-[#6262bd] text-white py-2 rounded-lg font-semibold hover:bg-[#5252a3] flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                </svg>
                                {t('splitBillModal.payCard').replace('{amount}', bill.total.toFixed(2))}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6 text-slate-400 text-sm">
                          {t('splitBillModal.noItemsInBill')}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Another Bill Button */}
                  {splitBills.length === 0 && (
                    <button
                      onClick={() => {
                        setSplitBills([{ id: 1, name: t('splitBillModal.billNumber').replace('{number}', '1'), items: [], total: 0 }])
                      }}
                      className="w-full px-4 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a3] transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      {t('splitBillModal.createFirstBill')}
                    </button>
                  )}
                  {splitBills.some(b => b.paid) && availableItems.some(item => item.quantity > 0) && (
                    <button
                      onClick={() => {
                        const newBillId = Math.max(...splitBills.map(b => b.id), 0) + 1
                        setSplitBills([...splitBills, {
                          id: newBillId,
                          name: t('splitBillModal.billNumber').replace('{number}', newBillId),
                          items: [],
                          total: 0
                        }])
                      }}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      {t('splitBillModal.addAnotherBill')}
                    </button>
                  )}
                </div>

                {/* Summary */}
                <div className="mt-4 bg-[#6262bd]/10 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700">{t('splitBillModal.originalTotal')}</span>
                    <span className="font-bold text-slate-800">£{calculateTableTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700">{t('splitBillModal.assignedToBills')}</span>
                    <span className="font-bold text-[#6262bd]">
                      £{splitBills.reduce((sum, b) => sum + b.total, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">{t('splitBillModal.remaining')}</span>
                    <span className="font-bold text-orange-600">
                      £{(calculateTableTotal() - splitBills.reduce((sum, b) => sum + b.total, 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetailsModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Table {selectedTable.table_number} - Order Details
              </h2>
              <button
                onClick={() => {
                  setShowOrderDetailsModal(false)
                  setSelectedTable(null)
                  setTableOrderDetails([])
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {tableOrderDetails.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center">
                <p className="text-slate-500">No orders for this table</p>
              </div>
            ) : (
              <>
                {/* All Orders */}
                <div className="space-y-4 mb-6">
                  {tableOrderDetails.map((order, index) => (
                    <div key={order.id} className="bg-slate-50 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-700">Order #{index + 1}</h3>
                          <p className="text-xs text-slate-500">
                            {new Date(order.created_at).toLocaleTimeString()} •
                            <span className="capitalize ml-1">{order.status}</span>
                          </p>
                        </div>
                        <span className="font-semibold text-[#6262bd]">£{order.total?.toFixed(2)}</span>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2">
                        {order.order_items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-700">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-slate-600">
                              £{((item.price_at_time || 0) * (item.quantity || 0)).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grand Total */}
                <div className="bg-[#6262bd]/10 rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Total Unpaid</span>
                    <span className="text-2xl font-bold text-[#6262bd]">
                      £{tableOrderDetails.reduce((orderSum, order) => {
                        const orderItemsTotal = (order.order_items || []).reduce((itemSum, item) => {
                          return itemSum + ((item.price_at_time || 0) * (item.quantity || 0))
                        }, 0)
                        return orderSum + (orderItemsTotal > 0 ? orderItemsTotal : (order.total || 0))
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View Reservations Modal */}
      {showReservationsModal && selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowReservationsModal(false)
            setSelectedTable(null)
            setSelectedTableReservations([])
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Table {selectedTable.table_number} - Today's Reservations
              </h2>
              <button
                onClick={() => {
                  setShowReservationsModal(false)
                  setSelectedTable(null)
                  setSelectedTableReservations([])
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {selectedTableReservations.length === 0 ? (
              <div className="bg-slate-50 rounded-xl p-8 text-center">
                <p className="text-slate-500">No confirmed reservations for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedTableReservations.map((reservation) => (
                  <div key={reservation.id} className="bg-white border-2 border-slate-200 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-800">{reservation.customer_name}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            reservation.status === 'completed'
                              ? 'bg-blue-100 text-blue-700'
                              : reservation.status === 'cancelled'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {reservation.status === 'completed' ? 'Completed' : reservation.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600">
                          <p><strong>Email:</strong> {reservation.customer_email}</p>
                          {reservation.customer_phone && (
                            <p><strong>Phone:</strong> {reservation.customer_phone}</p>
                          )}
                          <p><strong>Party Size:</strong> {reservation.party_size} guests</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-lg text-[#6262bd]">{reservation.reservation_time.substring(0, 5)}</p>
                      </div>
                    </div>

                    {reservation.special_requests && (
                      <div className="mt-3 mb-3 pt-3 border-t border-slate-200">
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Special Requests</p>
                        <p className="text-sm text-slate-700">{reservation.special_requests}</p>
                      </div>
                    )}

                    {/* Staff Actions Metadata */}
                    {(reservation.confirmed_by_staff_name || reservation.status === 'cancelled') && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1">
                        {reservation.confirmed_by_staff_name && reservation.status !== 'cancelled' && (
                          <div className="flex items-center gap-1.5 text-green-700">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            <span>Confirmed by <strong>{reservation.confirmed_by_staff_name}</strong></span>
                          </div>
                        )}
                        {reservation.status === 'cancelled' && reservation.cancellation_reason && (
                          <div className="flex items-center gap-1.5 text-red-600">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                            </svg>
                            <span>Cancelled: {reservation.cancellation_reason}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {reservation.status === 'confirmed' && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={async () => {
                            if (confirm(`Mark ${reservation.customer_name} as arrived?`)) {
                              try {
                                const { error } = await supabase
                                  .from('reservations')
                                  .update({
                                    status: 'completed',
                                    updated_at: new Date().toISOString()
                                  })
                                  .eq('id', reservation.id)

                                if (error) throw error

                                showNotification('success', 'Guest confirmed as arrived!')
                                fetchTodayReservations(restaurant.id)

                                // Refresh modal reservations
                                const updatedReservations = selectedTableReservations.map(r =>
                                  r.id === reservation.id ? { ...r, status: 'completed' } : r
                                )
                                setSelectedTableReservations(updatedReservations)
                              } catch (error) {
                                console.error('Error confirming guest:', error)
                                showNotification('error', 'Failed to confirm guest arrival')
                              }
                            }
                          }}
                          className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                          </svg>
                          Confirm Guest
                        </button>
                        <button
                          onClick={() => {
                            setReservationToCancel(reservation)
                            setCancelReasonType('no_show')
                            setCustomCancelReason('')
                            setShowCancelModal(true)
                          }}
                          className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-red-700 text-sm flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                          </svg>
                          Cancel Booking
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Reservation Modal */}
      {showCreateReservationModal && selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCreateReservationModal(false)
            setSelectedTable(null)
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">
              Create Reservation - Table {selectedTable.table_number}
            </h2>

            <form onSubmit={submitReservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={reservationForm.date}
                    onChange={(e) => setReservationForm({ ...reservationForm, date: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    required
                    value={reservationForm.time}
                    onChange={(e) => setReservationForm({ ...reservationForm, time: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Party Size
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="50"
                  value={reservationForm.partySize}
                  onChange={(e) => setReservationForm({ ...reservationForm, partySize: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={reservationForm.customerName}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={reservationForm.customerEmail}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerEmail: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={reservationForm.customerPhone}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerPhone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="+44 123 456 7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={reservationForm.specialRequests}
                  onChange={(e) => setReservationForm({ ...reservationForm, specialRequests: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
                  rows="3"
                  placeholder="Any dietary restrictions or special requests..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateReservationModal(false)
                    setSelectedTable(null)
                  }}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                >
                  Create Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && reservationToCancel && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
          onClick={() => {
            setShowCancelModal(false)
            setReservationToCancel(null)
            setCancelReasonType('no_show')
            setCustomCancelReason('')
          }}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Cancel Booking
              </h2>
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setReservationToCancel(null)
                  setCancelReasonType('no_show')
                  setCustomCancelReason('')
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-slate-700 mb-2">
                <strong>Customer:</strong> {reservationToCancel.customer_name}
              </p>
              <p className="text-slate-700 mb-4">
                <strong>Time:</strong> {reservationToCancel.reservation_time.substring(0, 5)} | <strong>Party:</strong> {reservationToCancel.party_size} guests
              </p>

              <label className="block text-sm font-medium text-slate-700 mb-3">
                Cancellation Reason
              </label>

              <div className="space-y-3">
                {/* No show option */}
                <label className="flex items-start p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-[#6262bd] transition-colors">
                  <input
                    type="radio"
                    name="cancelReason"
                    value="no_show"
                    checked={cancelReasonType === 'no_show'}
                    onChange={(e) => setCancelReasonType(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-slate-800">No show</div>
                    <div className="text-sm text-slate-500">Guest did not arrive</div>
                  </div>
                </label>

                {/* Customer request option */}
                <label className="flex items-start p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-[#6262bd] transition-colors">
                  <input
                    type="radio"
                    name="cancelReason"
                    value="customer_request"
                    checked={cancelReasonType === 'customer_request'}
                    onChange={(e) => setCancelReasonType(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-slate-800">Customer request</div>
                    <div className="text-sm text-slate-500">Customer requested cancellation</div>
                  </div>
                </label>

                {/* Other option */}
                <label className="flex items-start p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-[#6262bd] transition-colors">
                  <input
                    type="radio"
                    name="cancelReason"
                    value="other"
                    checked={cancelReasonType === 'other'}
                    onChange={(e) => setCancelReasonType(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 mb-2">Other</div>
                    {cancelReasonType === 'other' && (
                      <textarea
                        value={customCancelReason}
                        onChange={(e) => setCustomCancelReason(e.target.value)}
                        placeholder="Please provide a reason..."
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd] text-slate-700 text-sm"
                        rows="3"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setReservationToCancel(null)
                  setCancelReasonType('no_show')
                  setCustomCancelReason('')
                }}
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl font-medium text-slate-700 hover:bg-slate-50"
              >
                Keep Booking
              </button>
              <button
                onClick={async () => {
                  // Validate "other" option requires custom reason
                  if (cancelReasonType === 'other' && !customCancelReason.trim()) {
                    showNotification('error', 'Please provide a reason')
                    return
                  }

                  try {
                    // Get current user info
                    const staffSessionData = localStorage.getItem('staff_session')
                    let staffName = 'Staff'
                    if (staffSessionData) {
                      const staffSession = JSON.parse(staffSessionData)
                      staffName = staffSession.name || staffSession.email
                    }

                    // Determine the reason text
                    let reasonText = ''
                    if (cancelReasonType === 'no_show') {
                      reasonText = 'No show'
                    } else if (cancelReasonType === 'customer_request') {
                      reasonText = 'Customer request'
                    } else if (cancelReasonType === 'other') {
                      reasonText = customCancelReason.trim()
                    }

                    const { error } = await supabase
                      .from('reservations')
                      .update({
                        status: 'cancelled',
                        cancelled_at: new Date().toISOString(),
                        cancellation_reason: `Cancelled by ${staffName}: ${reasonText}`,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', reservationToCancel.id)

                    if (error) throw error

                    // Send cancellation email to customer
                    try {
                      await fetch('/api/reservations/send-cancellation-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reservationId: reservationToCancel.id })
                      })
                      console.log('Cancellation email sent to customer')
                    } catch (emailError) {
                      console.error('Failed to send cancellation email:', emailError)
                      // Don't fail the cancellation if email fails
                    }

                    showNotification('success', 'Booking cancelled successfully')
                    fetchTodayReservations(restaurant.id)

                    // Refresh modal reservations
                    const updatedReservations = selectedTableReservations.map(r =>
                      r.id === reservationToCancel.id
                        ? { ...r, status: 'cancelled', cancellation_reason: `Cancelled by ${staffName}: ${reasonText}` }
                        : r
                    )
                    setSelectedTableReservations(updatedReservations)

                    // Close modal
                    setShowCancelModal(false)
                    setReservationToCancel(null)
                    setCancelReasonType('no_show')
                    setCustomCancelReason('')
                  } catch (error) {
                    console.error('Error cancelling booking:', error)
                    showNotification('error', 'Failed to cancel booking')
                  }
                }}
                className="flex-1 bg-red-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-red-700"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Payment Modal */}
      {showPostPaymentModal && restaurant?.invoice_settings?.enabled && staffDepartment !== 'kitchen' && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowPostPaymentModal(false)
            setSelectedTable(null)
            setUnpaidOrders([])
            setCompletedOrderIds([])
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
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Payment Successful!</h2>
              <p className="text-slate-600">Would you like to generate an invoice for this order?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // Use the first completed order ID
                  const orderId = completedOrderIds[0]
                  openInvoiceModal(orderId)
                }}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                Generate Invoice
              </button>
              <button
                onClick={() => {
                  setShowPostPaymentModal(false)
                  setSelectedTable(null)
                  setUnpaidOrders([])
                  setCompletedOrderIds([])
                }}
                className="w-full border-2 border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Close
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
            setInvoiceTableId(null)
            setInvoiceOrderId(null)
          }}
          isGenerating={generatingInvoice}
        />
      )}
    </div>
  )
}

function TableCard({ table, orderInfo, reservations, waiterCalls, userType, onDownload, onDelete, onPlaceOrder, onPayBill, onSplitBill, onViewOrders, onMarkCleaned, onMarkDelivered, onViewReservations, onCreateReservation, onAcknowledgeWaiterCall }) {
  const t = useTranslations('tables')

  // Show badge if there are any unpaid orders (count > 0)
  // This handles both cases: orders with totals and orders where total might be 0 but items exist
  const hasOpenOrders = orderInfo && orderInfo.count > 0
  const needsCleaning = table.status === 'needs_cleaning'

  // Debug logging
  if (orderInfo) {
    console.log(`Table ${table.table_number} orderInfo:`, orderInfo, 'hasOpenOrders:', hasOpenOrders, 'total:', orderInfo.total, 'count:', orderInfo.count)
  }
  const hasReservationsToday = reservations && reservations.length > 0
  const hasWaiterCall = waiterCalls && waiterCalls.length > 0
  const readyDepartments = orderInfo?.readyDepartments || []

  // Department colors
  const getDepartmentColor = (dept) => {
    const colors = {
      kitchen: 'bg-green-500 hover:bg-green-600',
      bar: 'bg-blue-500 hover:bg-blue-600',
      food: 'bg-green-500 hover:bg-green-600',
      drinks: 'bg-blue-500 hover:bg-blue-600',
      other: 'bg-purple-500 hover:bg-purple-600'
    }
    return colors[dept] || colors.other
  }

  const getDepartmentLabel = (dept) => {
    const labels = {
      kitchen: 'KITCHEN',
      bar: 'BAR',
      food: 'FOOD',
      drinks: 'DRINKS',
      other: 'OTHER'
    }
    return labels[dept] || dept.toUpperCase()
  }

  return (
    <div className={`bg-white border-2 rounded-2xl p-6 text-center hover:border-[#6262bd]/30 transition-colors relative ${
      needsCleaning ? 'border-red-300 bg-red-50/30' :
      hasOpenOrders ? 'border-amber-300 bg-amber-50/30' : 'border-slate-100'
    }`}>
      {/* Waiter Call Indicator Badge (top center) */}
      {hasWaiterCall && (
        <button
          onClick={() => onAcknowledgeWaiterCall(waiterCalls[0].id)}
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg hover:bg-orange-600 transition-all cursor-pointer flex items-center gap-1 animate-pulse"
          title="Customer requesting waiter - click to acknowledge"
        >
          <span className="text-base">👋</span>
          <span>WAITER NEEDED</span>
        </button>
      )}

      {/* Department-Specific Order Ready Badges (bottom center) */}
      {readyDepartments.length > 0 && !needsCleaning && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {readyDepartments.map((dept, idx) => (
            <button
              key={dept}
              onClick={() => onMarkDelivered(dept)}
              className={`${getDepartmentColor(dept)} text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5 animate-pulse`}
              title={`${getDepartmentLabel(dept)} items ready - click to mark as delivered`}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>{getDepartmentLabel(dept)} READY!</span>
            </button>
          ))}
        </div>
      )}

      {/* Reservation Indicator Badge (top left) */}
      {hasReservationsToday && (
        <button
          onClick={onViewReservations}
          className="absolute -top-3 -left-3 bg-[#6262bd] text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg hover:bg-[#5252a3] transition-colors cursor-pointer flex items-center gap-1"
          title="Click to view today's reservations"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
          </svg>
          {reservations.length}
        </button>
      )}

      {/* Status Badges (top right) */}
      {needsCleaning && (
        <button
          onClick={onViewOrders}
          className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg uppercase tracking-wide hover:bg-red-600 transition-colors cursor-pointer"
          title={t('needsCleaningTooltip')}
        >
          {t('needsCleaning')}
        </button>
      )}
      {hasOpenOrders && !needsCleaning && (
        <button
          onClick={onViewOrders}
          className="absolute -top-3 -right-3 bg-amber-500 text-white rounded-full px-3 py-1.5 text-xs font-bold shadow-lg uppercase tracking-wide hover:bg-amber-600 transition-colors cursor-pointer"
          title="Click to view order details"
        >
          OPEN
        </button>
      )}

      {/* Table Icon */}
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
        needsCleaning ? 'bg-red-100' :
        hasOpenOrders ? 'bg-amber-100' : 'bg-[#6262bd]/10'
      }`}>
        <svg className={`w-10 h-10 ${
          needsCleaning ? 'text-red-600' :
          hasOpenOrders ? 'text-amber-600' : 'text-[#6262bd]'
        }`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
          <circle cx="12" cy="12" r="1.5"/>
        </svg>
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-2">Table {table.table_number}</h3>

      {/* Order Total */}
      {hasOpenOrders && (
        <div className="mb-4">
          <p className="text-sm text-amber-700 font-semibold">
            Unpaid: £{orderInfo.total.toFixed(2)}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {needsCleaning ? (
          <button
            onClick={onMarkCleaned}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            {t('markAsCleaned')}
          </button>
        ) : (
          <>
            <button
              onClick={onPlaceOrder}
              className="w-full bg-[#6262bd] text-white py-2.5 rounded-xl font-medium hover:bg-[#5252a3] text-sm"
            >
              {hasOpenOrders ? t('updateOrder') : t('placeOrder')}
            </button>
            <button
              onClick={onPayBill}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl font-medium hover:bg-green-700 text-sm"
            >
              {t('payBill')}
            </button>
            <button
              onClick={onSplitBill}
              className="w-full bg-orange-600 text-white py-2.5 rounded-xl font-medium hover:bg-orange-700 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
              </svg>
              {t('splitBill')}
            </button>
            <button
              onClick={onCreateReservation}
              className="w-full border-2 border-[#6262bd] text-[#6262bd] py-2.5 rounded-xl font-medium hover:bg-[#6262bd]/5 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM12 13h5v5h-5z"/>
              </svg>
              {t('newReservation')}
            </button>
          </>
        )}
        {userType === 'owner' && (
          <>
            <button
              onClick={onDownload}
              className="w-full border-2 border-slate-200 text-slate-600 py-2.5 rounded-xl font-medium hover:bg-slate-50 text-sm"
            >
              {t('downloadQR')}
            </button>
            <button
              onClick={onDelete}
              className="w-full p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-sm font-medium"
            >
              {t('deleteTable')}
            </button>
          </>
        )}
      </div>
      </div>

  )
}
