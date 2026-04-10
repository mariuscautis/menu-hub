'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, clearOrdersCacheForTable, clearTableOrdersLocalCache, clearAllOrdersCache, wasTablePaidOffline, clearTablePaidOfflineStatus, markTableCleanedOffline } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import QRCode from 'qrcode'
import InvoiceClientModal from '@/components/invoices/InvoiceClientModal'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'
import { useTheme } from '@/lib/ThemeContext'
import { useCurrency } from '@/lib/CurrencyContext'
import { useVenoBridge } from '@/hooks/useVenoBridge'
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
import { onSyncEvent, isSyncInProgress } from '@/lib/syncManager'

const TOAST_STYLES = {
  success: {
    wrap: 'bg-green-50 dark:bg-green-900 border-2 border-green-200 dark:border-green-700',
    icon: 'text-green-600 dark:text-green-300',
    text: 'text-green-900 dark:text-green-100',
    btn:  'text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-100',
  },
  error: {
    wrap: 'bg-red-50 dark:bg-red-900 border-2 border-red-200 dark:border-red-700',
    icon: 'text-red-600 dark:text-red-300',
    text: 'text-red-900 dark:text-red-100',
    btn:  'text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100',
  },
  info: {
    wrap: 'bg-blue-50 dark:bg-blue-900 border-2 border-blue-200 dark:border-blue-700',
    icon: 'text-blue-600 dark:text-blue-300',
    text: 'text-blue-900 dark:text-blue-100',
    btn:  'text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100',
  },
}

export default function Tables() {
  const t = useTranslations('tables')
  const tg = useTranslations('guide')
  const { isDark } = useTheme()
  const { currencySymbol, formatCurrency } = useCurrency()
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
  const [itemNotes, setItemNotes] = useState({}) // Track special instructions per item { menuItemId: 'note' }
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

  // Floor filter state
  const [floors, setFloors] = useState([])
  const [activeFloorId, setActiveFloorId] = useState(null) // null = all floors

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

  // Transfer table modal state
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferSourceTable, setTransferSourceTable] = useState(null)
  const [transferring, setTransferring] = useState(false)

  // Grid density preference (persisted)
  const [gridDensity, setGridDensity] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tables_grid_density') || 'default'
    }
    return 'default'
  })
  const updateGridDensity = (density) => {
    setGridDensity(density)
    localStorage.setItem('tables_grid_density', density)
  }
  const gridClass = {
    compact: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
    default: 'grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
    large:   'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6',
  }[gridDensity]

  // Split bill state
  const [showSplitBillModal, setShowSplitBillModal] = useState(false)
  const [splitBills, setSplitBills] = useState([])
  const [availableItems, setAvailableItems] = useState([])
  const [splitBillTableId, setSplitBillTableId] = useState(null)

  // Discount state for payment
  const [availableDiscounts, setAvailableDiscounts] = useState([])
  const [selectedDiscount, setSelectedDiscount] = useState(null)
  const [discountAmount, setDiscountAmount] = useState(0)

  // Terminal payment state
  const [terminalReaders, setTerminalReaders] = useState([])
  const [selectedReader, setSelectedReader] = useState(null)
  const [terminalPaymentIntentId, setTerminalPaymentIntentId] = useState(null)
  const [terminalStatus, setTerminalStatus] = useState(null)
  // null | 'loading_readers' | 'selecting_reader' | 'waiting' | 'succeeded' | 'failed' | 'timed_out'
  const [terminalDeclineReason, setTerminalDeclineReason] = useState(null)
  const terminalTimerRef = useRef(null)
  const terminalPollRef = useRef(null)
  const [showExternalTerminal, setShowExternalTerminal] = useState(false)
  const [externalTerminalRef, setExternalTerminalRef] = useState('')
  const [showExternalTerminalRef, setShowExternalTerminalRef] = useState(false)

  // Order modal UX state - category navigation and search
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [productSearch, setProductSearch] = useState('')
  const [orderModalLoading, setOrderModalLoading] = useState(false)

  // Show notification helper
  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000) // Auto-dismiss after 4 seconds
  }

  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()
  const { sendPrintJob } = useVenoBridge(restaurantCtx?.restaurant)

  useEffect(() => {
    if (restaurantCtx?.restaurant?.id) fetchData()
  }, [restaurantCtx?.restaurant?.id])

  // When the browser goes offline, immediately rebuild table indicators from
  // cache so they don't disappear while waiting for Supabase to time out
  useEffect(() => {
    if (!restaurant?.id) return
    const handleOffline = () => {
      fetchTableOrderInfo(restaurant.id)
    }
    window.addEventListener('offline', handleOffline)
    return () => window.removeEventListener('offline', handleOffline)
  }, [restaurant?.id])

  // After sync completes (payments pushed to Supabase), refresh table indicators
  // so paid orders don't reappear as unpaid when Realtime fires
  useEffect(() => {
    if (!restaurant?.id) return
    const unsubscribe = onSyncEvent('sync-complete', () => {
      if (navigator.onLine) {
        fetchTableOrderInfo(restaurant.id)
      }
    })
    return unsubscribe
  }, [restaurant?.id])

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
          if (!navigator.onLine || isSyncInProgress()) {
            console.log('Tables page - Skipping refetch (offline or syncing)')
            return
          }
          setTimeout(() => {
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
          if (!navigator.onLine || isSyncInProgress()) {
            console.log('Tables page - Skipping refetch (offline or syncing)')
            return
          }
          setTimeout(() => {
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

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(orderItemsChannel)
      supabase.removeChannel(tablesChannel)
      supabase.removeChannel(reservationsChannel)
      supabase.removeChannel(waiterCallsChannel)
      supabase.removeChannel(splitBillsChannel)
    }
  }, [restaurant?.id])

  const fetchData = async () => {
    if (!restaurantCtx?.restaurant) return

    const restaurantData = restaurantCtx.restaurant
    setRestaurant(restaurantData)
    setUserType(restaurantCtx.userType)
    setStaffDepartment(restaurantCtx.staffDepartment)

    const rid = restaurantData.id
    const cacheKeyTables = `tables_cache_${rid}`
    const cacheKeyFloors = `floors_cache_${rid}`
    const cacheKeyMenu   = `menu_items_cache_${rid}`
    const cacheKeyCats   = `categories_cache_${rid}`

    // ── OFFLINE: load everything from localStorage cache ──────────────────────
    if (!navigator.onLine) {
      try {
        const cachedTables = JSON.parse(localStorage.getItem(cacheKeyTables) || '[]')
        const cachedFloors = JSON.parse(localStorage.getItem(cacheKeyFloors) || '[]')
        const cachedMenu   = JSON.parse(localStorage.getItem(cacheKeyMenu)   || '[]')
        const cachedCats   = JSON.parse(localStorage.getItem(cacheKeyCats)   || '[]')
        setTables(cachedTables)
        setFloors(cachedFloors)
        setMenuItems(cachedMenu)
        setCategories(cachedCats)
      } catch (e) {
        console.warn('Failed to load cached table data:', e)
      }
      // fetchTableOrderInfo skips Supabase when offline and reads IDB directly
      await fetchTableOrderInfo(rid)
      setLoading(false)
      return
    }

    // ── ONLINE: fetch from Supabase, then cache results ───────────────────────
    const [
      { data: tablesData },
      { data: floorsData },
      { data: items, error: itemsError },
      { data: cats, error: catsError },
    ] = await Promise.all([
      supabase.from('tables').select('*').eq('restaurant_id', rid).order('table_number'),
      supabase.from('floors').select('id, name, level').eq('restaurant_id', rid).order('level', { ascending: true }),
      supabase.rpc('get_available_menu_items', { p_restaurant_id: rid }),
      supabase.from('menu_categories').select('*').eq('restaurant_id', rid).order('sort_order'),
    ])

    setTables(tablesData || [])
    setFloors(floorsData || [])
    try { localStorage.setItem(cacheKeyTables, JSON.stringify(tablesData || [])) } catch {}
    try { localStorage.setItem(cacheKeyFloors, JSON.stringify(floorsData || [])) } catch {}

    let finalMenuItems = []
    if (itemsError) {
      console.error('Menu items error:', itemsError)
      // Fallback to regular query if RPC fails
      const { data: fallbackItems } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', rid)
        .eq('available', true)
        .order('sort_order')
      finalMenuItems = fallbackItems || []
      setMenuItems(finalMenuItems)
    } else {
      console.log('Menu items loaded (in stock only):', items)
      // RPC might not return special_instructions fields, fetch them separately and merge
      const { data: menuItemsWithInstructions } = await supabase
        .from('menu_items')
        .select('id, requires_special_instructions, special_instructions_label')
        .eq('restaurant_id', rid)

      // Merge special instructions data into the items from RPC
      finalMenuItems = (items || []).map(item => {
        const extra = menuItemsWithInstructions?.find(mi => mi.id === item.id)
        return {
          ...item,
          requires_special_instructions: extra?.requires_special_instructions || false,
          special_instructions_label: extra?.special_instructions_label || null
        }
      })
      setMenuItems(finalMenuItems)
    }
    try { localStorage.setItem(cacheKeyMenu, JSON.stringify(finalMenuItems)) } catch {}

    if (catsError) console.error('Categories error:', catsError)
    console.log('Categories loaded:', cats)
    setCategories(cats || [])
    try { localStorage.setItem(cacheKeyCats, JSON.stringify(cats || [])) } catch {}

    // Fetch order info, reservations, and waiter calls in parallel
    await Promise.all([
      fetchTableOrderInfo(rid),
      fetchTodayReservations(rid),
      fetchWaiterCalls(rid),
    ])

    setLoading(false)
  }

  const fetchTableOrderInfo = async (restaurantId) => {
    // ── OFFLINE: skip Supabase entirely, build from cache + IDB ─────────────
    if (!navigator.onLine) {
      const orderInfo = {}

      // Step 1: reconstruct from per-table localStorage caches (orders placed while online)
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (!key || !key.startsWith('table_orders_')) continue
          const tableId = key.replace('table_orders_', '')
          const cached = JSON.parse(localStorage.getItem(key) || '[]')
          const unpaid = cached.filter(o => !o.paid && o.status !== 'cancelled')
          if (unpaid.length === 0) continue
          let total = 0
          const readyDepartments = []
          unpaid.forEach(order => {
            order.order_items?.forEach(item => {
              total += (item.quantity || 0) * (item.price_at_time || 0)
              if (item.marked_ready_at && !item.delivered_at) {
                const dept = item.menu_items?.department || 'kitchen'
                if (!readyDepartments.includes(dept)) readyDepartments.push(dept)
              }
            })
          })
          orderInfo[tableId] = { count: unpaid.length, total, readyDepartments }
        }
      } catch (err) {
        console.warn('Failed to read table order caches:', err)
      }

      // Step 2: layer IDB pending orders and updates on top
      try {
        const [offlineOrdersByTable, offlineUpdatesByTable] = await Promise.all([
          getAllPendingOrdersByTable(),
          getAllPendingOrderUpdatesByTable(),
        ])
        Object.entries(offlineOrdersByTable).forEach(([tableId, offlineData]) => {
          if (orderInfo[tableId]) {
            orderInfo[tableId].count += offlineData.count
            orderInfo[tableId].total += offlineData.total
          } else {
            orderInfo[tableId] = { count: offlineData.count, total: offlineData.total, readyDepartments: [] }
          }
        })
        Object.entries(offlineUpdatesByTable).forEach(([tableId, updateData]) => {
          if (orderInfo[tableId]) {
            orderInfo[tableId].total += updateData.total
          } else {
            orderInfo[tableId] = { count: 0, total: updateData.total, readyDepartments: [] }
          }
        })
      } catch (err) {
        console.warn('Failed to load offline order info from IDB:', err)
      }

      setTableOrderInfo(orderInfo)
      return
    }

    // ── ONLINE: fetch from Supabase ───────────────────────────────────────────
    // 4-second timeout so a dropped connection falls through to cache quickly
    const abortController = new AbortController()
    const abortTimer = setTimeout(() => abortController.abort(), 4000)
    let orders = null
    let ordersError = null
    try {
      const result = await supabase
        .from('orders')
        .select(`
          id,
          table_id,
          total,
          status,
          paid,
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
        .abortSignal(abortController.signal)
      orders = result.data
      ordersError = result.error
    } catch (fetchErr) {
      ordersError = fetchErr
    } finally {
      clearTimeout(abortTimer)
    }

    // If Supabase failed (network dropped after the online check), fall back to
    // the cache-based offline path rather than wiping tableOrderInfo with {}
    if (ordersError || orders === null) {
      console.warn('fetchTableOrderInfo: Supabase error, rebuilding from cache', ordersError?.message)
      const orderInfo = {}
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (!key || !key.startsWith('table_orders_')) continue
          const tableId = key.replace('table_orders_', '')
          const cached = JSON.parse(localStorage.getItem(key) || '[]')
          const unpaid = cached.filter(o => !o.paid && o.status !== 'cancelled')
          if (unpaid.length === 0) continue
          let total = 0
          const readyDepartments = []
          unpaid.forEach(order => {
            order.order_items?.forEach(item => {
              total += (item.quantity || 0) * (item.price_at_time || 0)
              if (item.marked_ready_at && !item.delivered_at) {
                const dept = item.menu_items?.department || 'kitchen'
                if (!readyDepartments.includes(dept)) readyDepartments.push(dept)
              }
            })
          })
          orderInfo[tableId] = { count: unpaid.length, total, readyDepartments }
        }
      } catch {}
      try {
        const [offlineOrdersByTable, offlineUpdatesByTable] = await Promise.all([
          getAllPendingOrdersByTable(),
          getAllPendingOrderUpdatesByTable(),
        ])
        Object.entries(offlineOrdersByTable).forEach(([tableId, offlineData]) => {
          if (orderInfo[tableId]) {
            orderInfo[tableId].count += offlineData.count
            orderInfo[tableId].total += offlineData.total
          } else {
            orderInfo[tableId] = { count: offlineData.count, total: offlineData.total, readyDepartments: [] }
          }
        })
        Object.entries(offlineUpdatesByTable).forEach(([tableId, updateData]) => {
          if (orderInfo[tableId]) {
            orderInfo[tableId].total += updateData.total
          } else {
            orderInfo[tableId] = { count: 0, total: updateData.total, readyDepartments: [] }
          }
        })
      } catch {}
      setTableOrderInfo(orderInfo)
      return
    }

    // Build a set of all order_item ids from the current unpaid orders
    const unpaidOrderItemIds = new Set()
    orders?.forEach(order => {
      order.order_items?.forEach(item => {
        if (item.id) unpaidOrderItemIds.add(item.id)
      })
    })

    // Get completed split bills whose items belong to the current unpaid orders only.
    // Fetching split_bill_items lets us match by order_item_id so old paid sessions
    // on the same table don't bleed into a new open order.
    let splitBillTotalsByTable = {}
    if (unpaidOrderItemIds.size > 0) {
      const { data: splitBills } = await supabase
        .from('split_bills')
        .select('table_id, split_bill_items(order_item_id, quantity, price)')
        .eq('restaurant_id', restaurantId)
        .eq('payment_status', 'completed')

      splitBills?.forEach(bill => {
        bill.split_bill_items?.forEach(sbi => {
          if (unpaidOrderItemIds.has(sbi.order_item_id)) {
            if (!splitBillTotalsByTable[bill.table_id]) {
              splitBillTotalsByTable[bill.table_id] = 0
            }
            splitBillTotalsByTable[bill.table_id] += (parseFloat(sbi.price) || 0) * (sbi.quantity || 1)
          }
        })
      })
    }

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

    // Subtract split bill amounts from totals (only for items in current open orders)
    Object.keys(splitBillTotalsByTable).forEach(tableId => {
      if (orderInfo[tableId]) {
        orderInfo[tableId].total -= splitBillTotalsByTable[tableId]
        // Ensure total doesn't go negative (should be 0 if fully paid via split bills)
        if (orderInfo[tableId].total < 0) {
          orderInfo[tableId].total = 0
        }
      }
    })

    setTableOrderInfo(orderInfo)

    // Cache orders grouped by table so the offline path can reconstruct indicators.
    // Also clears stale keys for tables that no longer have active orders — without
    // this, paid orders remain in localStorage and appear as ghosts when offline.
    try {
      const byTable = {}
      if (orders && orders.length > 0) {
        orders.forEach(order => {
          if (!byTable[order.table_id]) byTable[order.table_id] = []
          byTable[order.table_id].push(order)
        })
        Object.entries(byTable).forEach(([tableId, tableOrders]) => {
          localStorage.setItem(`table_orders_${tableId}`, JSON.stringify(tableOrders))
        })
      }
      // Remove any table_orders_* keys that are no longer in the fresh fetch
      const activeTableIds = new Set(Object.keys(byTable))
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith('table_orders_')) {
          const tableId = key.replace('table_orders_', '')
          if (!activeTableIds.has(tableId)) {
            localStorage.removeItem(key)
          }
        }
      }
    } catch {}
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
    // Clear state from any previous modal open
    setOrderItems([])
    setItemNotes({})
    setCurrentOrder(null)
    setSelectedTable(table)

    if (!navigator.onLine) {
      // OFFLINE MODE: load from cache/IDB synchronously then open
      const cacheKey = `table_orders_${table.id}`
      let pendingPayments = []
      let pendingOfflineOrders = []
      try {
        ;[pendingPayments, pendingOfflineOrders] = await Promise.all([
          getPendingPaymentsForTable(table.id).catch(() => []),
          getPendingOrdersForTable(table.id).catch(() => []),
        ])
      } catch (err) {
        console.warn('Error checking IDB:', err)
      }

      if (pendingPayments.length > 0) {
        setShowOrderModal(true)
        return
      }

      let existingOrder = null
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const cachedOrders = JSON.parse(cached)
          const unpaidCached = cachedOrders.filter(o =>
            o.table_id === table.id && !o.paid && ['pending', 'preparing', 'ready'].includes(o.status)
          )
          if (unpaidCached.length > 0) existingOrder = unpaidCached[unpaidCached.length - 1]
        }
      } catch (e) {
        console.error('Failed to load cached orders:', e)
      }

      if (!existingOrder && pendingOfflineOrders.length > 0) {
        const latestOfflineOrder = pendingOfflineOrders[pendingOfflineOrders.length - 1]
        setCurrentOrder({
          client_id: latestOfflineOrder.client_id,
          table_id: latestOfflineOrder.table_id,
          order_items: latestOfflineOrder.order_items || [],
          isOfflineOrder: true
        })
        const itemsMap = {}
        latestOfflineOrder.order_items?.forEach(item => {
          itemsMap[item.menu_item_id] = {
            menu_item_id: item.menu_item_id,
            name: item.name,
            price_at_time: item.price_at_time,
            quantity: item.quantity,
            isExisting: true,
            existingQuantity: item.quantity
          }
        })
        setOrderItems(Object.values(itemsMap))
        setShowOrderModal(true)
        return
      }

      if (!existingOrder) {
        setShowOrderModal(true)
        return
      }

      // Build items from cached order
      const itemsMap = {}
      existingOrder.order_items?.forEach(item => {
        if (itemsMap[item.menu_item_id]) {
          itemsMap[item.menu_item_id].quantity += item.quantity
          itemsMap[item.menu_item_id].existingQuantity += item.quantity
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

      // Merge pending order updates
      try {
        const pendingUpdates = await getPendingOrderUpdatesForTable(table.id)
        const orderUpdates = pendingUpdates.filter(u => u.order_id === existingOrder.id)
        for (const update of orderUpdates) {
          for (const item of update.items || []) {
            if (itemsMap[item.menu_item_id]) {
              itemsMap[item.menu_item_id].quantity += item.quantity
              itemsMap[item.menu_item_id].existingQuantity += item.quantity
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
          }
        }
      } catch (err) {
        console.warn('Failed to get pending order updates:', err)
      }

      // Merge pending offline orders
      for (const offlineOrder of pendingOfflineOrders) {
        for (const item of offlineOrder.order_items || []) {
          if (itemsMap[item.menu_item_id]) {
            itemsMap[item.menu_item_id].quantity += item.quantity
            itemsMap[item.menu_item_id].existingQuantity += item.quantity
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
        }
      }

      const normalizedItems = Object.values(itemsMap)
      const mergedOrderItems = normalizedItems.map(item => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        price_at_time: item.price_at_time,
        quantity: item.quantity,
      }))
      setCurrentOrder({ ...existingOrder, order_items: mergedOrderItems })
      setOrderItems(normalizedItems)
      setShowOrderModal(true)
      return
    }

    // ONLINE MODE: Open modal immediately, fetch existing order in background
    // Use a 4s timeout so a dropped connection falls back to cache quickly
    clearAllOrdersCache()
    clearTableOrdersLocalCache(table.id)
    setOrderModalLoading(true)
    setShowOrderModal(true)

    const loadFromCacheAndIDB = async () => {
      const itemsMap = {}
      // Pull items from per-table localStorage cache
      try {
        const cached = localStorage.getItem(`table_orders_${table.id}`)
        if (cached) {
          const cachedOrders = JSON.parse(cached)
          const unpaid = cachedOrders.filter(o =>
            o.table_id === table.id && !o.paid && ['pending', 'preparing', 'ready'].includes(o.status)
          )
          const latest = unpaid[unpaid.length - 1]
          if (latest) {
            latest.order_items?.forEach(item => {
              itemsMap[item.menu_item_id] = {
                menu_item_id: item.menu_item_id,
                name: item.name,
                price_at_time: item.price_at_time,
                quantity: item.quantity,
                isExisting: true,
                existingQuantity: item.quantity,
              }
            })
            const normalizedItems = Object.values(itemsMap)
            setCurrentOrder({ ...latest, order_items: normalizedItems.map(i => ({ menu_item_id: i.menu_item_id, name: i.name, price_at_time: i.price_at_time, quantity: i.quantity })) })
            setOrderItems(normalizedItems)
            return
          }
        }
      } catch {}
      // Fall back to IDB pending orders
      try {
        const pendingOfflineOrders = await getPendingOrdersForTable(table.id).catch(() => [])
        if (pendingOfflineOrders.length > 0) {
          const latest = pendingOfflineOrders[pendingOfflineOrders.length - 1]
          latest.order_items?.forEach(item => {
            itemsMap[item.menu_item_id] = {
              menu_item_id: item.menu_item_id,
              name: item.name,
              price_at_time: item.price_at_time,
              quantity: item.quantity,
              isExisting: true,
              existingQuantity: item.quantity,
            }
          })
          setCurrentOrder({ client_id: latest.client_id, table_id: latest.table_id, order_items: Object.values(itemsMap), isOfflineOrder: true })
          setOrderItems(Object.values(itemsMap))
        }
      } catch {}
    }

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)

      const { data: existingOrders, error: fetchError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_id', table.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .is('paid', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)

      clearTimeout(timeout)

      let existingOrder = null
      if (!fetchError) {
        existingOrder = existingOrders && existingOrders.length > 0 ? existingOrders[0] : null
        if (existingOrder && existingOrder.table_id !== table.id) existingOrder = null
      }

      if (existingOrder) {
        const itemsMap = {}
        existingOrder.order_items?.forEach(item => {
          if (itemsMap[item.menu_item_id]) {
            itemsMap[item.menu_item_id].quantity += item.quantity
            itemsMap[item.menu_item_id].existingQuantity += item.quantity
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
        const normalizedItems = Object.values(itemsMap)
        const mergedOrderItems = normalizedItems.map(item => ({
          menu_item_id: item.menu_item_id,
          name: item.name,
          price_at_time: item.price_at_time,
          quantity: item.quantity,
        }))
        setCurrentOrder({ ...existingOrder, order_items: mergedOrderItems })
        setOrderItems(normalizedItems)
      }
    } catch (err) {
      console.warn('Could not fetch existing order (falling back to cache):', err)
      await loadFromCacheAndIDB()
    } finally {
      setOrderModalLoading(false)
    }
  }

  const openPaymentModal = async (table) => {
    setSelectedTable(table)

    const cacheKey = `table_orders_${table.id}`

    try {
      let existingSplitBills = []

      // Step 1: Load from localStorage cache immediately (instant, no network wait)
      let orders = []
      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          orders = JSON.parse(cached).filter(o => o.table_id === table.id)
        }
      } catch {}

      // Step 2: Always load IDB pending orders (needed both online and offline —
      // e.g. orders placed offline whose payment was just queued)
      let offlineOrders = []
      let pendingUpdates = []
      try {
        ;[offlineOrders, pendingUpdates] = await Promise.all([
          getPendingOrdersForTable(table.id).catch(() => []),
          getPendingOrderUpdatesForTable(table.id).catch(() => []),
        ])
      } catch (err) {
        console.warn('Failed to load offline orders for payment modal:', err)
      }

      // Step 3: If online, refresh cache from Supabase in the background (non-blocking)
      // The modal opens immediately from cache; the fresh data updates it if available
      if (navigator.onLine) {
        ;(async () => {
          try {
            const freshAbort = new AbortController()
            const freshTimer = setTimeout(() => freshAbort.abort(), 5000)
            const [ordersResult, splitBillsResult] = await Promise.all([
              supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('table_id', table.id)
                .is('paid', false)
                .neq('status', 'cancelled')
                .order('created_at', { ascending: true })
                .abortSignal(freshAbort.signal),
              supabase
                .from('split_bills')
                .select('*, split_bill_items(*)')
                .eq('table_id', table.id)
                .eq('payment_status', 'completed')
                .abortSignal(freshAbort.signal),
            ])
            clearTimeout(freshTimer)
            if (!ordersResult.error && ordersResult.data) {
              const fresh = ordersResult.data.filter(o => o.table_id === table.id)
              try { localStorage.setItem(cacheKey, JSON.stringify(fresh)) } catch {}
              // Only update unpaidOrders state if the payment modal is still open
              setUnpaidOrders(prev => prev.length > 0 ? fresh : prev)
            }
            if (!splitBillsResult.error) {
              existingSplitBills = splitBillsResult.data || []
            }
          } catch {
            // Network gone — cache is sufficient, ignore
          }
        })()
      }

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
        showNotification('info', t('notifications.noUnpaidOrders'))
        return
      }

      setUnpaidOrders(filteredOrders || [])

      setSelectedDiscount(null)
      setDiscountAmount(0)
      setAvailableDiscounts([])

      // Open the modal immediately — don't wait for the discounts network fetch
      setShowPaymentModal(true)

      // Fetch discounts in the background (non-blocking — modal is already open)
      if (restaurant && navigator.onLine) {
        ;(async () => {
          try {
            const { data: discountsData, error: discountsError } = await supabase
              .from('discounts')
              .select('*')
              .eq('restaurant_id', restaurant.id)
              .eq('active', true)
              .order('name')

            if (discountsError || !discountsData) return

            setAvailableDiscounts(discountsData)

            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayDay = today.getDay()

            const activePromo = discountsData.find(d => {
              if (!d.is_promotion) return false
              if (d.promo_start_date && new Date(d.promo_start_date) > today) return false
              if (d.promo_end_date && new Date(d.promo_end_date) < today) return false
              if (d.promo_days && d.promo_days.length > 0 && !d.promo_days.includes(todayDay)) return false
              if (!d.product_id) return false
              return filteredOrders.some(order =>
                order.order_items?.some(item => item.menu_item_id === d.product_id)
              )
            })

            if (activePromo) {
              const promoBase = filteredOrders.reduce((sum, o) =>
                sum + (o.order_items || [])
                  .filter(i => i.menu_item_id === activePromo.product_id)
                  .reduce((s, i) => s + ((i.price_at_time || i.price || 0) * (i.quantity || 1)), 0)
              , 0)
              const amount = activePromo.type === 'percentage'
                ? Math.round((promoBase * activePromo.value / 100) * 100) / 100
                : Math.min(activePromo.value, promoBase)
              setSelectedDiscount(activePromo)
              setDiscountAmount(amount)
            }
          } catch {
            // Discounts unavailable offline — not a problem, modal is already open
          }
        })()
      }
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
        showNotification('error', t('notifications.splitBillOffline'))
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
      let pendingUpdates = []
      if (!navigator.onLine) {
        try {
          pendingUpdates = await getPendingOrderUpdatesForTable(table.id).catch(() => [])
        } catch (err) {
          console.warn('Failed to load pending updates for order details:', err)
        }
      }

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
        showNotification('info', t('notifications.orderDataOffline'))
        return
      }

      setTableOrderDetails(allOrders)
      setShowOrderDetailsModal(true)
    } catch (err) {
      console.error('Error opening order details modal:', err)
      if (!navigator.onLine) {
        showNotification('error', t('notifications.orderDetailsOffline'))
      } else {
        showNotification('error', t('notifications.loadOrderDetailsFailed'))
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
      showNotification('success', t('notifications.tableCleanedOffline', { tableNumber: table.table_number }))
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
      if (error.name === 'AbortError' || error.message?.includes('fetch') || error.message?.includes('network') || !navigator.onLine) {
        setTables(prev => prev.map(t =>
          t.id === table.id
            ? { ...t, status: 'available', payment_completed_at: null }
            : t
        ))
        markTableCleanedOffline(table.id)
        showNotification('success', t('notifications.tableCleanedOffline', { tableNumber: table.table_number }))
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
        showNotification('info', t('notifications.noReadyItemsToDeliver', { department }))
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
      showNotification('success', itemsToDeliver.length > 1
          ? t('notifications.itemsDeliveredPlural', { count: itemsToDeliver.length, department: departmentLabel, tableNumber: table.table_number })
          : t('notifications.itemsDelivered', { count: itemsToDeliver.length, department: departmentLabel, tableNumber: table.table_number })
        )
    } catch (error) {
      console.error('Error marking items as delivered:', error)
      showNotification('error', t('notifications.itemsDeliveredFailed'))
    }
  }

  // ── Terminal helpers ────────────────────────────────────────────────────────

  const resetTerminalState = () => {
    if (terminalTimerRef.current) clearTimeout(terminalTimerRef.current)
    if (terminalPollRef.current) clearInterval(terminalPollRef.current)
    terminalTimerRef.current = null
    terminalPollRef.current = null
    setTerminalStatus(null)
    setTerminalReaders([])
    setSelectedReader(null)
    setTerminalPaymentIntentId(null)
    setTerminalDeclineReason(null)
  }

  const fetchTerminalReaders = async () => {
    setTerminalStatus('loading_readers')
    try {
      const res = await fetch('/api/terminal/list-readers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch readers')
      const online = (data.readers || []).filter(r => r.status === 'online')
      if (online.length === 0) {
        setTerminalStatus('no_readers')
        return
      }
      setTerminalReaders(data.readers || [])
      setTerminalStatus('selecting_reader')
    } catch (err) {
      console.error('fetchTerminalReaders error:', err)
      setTerminalStatus(null)
      showNotification('error', t('paymentModal.terminalNoReadersOnline'))
    }
  }

  const handleTerminalPayment = async (reader) => {
    setSelectedReader(reader)
    setTerminalStatus('waiting')

    const currency = (restaurant?.invoice_settings?.currency || 'EUR').toUpperCase()
    const totalAmount = calculateFinalTotal()
    const orderIds = unpaidOrders.map(o => o.id)

    try {
      // 1. Create PaymentIntent
      const piRes = await fetch('/api/terminal/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          amount: totalAmount,
          currency,
          orderIds,
          tableId: selectedTable.id
        })
      })
      const piData = await piRes.json()
      if (!piRes.ok) {
        if (piData.code === 'currency_not_supported') {
          setTerminalStatus('currency_not_supported')
          return
        }
        throw new Error(piData.error || 'Failed to create payment intent')
      }
      const paymentIntentId = piData.paymentIntentId
      setTerminalPaymentIntentId(paymentIntentId)

      // 2. Push to reader
      const prRes = await fetch('/api/terminal/process-reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          readerId: reader.id,
          paymentIntentId
        })
      })
      const prData = await prRes.json()
      if (!prRes.ok) {
        if (prData.code === 'terminal_reader_busy') {
          showNotification('error', t('paymentModal.terminalReaderBusy'))
        } else {
          showNotification('error', prData.error || t('paymentModal.terminalPaymentFailed'))
        }
        resetTerminalState()
        return
      }

      // 3. Start 2-minute timeout
      terminalTimerRef.current = setTimeout(() => {
        if (terminalPollRef.current) clearInterval(terminalPollRef.current)
        terminalPollRef.current = null
        setTerminalStatus('timed_out')
        // Best-effort cancel
        fetch('/api/terminal/cancel-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId: restaurant.id, readerId: reader.id, paymentIntentId })
        }).catch(() => {})
      }, 120_000)

      // 4. Poll terminal_payments every 3s
      terminalPollRef.current = setInterval(async () => {
        try {
          const { data: rows } = await supabase
            .from('terminal_payments')
            .select('status, decline_code')
            .eq('payment_intent_id', paymentIntentId)
            .single()

          if (!rows) return

          if (rows.status === 'succeeded') {
            clearTimeout(terminalTimerRef.current)
            clearInterval(terminalPollRef.current)
            terminalTimerRef.current = null
            terminalPollRef.current = null
            // Process in Supabase (mark orders paid)
            await supabase.rpc('process_table_payment', {
              p_table_id: selectedTable.id,
              p_payment_method: 'card',
              p_order_ids: orderIds
            })
            await fetchTableOrderInfo(restaurant.id)
            resetTerminalState()
            setShowPaymentModal(false)
            showNotification('success', t('paymentModal.paymentSuccess'))
          } else if (rows.status === 'failed') {
            clearTimeout(terminalTimerRef.current)
            clearInterval(terminalPollRef.current)
            terminalTimerRef.current = null
            terminalPollRef.current = null
            setTerminalDeclineReason(rows.decline_code || 'card_declined')
            setTerminalStatus('failed')
          }
        } catch (err) {
          console.error('Terminal poll error:', err)
        }
      }, 3000)

    } catch (err) {
      console.error('handleTerminalPayment error:', err)
      showNotification('error', t('paymentModal.terminalPaymentFailed'))
      resetTerminalState()
    }
  }

  const handleTerminalCancel = async () => {
    const intentId = terminalPaymentIntentId
    const reader = selectedReader
    resetTerminalState()
    if (intentId && reader) {
      fetch('/api/terminal/cancel-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id, readerId: reader.id, paymentIntentId: intentId })
      }).catch(() => {})
    }
  }

  // ────────────────────────────────────────────────────────────────────────────

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

    const subtotalAmount = calculateTableTotal()
    const totalAmount = calculateFinalTotal() // After discount

    // Only card payments require internet; cash and external_terminal can be queued offline
    if (!navigator.onLine && paymentMethod === 'card') {
      showNotification('error', t('notifications.offlineCardOnly'))
      return
    }

    // Helper: store payment locally and update UI (used for offline path and online-failure fallback)
    const processPaymentOffline = async () => {
      const orderIds = unpaidOrders
        .filter(o => o.id && !o.id.toString().startsWith('offline_'))
        .map(o => o.id)
      const orderClientIds = unpaidOrders
        .filter(o => o.client_id && !o.id)
        .map(o => o.client_id)

      await addPendingPayment({
        restaurant_id: restaurant.id,
        table_id: selectedTable.id,
        order_ids: orderIds,
        order_client_ids: orderClientIds,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        staff_name: userName,
        user_id: userId,
      })

      if (orderClientIds.length > 0) {
        await markOrdersPaidOffline(orderClientIds)
      }

      setTableOrderInfo(prev => { const u = { ...prev }; delete u[selectedTable.id]; return u })
      setTables(prev => prev.map(t =>
        t.id === selectedTable.id
          ? { ...t, status: 'needs_cleaning', payment_completed_at: new Date().toISOString() }
          : t
      ))
      setShowPaymentModal(false)
      setUnpaidOrders([])
      await clearAllOfflineOrdersForTable(selectedTable.id)
      localStorage.removeItem(`table_orders_${selectedTable.id}`)
      clearOrdersCacheForTable(selectedTable.id)
      showNotification('success', t('notifications.offlineCashPaymentSaved', { amount: formatCurrency(totalAmount) }))
    }

    if (!navigator.onLine) {
      try {
        await processPaymentOffline()
      } catch (offlineErr) {
        console.error('Offline payment error:', offlineErr)
        showNotification('error', t('notifications.offlinePaymentFailed'))
      }
      return
    }

    // ONLINE PAYMENT HANDLING
    try {
      // Get order IDs - filter out offline-only orders that don't have real IDs
      const orderIds = unpaidOrders.filter(order => order.id && !order.id.toString().startsWith('offline_')).map(order => order.id)

      // Use RPC function to process payment with a 6s timeout
      const rpcAbort = new AbortController()
      const rpcAbortTimer = setTimeout(() => rpcAbort.abort(), 6000)
      let data, error
      try {
        const result = await supabase.rpc('process_table_payment', {
          p_order_ids: orderIds,
          p_payment_method: paymentMethod,
          p_staff_name: userName,
          p_user_id: userId
        }, { signal: rpcAbort.signal })
        data = result.data
        error = result.error
      } catch (rpcErr) {
        error = rpcErr
      } finally {
        clearTimeout(rpcAbortTimer)
      }

      // If the RPC failed because the network dropped mid-payment, queue it offline
      if (error) {
        console.warn('process_table_payment RPC failed, queuing offline:', error?.message)
        try {
          await processPaymentOffline()
        } catch (offlineErr) {
          console.error('Offline payment fallback error:', offlineErr)
          showNotification('error', t('notifications.offlinePaymentFailed'))
        }
        return
      }

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to process payment')
      }

      // Save external terminal reference if provided
      if (externalTerminalRef.trim() && orderIds.length > 0) {
        await supabase
          .from('orders')
          .update({ payment_reference: externalTerminalRef.trim() })
          .eq('id', orderIds[0])
      }

      // Apply discount AFTER payment processing to ensure it's not overwritten
      // This updates the discount_total on the first order
      if (selectedDiscount && discountAmount > 0 && orderIds.length > 0) {
        console.log('Setting discount_total after payment:', {
          orderId: orderIds[0],
          discountAmount
        })

        const { error: discountUpdateError } = await supabase
          .from('orders')
          .update({
            discount_total: discountAmount
          })
          .eq('id', orderIds[0])

        if (discountUpdateError) {
          console.error('Failed to set discount_total after payment:', discountUpdateError)
        } else {
          console.log('Successfully set discount_total:', discountAmount)
        }
      }

      // Close payment modal
      setShowPaymentModal(false)
      setUnpaidOrders([])

      // Reset discount state
      setSelectedDiscount(null)
      setDiscountAmount(0)

      // Store completed order IDs for invoice generation
      setCompletedOrderIds(orderIds)

      // Send print job to VenoApp Bridge if connected
      const invoiceSettings = restaurant?.invoice_settings || {}
      const defaultTaxRate = (invoiceSettings.tax_rates || []).find(r => r.is_default) || invoiceSettings.tax_rates?.[0]
      const subtotal = totalAmount / (1 + (defaultTaxRate?.rate || 0) / 100)
      const taxAmount = totalAmount - subtotal
      sendPrintJob({
        venue_name: restaurant?.name || '',
        order_type: unpaidOrders[0]?.order_type || 'dine-in',
        table_number: selectedTable?.table_number?.toString() || null,
        items: unpaidOrders.flatMap(o => (o.order_items || []).map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price_at_time,
        }))),
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_rate: defaultTaxRate?.rate || 0,
        tax_label: invoiceSettings.tax_system || 'VAT',
        tax_amount: parseFloat(taxAmount.toFixed(2)),
        total: totalAmount,
        currency: invoiceSettings.currency || 'EUR',
        locale: invoiceSettings.locale || 'en-GB',
        vat_number: invoiceSettings.vat_number || null,
        tax_id: invoiceSettings.tax_id || null,
        footer_text: invoiceSettings.footer_text || null,
        timestamp: new Date().toISOString(),
      })

      // Clean up any stale offline orders for this table (only needed when IDB is available)
      if (!navigator.onLine) {
        try {
          await clearPaidOfflineOrders(selectedTable.id)
          await clearPendingOrderUpdates(selectedTable.id)
        } catch (err) {
          console.warn('Failed to clear offline data after payment:', err)
        }
      }

      // Clear the localStorage cache for this table
      localStorage.removeItem(`table_orders_${selectedTable.id}`)

      // Refresh table order info and table list
      await fetchTableOrderInfo(restaurant.id)
      await fetchData()

      showNotification('success', discountAmount > 0
        ? t('notifications.paymentProcessedDiscount', { amount: formatCurrency(totalAmount), method: paymentMethod, discount: formatCurrency(discountAmount) })
        : t('notifications.paymentProcessed', { amount: formatCurrency(totalAmount), method: paymentMethod })
      )

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

  /**
   * For promotions tied to a specific product, return only the subtotal
   * of that product's items across the unpaid orders.
   * For regular discounts (no product_id), return the full table subtotal.
   */
  const calculateDiscountBase = (discount, orders) => {
    const orderList = orders || unpaidOrders
    if (discount?.is_promotion && discount.product_id) {
      return orderList.reduce((sum, o) =>
        sum + (o.order_items || [])
          .filter(i => i.menu_item_id === discount.product_id)
          .reduce((s, i) => s + ((i.price_at_time || i.price || 0) * (i.quantity || 1)), 0)
      , 0)
    }
    return calculateTableTotal()
  }

  /**
   * Calculate discount amount based on selected discount
   * Returns the calculated discount amount
   */
  const calculateDiscountAmount = (subtotal, discount) => {
    if (!discount) return 0

    if (discount.type === 'percentage') {
      return Math.round((subtotal * discount.value / 100) * 100) / 100
    } else {
      // Fixed amount - cap at subtotal
      return Math.min(discount.value, subtotal)
    }
  }

  /**
   * Handle discount selection change
   * Recalculates the discount amount when a discount is selected
   */
  const handleDiscountChange = (discountId) => {
    if (!discountId || discountId === 'none') {
      setSelectedDiscount(null)
      setDiscountAmount(0)
      return
    }

    const discount = availableDiscounts.find(d => d.id === discountId)
    if (discount) {
      const base = calculateDiscountBase(discount)
      const amount = calculateDiscountAmount(base, discount)
      setSelectedDiscount(discount)
      setDiscountAmount(amount)
    }
  }

  /**
   * Calculate final total after discount
   */
  const calculateFinalTotal = () => {
    const subtotal = calculateTableTotal()
    return Math.max(0, subtotal - discountAmount)
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

      showNotification('success', t('notifications.splitBillPaid', { bill: bill.name, amount: formatCurrency(bill.total), method: paymentMethod }))

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
        showNotification('success', t('notifications.invoiceEmailed', { email: clientData.email }))
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
    setOrderItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(oi => oi.menu_item_id === item.id)
      if (existingItemIndex !== -1) {
        const updated = [...prevItems]
        updated[existingItemIndex] = {
          ...updated[existingItemIndex],
          quantity: updated[existingItemIndex].quantity + 1
        }
        return updated
      } else {
        return [...prevItems, {
          menu_item_id: item.id,
          name: item.name,
          price_at_time: item.price,
          quantity: 1,
          isExisting: false,
          existingQuantity: 0
        }]
      }
    })
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

  // Update special instructions for an item
  const updateItemNote = (menuItemId, note) => {
    setItemNotes(prev => ({
      ...prev,
      [menuItemId]: note
    }))
  }

  const openTransferModal = (table) => {
    setTransferSourceTable(table)
    setShowTransferModal(true)
  }

  const transferTable = async (destinationTable) => {
    if (!transferSourceTable || transferSourceTable.id === destinationTable.id) return
    setTransferring(true)

    try {
      const { data, error } = await supabase.rpc('transfer_table_order', {
        p_source_table_id: transferSourceTable.id,
        p_destination_table_id: destinationTable.id
      })

      if (error) throw error
      if (data && !data.success) throw new Error(data.error || 'Transfer failed')

      // Clear caches for both tables
      clearOrdersCacheForTable(transferSourceTable.id)
      clearOrdersCacheForTable(destinationTable.id)
      clearTableOrdersLocalCache(transferSourceTable.id)
      clearTableOrdersLocalCache(destinationTable.id)

      setShowTransferModal(false)
      setTransferSourceTable(null)
      await fetchTableOrderInfo(restaurant.id)
      showNotification('success', t('notifications.orderTransferred', { from: transferSourceTable.table_number, to: destinationTable.table_number }))
    } catch (err) {
      console.error('Transfer error:', err)
      showNotification('error', err.message || t('notifications.orderTransferFailed'))
    } finally {
      setTransferring(false)
    }
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

    // ── OFFLINE: skip Supabase entirely, go straight to IDB queue ─────────────
    if (!navigator.onLine) {
      try {
        let itemsToSave = consolidatedItems
        let totalToSave = total

        if (currentOrder) {
          const originalItems = currentOrder.order_items || []
          itemsToSave = consolidatedItems.filter(newItem => {
            const original = originalItems.find(o => o.menu_item_id === newItem.menu_item_id)
            if (!original) return true
            return newItem.quantity > original.quantity
          }).map(newItem => {
            const original = originalItems.find(o => o.menu_item_id === newItem.menu_item_id)
            if (!original) return newItem
            return { ...newItem, quantity: newItem.quantity - original.quantity }
          }).filter(item => item.quantity > 0)

          if (itemsToSave.length === 0) {
            showNotification('info', t('notifications.noNewItemsOffline'))
            return
          }
          totalToSave = itemsToSave.reduce((sum, item) => sum + ((item.price_at_time || 0) * (item.quantity || 0)), 0)

          // Existing Supabase order — queue as an update
          if (currentOrder.id) {
            await addPendingOrderUpdate(currentOrder.id, selectedTable.id, itemsToSave.map(item => ({
              menu_item_id: item.menu_item_id,
              name: item.name,
              quantity: item.quantity,
              price_at_time: item.price_at_time,
            })))
            await fetchTableOrderInfo(restaurant.id)
            setShowOrderModal(false); setSelectedTable(null); setCurrentOrder(null); setOrderItems([]); setItemNotes({})
            showNotification('success', t('notifications.offlineItemsAdded'))
            return
          }

          // Existing offline order (not yet synced) — update IDB record
          if (currentOrder.client_id && !currentOrder.id) {
            await updatePendingOrder(currentOrder.client_id, itemsToSave.map(item => ({
              menu_item_id: item.menu_item_id,
              name: item.name,
              quantity: item.quantity,
              price_at_time: item.price_at_time,
            })), totalToSave)
            await fetchTableOrderInfo(restaurant.id)
            setShowOrderModal(false); setSelectedTable(null); setCurrentOrder(null); setOrderItems([]); setItemNotes({})
            showNotification('success', t('notifications.offlineItemsAdded'))
            return
          }
        }

        // New order
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
        await fetchTableOrderInfo(restaurant.id)
        setShowOrderModal(false); setSelectedTable(null); setCurrentOrder(null); setOrderItems([]); setItemNotes({})
        showNotification('success', currentOrder ? t('notifications.offlineAdditionalItemsSaved') : t('notifications.offlineOrderSaved'))
      } catch (offlineErr) {
        console.error('Failed to save order offline:', offlineErr)
        showNotification('error', t('notifications.offlineOrderFailed') || 'Failed to save order offline')
      }
      return
    }

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
        // CRITICAL FIX: Use .select() to get deleted rows and verify deletion
        console.log('Deleting old order items for order:', currentOrder.id)

        // First, count existing items to verify delete worked
        const { data: existingItems, error: countError } = await supabase
          .from('order_items')
          .select('id, name, menu_item_id')
          .eq('order_id', currentOrder.id)

        const existingCount = existingItems?.length || 0
        console.log('Existing items before delete:', existingCount, existingItems?.map(i => i.name))

        const { data: deletedItems, error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', currentOrder.id)
          .select()

        if (deleteError) {
          console.error('ERROR deleting old order items:', deleteError)
          throw deleteError
        }
        console.log('Deleted items count:', deletedItems?.length || 0)
        console.log('Deleted items:', deletedItems?.map(i => `${i.name} (id: ${i.id})`))

        // CRITICAL: Check if RLS blocked the delete (staff might not have delete permission)
        if (existingCount > 0 && (!deletedItems || deletedItems.length === 0)) {
          console.error('⚠️ RLS ISSUE: Delete returned 0 rows but items existed. Staff may not have delete permission.')
          console.error('Will use UPSERT strategy instead of DELETE+INSERT')

          // Use UPSERT strategy: Update existing items, insert new ones
          for (const item of consolidatedItems) {
            const existingItem = existingItems.find(e => e.menu_item_id === item.menu_item_id)
            if (existingItem) {
              // Update existing item
              await supabase
                .from('order_items')
                .update({
                  quantity: item.quantity,
                  price_at_time: item.price_at_time,
                  special_instructions: itemNotes[item.menu_item_id] || null
                })
                .eq('id', existingItem.id)
              console.log(`Updated existing item: ${item.name} to qty ${item.quantity}`)
            } else {
              // Insert new item
              await supabase
                .from('order_items')
                .insert({
                  order_id: currentOrder.id,
                  menu_item_id: item.menu_item_id,
                  quantity: item.quantity,
                  price_at_time: item.price_at_time,
                  name: item.name,
                  special_instructions: itemNotes[item.menu_item_id] || null
                })
              console.log(`Inserted new item: ${item.name}`)
            }
          }

          // Skip the normal insert flow
          console.log('UPSERT complete - skipping normal insert')

          // Close modal immediately, then refresh in background
          setShowOrderModal(false)
          setOrderModalLoading(false)
          setSelectedTable(null)
          setCurrentOrder(null)
          setOrderItems([])
          setItemNotes({})
          showNotification('success', t('notifications.orderUpdated'))

          // Background: cache + clear offline data + refresh badges
          ;(async () => {
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
            } catch (e) { console.warn('Failed to cache orders:', e) }
            try { await clearAllOfflineOrdersForTable(selectedTable.id) } catch {}
            fetchTableOrderInfo(restaurant.id)
          })()
          return  // Exit early - we used UPSERT instead
        }

        // CRITICAL: Verify all items were deleted before inserting
        // This prevents race conditions where delete hasn't fully propagated
        const { data: remainingItems, error: verifyError } = await supabase
          .from('order_items')
          .select('id, name')
          .eq('order_id', currentOrder.id)

        if (verifyError) {
          console.error('ERROR verifying deletion:', verifyError)
        } else if (remainingItems && remainingItems.length > 0) {
          console.error('⚠️ ITEMS STILL EXIST AFTER DELETE:', remainingItems)
          // Force delete remaining items
          for (const item of remainingItems) {
            await supabase.from('order_items').delete().eq('id', item.id)
          }
          console.log('Force deleted remaining items')
        } else {
          console.log('✅ Verified: All old items deleted successfully')
        }

        // Now insert new items
        const itemsToInsert = consolidatedItems.map(item => ({
          order_id: currentOrder.id,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
          name: item.name,
          special_instructions: itemNotes[item.menu_item_id] || null
        }))

        // DEBUG: Log exactly what we're inserting to the database
        console.log('========== INSERTING TO DATABASE ==========')
        console.log('Order ID:', currentOrder.id)
        console.log('Items to insert:', itemsToInsert.map(i => `${i.name} x${i.quantity} (menu_item_id: ${i.menu_item_id})`))
        console.log('Total items count:', itemsToInsert.length)

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('ERROR inserting new order items:', itemsError)
          throw itemsError
        }
        console.log('SUCCESS: Items inserted to database')

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
          name: item.name,
          special_instructions: itemNotes[item.menu_item_id] || null
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      // Close modal immediately
      const tableIdForCache = selectedTable.id
      const restaurantIdForRefresh = restaurant.id
      setShowOrderModal(false)
      setOrderModalLoading(false)
      setSelectedTable(null)
      setCurrentOrder(null)
      setOrderItems([])
      setItemNotes({})
      showNotification('success', currentOrder ? t('notifications.orderUpdated') : t('notifications.orderPlaced'))

      // Background: cache orders + clear offline data + refresh badges
      ;(async () => {
        try {
          const { data: ordersData } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('table_id', tableIdForCache)
            .is('paid', false)
            .neq('status', 'cancelled')
            .order('created_at', { ascending: true })
          if (ordersData && ordersData.length > 0) {
            localStorage.setItem(`table_orders_${tableIdForCache}`, JSON.stringify(ordersData))
          }
        } catch (e) { console.warn('Failed to cache orders:', e) }
        try { await clearAllOfflineOrdersForTable(tableIdForCache) } catch {}
        fetchTableOrderInfo(restaurantIdForRefresh)
      })()
    } catch (error) {
      console.log('========== ORDER SUBMISSION ERROR ==========')
      console.log('Error:', error?.message || error)
      console.log('navigator.onLine:', navigator.onLine)

      // Check if this is a network error (offline or connection dropped)
      const isNetworkError = !navigator.onLine ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('network') ||
        error?.code === 'NETWORK_ERROR'

      console.log('Is network error:', isNetworkError)

      // If offline/network error, queue order locally
      if (isNetworkError) {
        console.log('========== OFFLINE ORDER SUBMISSION ==========')
        try {
          let itemsToSave = consolidatedItems
          let totalToSave = total

          console.log('DEBUG: consolidatedItems:', consolidatedItems.map(i => ({
            menu_item_id: i.menu_item_id,
            name: i.name,
            quantity: i.quantity
          })))
          console.log('DEBUG: currentOrder exists:', !!currentOrder)
          console.log('DEBUG: currentOrder.id:', currentOrder?.id)
          console.log('DEBUG: currentOrder.order_items:', currentOrder?.order_items?.map(i => ({
            menu_item_id: i.menu_item_id,
            name: i.name,
            quantity: i.quantity
          })))

          // If updating an existing order, only save the NEW items
          if (currentOrder) {
            console.log('DEBUG: Updating existing order - calculating new items only')
            const originalItems = currentOrder.order_items || []
            console.log('DEBUG: Original items count:', originalItems.length)

            itemsToSave = consolidatedItems.filter(newItem => {
              const original = originalItems.find(o => o.menu_item_id === newItem.menu_item_id)
              const isNew = !original
              const isIncreased = original && newItem.quantity > original.quantity
              console.log(`DEBUG: Item ${newItem.name}: original=${original?.quantity || 'N/A'}, new=${newItem.quantity}, isNew=${isNew}, isIncreased=${isIncreased}`)
              if (!original) return true // completely new item
              return newItem.quantity > original.quantity // increased quantity
            }).map(newItem => {
              const original = originalItems.find(o => o.menu_item_id === newItem.menu_item_id)
              if (!original) return newItem
              // Only save the additional quantity
              const additionalQty = newItem.quantity - original.quantity
              console.log(`DEBUG: Item ${newItem.name}: saving additional quantity ${additionalQty}`)
              return {
                ...newItem,
                quantity: additionalQty
              }
            }).filter(item => item.quantity > 0)

            console.log('DEBUG: Items to save after filtering:', itemsToSave.map(i => ({
              name: i.name,
              quantity: i.quantity
            })))

            if (itemsToSave.length === 0) {
              console.log('DEBUG: No new items to save - returning')
              showNotification('info', t('notifications.noNewItemsOffline'))
              return
            }

            totalToSave = itemsToSave.reduce((sum, item) => sum + ((item.price_at_time || 0) * (item.quantity || 0)), 0)
            console.log('DEBUG: Total to save:', totalToSave)

            // If this is an existing order from Supabase, store as an ORDER UPDATE
            // so items get added to the same order (not as separate orders)
            if (currentOrder.id) {
              console.log('DEBUG: Creating ORDER UPDATE for order ID:', currentOrder.id)
              await addPendingOrderUpdate(currentOrder.id, selectedTable.id, itemsToSave.map(item => ({
                menu_item_id: item.menu_item_id,
                name: item.name,
                quantity: item.quantity,
                price_at_time: item.price_at_time,
              })))

              console.log('SUCCESS: addPendingOrderUpdate called')

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
              setItemNotes({})
              console.log('========== OFFLINE ORDER UPDATE COMPLETE ==========')
              showNotification('success', t('notifications.offlineItemsAdded'))
              return
            }
          } else {
            console.log('DEBUG: No currentOrder - will create new offline order')
          }

          // Check if this is an existing OFFLINE order (has client_id but no Supabase id)
          if (currentOrder && currentOrder.client_id && !currentOrder.id) {
            // Update the existing offline order in IndexedDB
            console.log('DEBUG: Updating existing OFFLINE order (not synced yet):', currentOrder.client_id)
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
            setItemNotes({})
            showNotification('success', t('notifications.offlineItemsAdded'))
            return
          }

          // New order - create a fresh pending order
          console.log('========== CREATING NEW OFFLINE ORDER ==========')
          console.log('DEBUG: No existing order found - creating brand new offline order')
          const clientId = generateClientId()
          console.log('DEBUG: Generated client_id:', clientId)
          console.log('DEBUG: Items for new order:', itemsToSave.map(i => ({
            name: i.name,
            quantity: i.quantity
          })))

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

          console.log('SUCCESS: New offline order created')

          // Recalculate table order info to include the new offline order
          // This uses getAllPendingOrderUpdatesByTable() which will include our just-added items
          // We do NOT manually update the total here to avoid double-counting
          await fetchTableOrderInfo(restaurant.id)

          setShowOrderModal(false)
          setSelectedTable(null)
          setCurrentOrder(null)
          setOrderItems([])
          setItemNotes({})
          const message = currentOrder
            ? t('notifications.offlineAdditionalItemsSaved')
            : t('notifications.offlineOrderSaved')
          console.log('========== NEW OFFLINE ORDER COMPLETE ==========')
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

  const visibleTables = activeFloorId === null
    ? tables
    : tables.filter(t => t.floor_id === activeFloorId)

  return (

      <div>
        {/* Notification Toast */}
      {notification && (() => {
        const palette = {
          success: { bg: isDark ? '#14532d' : '#f0fdf4', border: isDark ? '#166534' : '#bbf7d0', icon: isDark ? '#86efac' : '#16a34a', text: isDark ? '#dcfce7' : '#14532d' },
          error:   { bg: isDark ? '#7f1d1d' : '#fef2f2', border: isDark ? '#991b1b' : '#fecaca', icon: isDark ? '#fca5a5' : '#dc2626', text: isDark ? '#fee2e2' : '#7f1d1d' },
          info:    { bg: isDark ? '#1e3a5f' : '#eff6ff', border: isDark ? '#1e40af' : '#bfdbfe', icon: isDark ? '#93c5fd' : '#2563eb', text: isDark ? '#dbeafe' : '#1e3a5f' },
        }
        const p = palette[notification.type] || palette.info
        return (
          <div className="fixed top-4 right-4 z-[100] transition-all duration-300 ease-out animate-in slide-in-from-right">
            <div className="rounded-xl shadow-lg p-4 min-w-[300px] max-w-md border-2" style={{ background: p.bg, borderColor: p.border }}>
              <div className="flex items-start gap-3">
                {notification.type === 'success' && (
                  <svg className="w-6 h-6 flex-shrink-0" style={{ color: p.icon }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="w-6 h-6 flex-shrink-0" style={{ color: p.icon }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="w-6 h-6 flex-shrink-0" style={{ color: p.icon }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: p.text }}>{notification.message}</p>
                </div>
                <button onClick={() => setNotification(null)} style={{ color: p.icon }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            {t('title')}
            <InfoTooltip text={tg('tables_desc')} />
          </h1>
          <p className="text-slate-500">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Grid density toggle */}
          {tables.length > 0 && (
            <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
              {/* Compact — many small squares */}
              <button
                onClick={() => updateGridDensity('compact')}
                title="Compact view"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${gridDensity === 'compact' ? 'bg-white shadow text-[#6262bd]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="4.5" height="4.5" rx="0.8"/><rect x="9.75" y="2" width="4.5" height="4.5" rx="0.8"/><rect x="17.5" y="2" width="4.5" height="4.5" rx="0.8"/>
                  <rect x="2" y="9.75" width="4.5" height="4.5" rx="0.8"/><rect x="9.75" y="9.75" width="4.5" height="4.5" rx="0.8"/><rect x="17.5" y="9.75" width="4.5" height="4.5" rx="0.8"/>
                  <rect x="2" y="17.5" width="4.5" height="4.5" rx="0.8"/><rect x="9.75" y="17.5" width="4.5" height="4.5" rx="0.8"/><rect x="17.5" y="17.5" width="4.5" height="4.5" rx="0.8"/>
                </svg>
              </button>
              {/* Default — 4-grid */}
              <button
                onClick={() => updateGridDensity('default')}
                title="Default view"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${gridDensity === 'default' ? 'bg-white shadow text-[#6262bd]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="9" height="9" rx="1.2"/><rect x="13" y="2" width="9" height="9" rx="1.2"/>
                  <rect x="2" y="13" width="9" height="9" rx="1.2"/><rect x="13" y="13" width="9" height="9" rx="1.2"/>
                </svg>
              </button>
              {/* Large — 2-grid */}
              <button
                onClick={() => updateGridDensity('large')}
                title="Large view"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${gridDensity === 'large' ? 'bg-white shadow text-[#6262bd]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="9" rx="1.5"/><rect x="2" y="13" width="20" height="9" rx="1.5"/>
                </svg>
              </button>
            </div>
          )}
          {userType === 'owner' && tables.length > 0 && (
            <button
              onClick={downloadAllQR}
              className="border-2 border-slate-200 text-slate-600 px-3 sm:px-5 py-2.5 rounded-xl font-medium hover:bg-slate-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              <span className="hidden sm:inline">{t('downloadAllQR')}</span>
            </button>
          )}
          {userType === 'owner' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#6262bd] text-white px-3 sm:px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <span className="hidden sm:inline">{t('addTable')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Floor filter tabs — only shown when multiple floors exist */}
      {floors.length > 1 && (
        <div className="bg-slate-100 rounded-xl p-1 mb-6 flex flex-wrap gap-1">
            <button
              onClick={() => setActiveFloorId(null)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
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
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
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
        <div className={gridClass}>
          {visibleTables.map((table) => (
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
              onTransfer={() => openTransferModal(table)}
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
          onClick={() => {
            setShowOrderModal(false)
            setOrderModalLoading(false)
            setSelectedTable(null)
            setCurrentOrder(null)
            setOrderItems([])
            setItemNotes({})
            setSelectedCategory(null)
            setProductSearch('')
          }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-6xl my-4 max-h-[90vh] flex flex-col animate-zoom-in relative"
            onClick={(e) => e.stopPropagation()}
          >
            {orderModalLoading && (
              <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center z-10">
                <div className="w-8 h-8 border-4 border-[#6262bd]/20 border-t-[#6262bd] rounded-full animate-spin" />
              </div>
            )}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {currentOrder ? (t('orderModal.titleUpdate') || 'Update Order') : (t('orderModal.titlePlace') || 'Place Order')} - {t('orderModal.tableTitle')?.replace('{tableNumber}', selectedTable.table_number) || `Table ${selectedTable.table_number}`}
                </h2>
                {currentOrder && (
                  <p className="text-sm text-slate-500">{t('orderModal.orderNumber')?.replace('{id}', (currentOrder.id || currentOrder.client_id || 'new').slice(0, 8)) || `Order #${(currentOrder.id || currentOrder.client_id || 'new').slice(0, 8)}`}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setOrderModalLoading(false)
                  setSelectedTable(null)
                  setCurrentOrder(null)
                  setOrderItems([])
                  setItemNotes({})
                  setSelectedCategory(null)
                  setProductSearch('')
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

            <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
              {/* Menu Items */}
              <div className="lg:col-span-2 flex flex-col min-h-0">
                {/* Search Bar - Always visible */}
                <div className="mb-4">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder={t('orderModal.searchProducts') || 'Search products...'}
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6262bd]/50 focus:border-[#6262bd] text-slate-800 placeholder-slate-400 transition-colors"
                    />
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {menuItems.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-8 text-center">
                    <p className="text-slate-500">{t('orderModal.noMenuItems')}</p>
                    <p className="text-sm text-slate-400 mt-2">{t('orderModal.addItemsFirst')}</p>
                  </div>
                ) : productSearch ? (
                  /* Search Results View */
                  <div className="flex-1 overflow-y-auto pr-2">
                    <h3 className="font-semibold text-slate-700 mb-3">{t('orderModal.searchResults') || 'Search Results'}</h3>
                    {(() => {
                      const searchLower = productSearch.toLowerCase()
                      const filteredItems = menuItems.filter(item =>
                        item.name.toLowerCase().includes(searchLower) ||
                        (item.description && item.description.toLowerCase().includes(searchLower))
                      )
                      if (filteredItems.length === 0) {
                        return (
                          <div className="bg-slate-50 rounded-xl p-6 text-center">
                            <p className="text-slate-500">{t('orderModal.noProductsFound') || 'No products found'}</p>
                          </div>
                        )
                      }
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {filteredItems.map(item => (
                            <button
                              key={item.id}
                              onClick={() => addItemToOrder(item)}
                              disabled={!item.available}
                              className={`flex flex-col p-3 rounded-xl transition-all text-left ${
                                item.available
                                  ? 'bg-slate-50 hover:bg-slate-100 hover:shadow-md'
                                  : 'bg-slate-100 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-24 rounded-lg object-cover mb-2"
                                />
                              ) : (
                                <div className="w-full h-24 rounded-lg bg-slate-200 mb-2 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <p className="font-medium text-slate-800 text-sm line-clamp-2">{item.name}</p>
                              <div className="mt-auto pt-2 flex items-center justify-between">
                                <span className="font-semibold text-[#6262bd]">{formatCurrency(item.price)}</span>
                                {!item.available && (
                                  <span className="text-xs text-red-500">{t('orderModal.unavailable')}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                ) : !selectedCategory ? (
                  /* Categories Grid View */
                  <div className="flex-1 overflow-y-auto pr-2">
                    <h3 className="font-semibold text-slate-700 mb-3">{t('orderModal.selectCategory') || 'Select a Category'}</h3>
                    {categories.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {categories.map(category => {
                          const categoryItems = menuItems.filter(item => item.category_id === category.id)
                          if (categoryItems.length === 0) return null
                          return (
                            <button
                              key={category.id}
                              onClick={() => setSelectedCategory(category)}
                              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 hover:from-[#6262bd]/10 hover:to-[#6262bd]/5 dark:hover:from-[#6262bd]/30 dark:hover:to-[#6262bd]/20 rounded-xl transition-all hover:shadow-md border border-slate-200 dark:border-slate-500 hover:border-[#6262bd]/30"
                            >
                              <div className="w-12 h-12 rounded-full bg-[#6262bd]/10 flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-[#6262bd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-100 text-center">{category.name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-300 mt-1">{categoryItems.length} {categoryItems.length === 1 ? (t('orderModal.item') || 'item') : (t('orderModal.items') || 'items')}</span>
                            </button>
                          )
                        })}
                        {/* Show uncategorized items if any */}
                        {(() => {
                          const uncategorizedItems = menuItems.filter(item => !item.category_id || !categories.find(c => c.id === item.category_id))
                          if (uncategorizedItems.length === 0) return null
                          return (
                            <button
                              onClick={() => setSelectedCategory({ id: 'uncategorized', name: t('orderModal.uncategorized') || 'Other' })}
                              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 hover:from-[#6262bd]/10 hover:to-[#6262bd]/5 dark:hover:from-[#6262bd]/30 dark:hover:to-[#6262bd]/20 rounded-xl transition-all hover:shadow-md border border-slate-200 dark:border-slate-500 hover:border-[#6262bd]/30"
                            >
                              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-100 text-center">{t('orderModal.uncategorized') || 'Other'}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-300 mt-1">{uncategorizedItems.length} {uncategorizedItems.length === 1 ? (t('orderModal.item') || 'item') : (t('orderModal.items') || 'items')}</span>
                            </button>
                          )
                        })()}
                      </div>
                    ) : (
                      /* No categories - show all products directly */
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {menuItems.map(item => (
                          <button
                            key={item.id}
                            onClick={() => addItemToOrder(item)}
                            disabled={!item.available}
                            className={`flex flex-col p-3 rounded-xl transition-all text-left ${
                              item.available
                                ? 'bg-slate-50 hover:bg-slate-100 hover:shadow-md'
                                : 'bg-slate-100 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-24 rounded-lg object-cover mb-2"
                              />
                            ) : (
                              <div className="w-full h-24 rounded-lg bg-slate-200 mb-2 flex items-center justify-center">
                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                            <p className="font-medium text-slate-800 text-sm line-clamp-2">{item.name}</p>
                            <div className="mt-auto pt-2 flex items-center justify-between">
                              <span className="font-semibold text-[#6262bd]">{formatCurrency(item.price)}</span>
                              {!item.available && (
                                <span className="text-xs text-red-500">{t('orderModal.unavailable')}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Products in Selected Category View */
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="flex items-center gap-3 mb-3">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center gap-1 text-[#6262bd] hover:text-[#5252a3] font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {t('orderModal.back') || 'Back'}
                      </button>
                      <h3 className="font-semibold text-slate-700">{selectedCategory.name}</h3>
                    </div>
                    {(() => {
                      const categoryItems = selectedCategory.id === 'uncategorized'
                        ? menuItems.filter(item => !item.category_id || !categories.find(c => c.id === item.category_id))
                        : menuItems.filter(item => item.category_id === selectedCategory.id)

                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {categoryItems.map(item => (
                            <button
                              key={item.id}
                              onClick={() => addItemToOrder(item)}
                              disabled={!item.available}
                              className={`flex flex-col p-3 rounded-xl transition-all text-left ${
                                item.available
                                  ? 'bg-slate-50 hover:bg-slate-100 hover:shadow-md'
                                  : 'bg-slate-100 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-24 rounded-lg object-cover mb-2"
                                />
                              ) : (
                                <div className="w-full h-24 rounded-lg bg-slate-200 mb-2 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <p className="font-medium text-slate-800 text-sm line-clamp-2">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{item.description}</p>
                              )}
                              <div className="mt-auto pt-2 flex items-center justify-between">
                                <span className="font-semibold text-[#6262bd]">{formatCurrency(item.price)}</span>
                                {!item.available && (
                                  <span className="text-xs text-red-500">{t('orderModal.unavailable')}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    })()}
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
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4 max-h-64 overflow-y-auto">
                      {orderItems.map((item) => {
                        const newQuantity = item.isExisting ? item.quantity - item.existingQuantity : item.quantity
                        const hasNewItems = newQuantity > 0
                        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id)
                        const requiresInstructions = menuItem?.requires_special_instructions
                        const instructionsLabel = menuItem?.special_instructions_label || 'Special instructions'

                        return (
                          <div key={item.menu_item_id} className={`mb-3 last:mb-0 rounded-lg p-2 ${item.isExisting ? 'bg-blue-50/50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">{item.quantity}x {item.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-300">{formatCurrency(item.price_at_time || 0)} {t('orderModal.each') || 'each'}</p>

                                {/* Show breakdown if item has both existing and new quantities */}
                                {item.isExisting && hasNewItems && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    {t('orderModal.quantityBreakdown').replace('{existing}', item.existingQuantity).replace('{new}', newQuantity)}
                                  </p>
                                )}

                                {/* Special Instructions Input */}
                                {requiresInstructions && (
                                  <div className="mt-2">
                                    <input
                                      type="text"
                                      placeholder={instructionsLabel}
                                      value={itemNotes[item.menu_item_id] || ''}
                                      onChange={(e) => updateItemNote(item.menu_item_id, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1 text-xs border border-amber-200 rounded bg-amber-50 text-amber-800 placeholder-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {userType === 'owner' || !currentOrder ? (
                                  // Owners can always modify, staff can only modify NEW orders
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        updateItemQuantity(item.menu_item_id, item.quantity - 1)
                                      }}
                                      className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-colors"
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
                                      className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 flex items-center justify-center transition-colors"
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
                        <span className="text-xl font-bold text-[#6262bd]">{formatCurrency(calculateTotal())}</span>
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
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-sm max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{t('paymentModal.title').replace('{tableNumber}', selectedTable.table_number)}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(calculateFinalTotal())}</p>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedTable(null)
                  setUnpaidOrders([])
                  setSelectedDiscount(null)
                  setDiscountAmount(0)
                  setShowExternalTerminal(false)
                  setExternalTerminalRef('')
                  setShowExternalTerminalRef(false)
                  resetTerminalState()
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div className="px-6 pb-8 pt-4">
              {unpaidOrders.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-400 text-sm">{t('paymentModal.noUnpaidOrders')}</p>
                </div>
              ) : (
                <>
                  {/* Order Summary */}
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{t('paymentModal.ordersSummary')}</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {unpaidOrders.map((order, index) => {
                        const orderTotal = (order.order_items || []).reduce((sum, item) => sum + ((item.price_at_time || 0) * (item.quantity || 0)), 0) || order.total || 0
                        return (
                          <div key={order.id} className="rounded-xl bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('paymentModal.orderNumber').replace('{number}', index + 1)}</span>
                              <span className="text-xs font-bold text-[#6262bd]">{formatCurrency(orderTotal)}</span>
                            </div>
                            <div className="space-y-0.5">
                              {order.order_items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                  <span>{item.quantity}× {item.name}</span>
                                  <span>{formatCurrency((item.price_at_time || 0) * (item.quantity || 1))}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Discount */}
                  {availableDiscounts.length > 0 && (
                    <div className="mb-5">
                      {selectedDiscount?.is_promotion && (
                        <div className="mb-2 flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-xs text-orange-700 dark:text-orange-400 font-medium">
                          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Promotion auto-applied
                        </div>
                      )}
                      <select
                        value={selectedDiscount?.id || 'none'}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700"
                      >
                        <option value="none">{t('paymentModal.noDiscount')}</option>
                        {availableDiscounts.map((discount) => (
                          <option key={discount.id} value={discount.id}>
                            {discount.name} ({discount.type === 'percentage' ? `${discount.value}%` : formatCurrency(discount.value)}){discount.is_promotion ? ' 🏷️' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/50 px-4 py-3 mb-6 space-y-1.5">
                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                      <span>{t('paymentModal.subtotal')}</span>
                      <span>{formatCurrency(calculateTableTotal())}</span>
                    </div>
                    {selectedDiscount && discountAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                        <span>
                          {selectedDiscount.name}
                          {selectedDiscount.is_promotion && selectedDiscount.product_id && (() => {
                            const promoItem = unpaidOrders.flatMap(o => o.order_items || []).find(i => i.menu_item_id === selectedDiscount.product_id)
                            return promoItem ? <span className="text-xs ml-1 opacity-75">· {promoItem.name}</span> : null
                          })()}
                        </span>
                        <span>−{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200 dark:border-slate-600">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t('paymentModal.totalToPay')}</span>
                      <span className="text-xl font-bold text-[#6262bd]">{formatCurrency(calculateFinalTotal())}</span>
                    </div>
                  </div>

                  {/* ── Payment method selection ── */}
                  {!terminalStatus && !showExternalTerminal && (
                    <div className="space-y-2.5">
                      {/* Cash */}
                      <button
                        onClick={() => processPayment('cash')}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-green-50 dark:bg-green-900/20 border-2 border-green-100 dark:border-green-800 hover:border-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all group"
                      >
                        <span className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                          </svg>
                        </span>
                        <span className="flex-1 text-left">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{t('paymentModal.payWithCash')}</span>
                        </span>
                        <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Stripe Terminal (Card) */}
                      <button
                        onClick={fetchTerminalReaders}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-[#6262bd]/5 dark:bg-[#6262bd]/10 border-2 border-[#6262bd]/20 dark:border-[#6262bd]/30 hover:border-[#6262bd]/60 hover:bg-[#6262bd]/10 dark:hover:bg-[#6262bd]/20 transition-all group"
                      >
                        <span className="w-9 h-9 rounded-xl bg-[#6262bd] flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                          </svg>
                        </span>
                        <span className="flex-1 text-left">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{t('paymentModal.payWithCard')}</span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500">Stripe Terminal</span>
                        </span>
                        <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#6262bd] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* External Terminal */}
                      <button
                        onClick={() => setShowExternalTerminal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all group"
                      >
                        <span className="w-9 h-9 rounded-xl bg-slate-700 dark:bg-slate-600 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm0 18H7V5h10v14zm-5 2c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm4-19H8V3h8v-1z"/>
                          </svg>
                        </span>
                        <span className="flex-1 text-left">
                          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{t('paymentModal.externalTerminalTitle')}</span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500">Own POS / bank terminal</span>
                        </span>
                        <svg className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* ── External Terminal confirmation ── */}
                  {showExternalTerminal && !terminalStatus && (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-700/50 border-2 border-slate-200 dark:border-slate-600 p-4 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{t('paymentModal.externalTerminalTitle')}</p>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(calculateFinalTotal())}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{t('paymentModal.externalTerminalDesc')}</p>
                      </div>
                      {!showExternalTerminalRef ? (
                        <button
                          onClick={() => setShowExternalTerminalRef(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-400 dark:text-slate-500 hover:border-[#6262bd] hover:text-[#6262bd] dark:hover:border-[#6262bd] dark:hover:text-[#6262bd] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {t('paymentModal.addCustomReference')}
                        </button>
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={externalTerminalRef}
                            onChange={e => setExternalTerminalRef(e.target.value)}
                            placeholder={t('paymentModal.customReferencePlaceholder')}
                            autoFocus
                            className="w-full px-4 py-2.5 pr-10 border-2 border-[#6262bd] rounded-xl text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-500"
                          />
                          <button
                            onClick={() => { setShowExternalTerminalRef(false); setExternalTerminalRef('') }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => {
                          processPayment('card')
                          setShowExternalTerminal(false)
                          setExternalTerminalRef('')
                          setShowExternalTerminalRef(false)
                        }}
                        className="w-full bg-[#6262bd] text-white py-3.5 rounded-2xl font-semibold hover:bg-[#5252a3] transition-colors"
                      >
                        {t('paymentModal.externalTerminalConfirm')}
                      </button>
                      <button
                        onClick={() => { setShowExternalTerminal(false); setExternalTerminalRef(''); setShowExternalTerminalRef(false) }}
                        className="w-full text-slate-400 dark:text-slate-500 text-sm py-1 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        ← {t('paymentModal.choosePaymentMethod')}
                      </button>
                    </div>
                  )}

                  {/* ── Stripe Terminal UI states ── */}
                  {terminalStatus === 'loading_readers' && (
                    <div className="flex flex-col items-center gap-3 py-8">
                      <div className="w-8 h-8 border-4 border-[#6262bd] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">{t('paymentModal.terminalLookingForReaders')}</p>
                    </div>
                  )}

                  {terminalStatus === 'no_readers' && (
                    <div className="space-y-3">
                      <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-4">{t('paymentModal.terminalNoReadersOnline')}</p>
                      <button
                        onClick={() => { setTerminalStatus(null); processPayment('card') }}
                        className="w-full border-2 border-[#6262bd] text-[#6262bd] py-3 rounded-2xl font-semibold hover:bg-[#6262bd]/10 transition-colors text-sm"
                      >
                        {t('paymentModal.terminalFallbackManual')}
                      </button>
                      <button onClick={resetTerminalState} className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 dark:hover:text-slate-300">
                        ← {t('paymentModal.choosePaymentMethod')}
                      </button>
                    </div>
                  )}

                  {terminalStatus === 'selecting_reader' && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('paymentModal.terminalSelectReader')}</p>
                      {terminalReaders.map(reader => (
                        <button
                          key={reader.id}
                          onClick={() => handleTerminalPayment(reader)}
                          className="w-full flex items-center justify-between border-2 border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3.5 hover:border-[#6262bd] hover:bg-[#6262bd]/5 transition-all"
                        >
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-100">{reader.label || reader.id}</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${reader.status === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                            {reader.status === 'online' ? t('paymentModal.terminalOnline') : t('paymentModal.terminalOffline')}
                          </span>
                        </button>
                      ))}
                      <button onClick={resetTerminalState} className="w-full text-slate-400 text-sm py-2 hover:text-slate-600 dark:hover:text-slate-300">
                        ← {t('paymentModal.choosePaymentMethod')}
                      </button>
                    </div>
                  )}

                  {terminalStatus === 'waiting' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                      <div className="w-12 h-12 border-4 border-[#6262bd] border-t-transparent rounded-full animate-spin" />
                      <div className="text-center">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{t('paymentModal.terminalWaitingTitle')}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedReader?.label || selectedReader?.id}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('paymentModal.terminalWaitingDesc')}</p>
                      </div>
                      <button onClick={handleTerminalCancel} className="text-sm text-red-400 hover:text-red-600 font-medium">
                        {t('paymentModal.terminalCancelPayment')}
                      </button>
                    </div>
                  )}

                  {terminalStatus === 'failed' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{t('paymentModal.terminalPaymentFailed')}</p>
                        {terminalDeclineReason && <p className="text-sm text-red-400 mt-1">{terminalDeclineReason.replace(/_/g, ' ')}</p>}
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => { resetTerminalState(); fetchTerminalReaders() }} className="flex-1 bg-[#6262bd] text-white py-2.5 rounded-2xl font-semibold hover:bg-[#5252a3] text-sm transition-colors">
                          {t('paymentModal.terminalTryAgain')}
                        </button>
                        <button onClick={() => { resetTerminalState(); processPayment('cash') }} className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2.5 rounded-2xl font-semibold text-sm">
                          {t('paymentModal.terminalPayCash')}
                        </button>
                      </div>
                    </div>
                  )}

                  {terminalStatus === 'timed_out' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{t('paymentModal.terminalTimedOut')}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('paymentModal.terminalTimedOutDesc')}</p>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => { resetTerminalState(); fetchTerminalReaders() }} className="flex-1 bg-[#6262bd] text-white py-2.5 rounded-2xl font-semibold hover:bg-[#5252a3] text-sm transition-colors">
                          {t('paymentModal.terminalTryAgain')}
                        </button>
                        <button onClick={() => { resetTerminalState(); processPayment('cash') }} className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2.5 rounded-2xl font-semibold text-sm">
                          {t('paymentModal.terminalPayCash')}
                        </button>
                      </div>
                    </div>
                  )}

                  {terminalStatus === 'currency_not_supported' && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{t('paymentModal.terminalCurrencyNotSupportedTitle')}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('paymentModal.terminalCurrencyNotSupportedDesc')}</p>
                      </div>
                      <div className="flex gap-2 w-full">
                        <button onClick={() => { resetTerminalState(); setShowExternalTerminal(true) }} className="flex-1 bg-[#6262bd] text-white py-2.5 rounded-2xl font-semibold hover:bg-[#5252a3] text-sm transition-colors">
                          {t('paymentModal.externalTerminalTitle')}
                        </button>
                        <button onClick={() => { resetTerminalState(); processPayment('cash') }} className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 py-2.5 rounded-2xl font-semibold text-sm">
                          {t('paymentModal.terminalPayCash')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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
                            {t('splitBillModal.quantityAvailable').replace('{quantity}', item.quantity).replace('{currency}', currencySymbol).replace('{price}', item.price.toFixed(2))}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800">{formatCurrency(item.quantity * item.price)}</span>
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
                            <span className="text-slate-600">{formatCurrency(bill.total)}</span>
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
                                    {item.quantity} × {formatCurrency(item.price)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">{formatCurrency(item.total)}</span>
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
                              <span className="text-xl font-bold text-[#6262bd]">{formatCurrency(bill.total)}</span>
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
                                {t('splitBillModal.payCash').replace('{currency}', currencySymbol).replace('{amount}', bill.total.toFixed(2))}
                              </button>
                              <button
                                onClick={() => processSplitBillPayment(bill, 'card')}
                                className="w-full bg-[#6262bd] text-white py-2 rounded-lg font-semibold hover:bg-[#5252a3] flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                </svg>
                                {t('splitBillModal.payCard').replace('{currency}', currencySymbol).replace('{amount}', bill.total.toFixed(2))}
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
                    <span className="font-bold text-slate-800">{formatCurrency(calculateTableTotal())}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700">{t('splitBillModal.assignedToBills')}</span>
                    <span className="font-bold text-[#6262bd]">
                      {formatCurrency(splitBills.reduce((sum, b) => sum + b.total, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">{t('splitBillModal.remaining')}</span>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(calculateTableTotal() - splitBills.reduce((sum, b) => sum + b.total, 0))}
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
                        <span className="font-semibold text-[#6262bd]">{formatCurrency(order.total ?? 0)}</span>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2">
                        {order.order_items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-700">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="text-slate-600">
                              {formatCurrency((item.price_at_time || 0) * (item.quantity || 0))}
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
                      {formatCurrency(tableOrderDetails.reduce((orderSum, order) => {
                        const orderItemsTotal = (order.order_items || []).reduce((itemSum, item) => {
                          return itemSum + ((item.price_at_time || 0) * (item.quantity || 0))
                        }, 0)
                        return orderSum + (orderItemsTotal > 0 ? orderItemsTotal : (order.total || 0))
                      }, 0))}
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

                                showNotification('success', t('notifications.guestConfirmed'))
                                fetchTodayReservations(restaurant.id)

                                // Refresh modal reservations
                                const updatedReservations = selectedTableReservations.map(r =>
                                  r.id === reservation.id ? { ...r, status: 'completed' } : r
                                )
                                setSelectedTableReservations(updatedReservations)
                              } catch (error) {
                                console.error('Error confirming guest:', error)
                                showNotification('error', t('notifications.guestConfirmFailed'))
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
                    showNotification('error', t('notifications.provideReason'))
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

                    showNotification('success', t('notifications.bookingCancelled'))
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
                    showNotification('error', t('notifications.bookingCancelFailed'))
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
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('paymentModal.postPaymentTitle')}</h2>
              <p className="text-slate-600">{t('paymentModal.postPaymentSubtitle')}</p>
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
                {t('paymentModal.generateInvoice')}
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
                {t('paymentModal.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Table Modal */}
      {showTransferModal && transferSourceTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => { setShowTransferModal(false); setTransferSourceTable(null) }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-slate-800">
                {t('transferModal.title')} — Table {transferSourceTable.table_number}
              </h2>
              <button
                onClick={() => { setShowTransferModal(false); setTransferSourceTable(null) }}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">{t('transferModal.subtitle')}</p>

            <div className="overflow-y-auto flex-1 space-y-2">
              {tables
                .filter((t) => t.id !== transferSourceTable.id)
                .map((destTable) => {
                  const destInfo = tableOrderInfo[destTable.id]
                  const destHasOrders = destInfo && destInfo.count > 0
                  return (
                    <button
                      key={destTable.id}
                      onClick={() => transferTable(destTable)}
                      disabled={transferring}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                        transferring
                          ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50'
                          : destHasOrders
                          ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-slate-800">Table {destTable.table_number}</span>
                        {destHasOrders ? (
                          <p className="text-xs text-amber-700 mt-0.5">{t('transferModal.hasExistingOrder')} — {formatCurrency(destInfo.total)}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">{t('transferModal.emptyTable')}</p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                      </svg>
                    </button>
                  )
                })}
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

function TableCard({ table, orderInfo, reservations, waiterCalls, userType, onDownload, onDelete, onPlaceOrder, onPayBill, onSplitBill, onViewOrders, onMarkCleaned, onMarkDelivered, onTransfer, onViewReservations, onCreateReservation, onAcknowledgeWaiterCall }) {
  const t = useTranslations('tables')
  const { currencySymbol, formatCurrency } = useCurrency()

  // Show badge if there are any unpaid orders (count > 0)
  // This handles both cases: orders with totals and orders where total might be 0 but items exist
  const hasOpenOrders = orderInfo && orderInfo.count > 0
  const needsCleaning = table.status === 'needs_cleaning'

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

  const [showOwnerMenu, setShowOwnerMenu] = useState(false)

  return (
    <div className={`bg-white border-2 rounded-2xl overflow-visible transition-all duration-200 relative flex flex-col ${
      needsCleaning ? 'border-red-200 shadow-red-100 shadow-md' :
      hasWaiterCall ? 'border-orange-300 shadow-orange-100 shadow-md' :
      hasOpenOrders ? 'border-amber-200 shadow-amber-100 shadow-md' :
      'border-slate-100 hover:border-slate-200 hover:shadow-sm'
    }`}>

      {/* Card Header — status-tinted top strip */}
      <div className={`rounded-t-2xl px-4 pt-4 pb-3 ${
        needsCleaning ? 'bg-red-50' :
        hasWaiterCall ? 'bg-orange-50' :
        hasOpenOrders ? 'bg-amber-50' : 'bg-slate-50'
      }`}>
        <div className="flex items-start justify-between gap-2">

          {/* Table number + status pill */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest leading-none mb-1">Table</p>
            <h3 className={`text-3xl font-black leading-none ${
              needsCleaning ? 'text-red-700' :
              hasWaiterCall ? 'text-orange-700' :
              hasOpenOrders ? 'text-amber-700' : 'text-slate-800'
            }`}>{table.table_number}</h3>

            {/* Status pill */}
            <div className="mt-2">
              {needsCleaning ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                  {t('needsCleaning')}
                </span>
              ) : hasWaiterCall ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full animate-pulse">
                  👋 Waiter needed
                </span>
              ) : hasOpenOrders ? (
                <button onClick={onViewOrders} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-200 bg-amber-100 dark:bg-amber-700 px-2 py-0.5 rounded-full hover:bg-amber-200 dark:hover:bg-amber-600 transition-colors">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                  Open · {formatCurrency(orderInfo.total)}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Available
                </span>
              )}
            </div>
          </div>

          {/* Top-right: reservation badge + owner menu */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {hasReservationsToday && (
              <button
                onClick={onViewReservations}
                title="Click to view today's reservations"
                className="flex items-center gap-1 text-xs font-semibold text-[#6262bd] bg-[#6262bd]/10 px-2 py-0.5 rounded-full hover:bg-[#6262bd]/20 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
                </svg>
                {reservations.length}
              </button>
            )}

            {userType === 'owner' && (
              <div className="relative">
                <button
                  onClick={() => setShowOwnerMenu(v => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                  title="Table options"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
                {showOwnerMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowOwnerMenu(false)} />
                    <div className="absolute right-0 top-8 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[148px]">
                      <button
                        onClick={() => { onDownload(); setShowOwnerMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                        {t('downloadQR')}
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button
                        onClick={() => { onDelete(); setShowOwnerMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                        {t('deleteTable')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body — actions */}
      <div className="p-3 flex flex-col gap-2">

        {/* Department ready badges */}
        {readyDepartments.length > 0 && !needsCleaning && (
          <div className="flex flex-wrap gap-1.5">
            {readyDepartments.map((dept) => (
              <button
                key={dept}
                onClick={() => onMarkDelivered(dept)}
                className={`${getDepartmentColor(dept)} text-white rounded-lg px-3 py-1.5 text-xs font-bold flex-1 flex items-center justify-center gap-1.5 animate-pulse`}
                title={`${getDepartmentLabel(dept)} items ready - click to mark as delivered`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                {getDepartmentLabel(dept)} READY!
              </button>
            ))}
          </div>
        )}

        {needsCleaning ? (
          /* Needs cleaning state — single full-width CTA */
          <button
            onClick={onMarkCleaned}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            {t('markAsCleaned')}
          </button>
        ) : hasOpenOrders ? (
          /* Open order state — Pay is primary, rest are secondary */
          <>
            {hasWaiterCall && (
              <button
                onClick={() => onAcknowledgeWaiterCall(waiterCalls[0].id)}
                className="w-full bg-orange-500 text-white py-2 rounded-xl font-semibold hover:bg-orange-600 text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                👋 Acknowledge waiter call
              </button>
            )}
            <button
              onClick={onPayBill}
              className="w-full bg-green-600 text-white py-2.5 rounded-xl font-semibold hover:bg-green-700 text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
              </svg>
              {t('payBill')}
            </button>
            <div className="flex gap-2">
              <button
                onClick={onPlaceOrder}
                className="flex-1 bg-[#6262bd] text-white py-2 rounded-xl font-medium hover:bg-[#5252a3] text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {t('updateOrder')}
              </button>
              <button
                onClick={onSplitBill}
                className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-medium hover:bg-slate-200 text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                </svg>
                {t('splitBill')}
              </button>
            </div>
            <button
              onClick={onTransfer}
              className="w-full border border-slate-200 text-slate-600 py-2 rounded-xl font-medium hover:bg-slate-50 text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/>
              </svg>
              {t('transferTable')}
            </button>
            <button
              onClick={onCreateReservation}
              className="w-full border border-slate-200 text-slate-500 py-2 rounded-xl font-medium hover:bg-slate-50 text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM12 13h5v5h-5z"/>
              </svg>
              {t('newReservation')}
            </button>
          </>
        ) : (
          /* Available state — Place Order is primary */
          <>
            {hasWaiterCall && (
              <button
                onClick={() => onAcknowledgeWaiterCall(waiterCalls[0].id)}
                className="w-full bg-orange-500 text-white py-2 rounded-xl font-semibold hover:bg-orange-600 text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                👋 Acknowledge waiter call
              </button>
            )}
            <button
              onClick={onPlaceOrder}
              className="w-full bg-[#6262bd] text-white py-2.5 rounded-xl font-semibold hover:bg-[#5252a3] text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              {t('placeOrder')}
            </button>
            <button
              onClick={onCreateReservation}
              className="w-full border border-slate-200 text-slate-500 py-2 rounded-xl font-medium hover:bg-slate-50 text-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM12 13h5v5h-5z"/>
              </svg>
              {t('newReservation')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
