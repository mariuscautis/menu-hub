'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, clearOrdersCacheForTable, clearAllOrdersCache, clearTableOrdersLocalCache, wasTablePaidOffline, clearTablePaidOfflineStatus, markTableCleanedOffline } from '@/lib/supabase'
import InvoiceClientModal from '@/components/invoices/InvoiceClientModal'
import { generateInvoicePdfBase64, downloadInvoicePdf } from '@/lib/invoicePdfGenerator'
import {
  addPendingOrder,
  generateClientId,
  addPendingPayment,
  getPendingOrdersForTable,
  markOrdersPaidOffline,
  getAllPendingOrdersByTable,
  getAllPendingOrderUpdatesByTable,
  clearPaidOfflineOrders,
  addPendingOrderUpdate,
  getPendingOrderUpdatesForTable,
  clearPendingOrderUpdates,
  clearAllOfflineOrdersForTable,
  updatePendingOrder,
} from '@/lib/offlineQueue'

// Read-only Table Component for Staff
function FloorPlanTable({ table, orderInfo, reservations, waiterCalls, onClick, onMarkCleaned, onMarkDelivered, onViewReservations }) {
  // Show badge if there are orders with unpaid amounts
  // Hide only when total is explicitly 0 (not undefined/null)
  const hasOpenOrders = orderInfo && orderInfo.count > 0 && (orderInfo.total === undefined || orderInfo.total === null || orderInfo.total > 0)
  const needsCleaning = table.status === 'needs_cleaning'
  const hasReservationsToday = reservations && reservations.length > 0
  const hasWaiterCall = waiterCalls && waiterCalls.length > 0
  const readyDepartments = orderInfo?.readyDepartments || []

  const shapeClass = table.shape === 'circle'
    ? 'rounded-full'
    : table.shape === 'square'
    ? 'rounded-lg'
    : 'rounded-xl'

  const statusColor = needsCleaning
    ? 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-500'
    : hasOpenOrders
      ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-500'
      : 'bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-500'

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
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        left: table.x_position || 0,
        top: table.y_position || 0,
        width: table.width || 80,
        height: table.height || 80,
        zIndex: 10,
      }}
      className={`${shapeClass} ${statusColor} border-2 flex flex-col items-center justify-center transition-all hover:shadow-lg hover:scale-105 cursor-pointer relative`}
    >
      {/* Needs Cleaning Badge */}
      {needsCleaning && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onMarkCleaned(table)
          }}
          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-[8px] font-bold shadow-lg uppercase tracking-wide hover:bg-red-600 transition-colors z-10 cursor-pointer"
          title="Needs cleaning - click to mark as cleaned"
        >
          CLEAN
        </span>
      )}

      {/* Waiter Call Badge (top left) */}
      {hasWaiterCall && (
        <span
          onClick={async (e) => {
            e.stopPropagation()
            // Acknowledge the waiter call
            const call = waiterCalls[0]
            if (call) {
              console.log('🔵 TABLES FLOOR PLAN - Attempting to acknowledge waiter call:', call.id, 'Current status:', call.status)

              const { data, error } = await supabase
                .from('waiter_calls')
                .update({
                  status: 'acknowledged',
                  acknowledged_at: new Date().toISOString()
                })
                .eq('id', call.id)
                .select()

              if (!error) {
                console.log('🔵 TABLES FLOOR PLAN - Waiter call acknowledged successfully:', call.id, data)
              } else {
                console.error('🔵 TABLES FLOOR PLAN - Error acknowledging waiter call:', error)
              }
            } else {
              console.log('🔵 TABLES FLOOR PLAN - No waiter call found to acknowledge')
            }
          }}
          className="absolute -top-3 -left-3 bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-base font-bold animate-pulse shadow-lg z-20 cursor-pointer hover:bg-orange-600 transition-colors"
          title="Click to acknowledge - customer will be notified"
        >
          👋
        </span>
      )}

      {/* Reservation Indicator Badge (top left, shift right if waiter call exists) */}
      {hasReservationsToday && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onViewReservations(table)
          }}
          className={`absolute -top-2 ${hasWaiterCall ? 'left-4' : '-left-2'} bg-[#6262bd] text-white rounded-full px-2 py-0.5 text-[7px] font-bold shadow-lg hover:bg-[#5252a3] transition-colors z-10 cursor-pointer flex items-center gap-0.5`}
          title="Click to view today's reservations"
        >
          <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z"/>
          </svg>
          <span>{reservations.length}</span>
        </span>
      )}

      {/* Department Ready Badges */}
      {readyDepartments.length > 0 && !needsCleaning && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {readyDepartments.map((dept) => (
            <span
              key={dept}
              onClick={(e) => {
                e.stopPropagation()
                onMarkDelivered(table, dept)
              }}
              className={`${getDepartmentColor(dept)} text-white rounded-full px-1.5 py-0.5 text-[7px] font-bold shadow-lg transition-all flex items-center gap-0.5 animate-pulse cursor-pointer`}
              title={`${getDepartmentLabel(dept)} items ready - click to mark as delivered`}
            >
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              <span>{dept.toUpperCase()}</span>
            </span>
          ))}
        </div>
      )}

      <div className="text-center p-2 pointer-events-none">
        <div className={`font-bold ${
          needsCleaning
            ? 'text-red-800 dark:text-red-200'
            : 'text-slate-800 dark:text-slate-200'
        }`}>T{table.table_number}</div>
        <div className={`text-xs ${
          needsCleaning
            ? 'text-red-600 dark:text-red-300'
            : 'text-slate-600 dark:text-slate-400'
        }`}>{table.capacity} seats</div>
        {hasOpenOrders && !needsCleaning && (
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mt-1">
            {orderInfo.count} order{orderInfo.count !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </button>
  )
}

// Decorative Element Component (Read-only)
function FloorPlanElement({ element }) {
  const rotation = element.rotation || 0
  const transform = `rotate(${rotation}deg)`

  const style = {
    position: 'absolute',
    left: element.x_position,
    top: element.y_position,
    width: element.width,
    height: element.height,
    transform: transform,
    zIndex: element.z_index || 0,
    opacity: 0.6,
    backgroundColor: element.color || '#e2e8f0',
    pointerEvents: 'none'
  }

  const getElementIcon = () => {
    switch (element.element_type) {
      case 'wall': return '▮'
      case 'door': return '⌂'
      case 'window': return '◫'
      case 'plant': return '☘'
      case 'counter': return '▬'
      case 'bar': return '🍷'
      case 'entrance': return '⬇'
      case 'exit': return '⬆'
      case 'stairs': return '⚏'
      case 'restroom': return '♿'
      default: return '◻'
    }
  }

  return (
    <div
      style={style}
      className="rounded-lg border-2 border-slate-400 dark:border-slate-500 flex items-center justify-center text-3xl select-none text-slate-700 dark:text-slate-200"
    >
      <span>{getElementIcon()}</span>
      {element.label && (
        <span className="text-xs absolute bottom-0 left-0 right-0 bg-black/50 dark:bg-black/70 text-white text-center py-0.5">
          {element.label}
        </span>
      )}
    </div>
  )
}

// Main Staff Floor Plan View
export default function StaffFloorPlanPage() {
  const router = useRouter()
  const [restaurant, setRestaurant] = useState(null)
  const [staff, setStaff] = useState(null)
  const [floors, setFloors] = useState([])
  const [currentFloor, setCurrentFloor] = useState(null)
  const [tables, setTables] = useState([])
  const [elements, setElements] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableOrderInfo, setTableOrderInfo] = useState({})
  const [todayReservations, setTodayReservations] = useState({})
  const [waiterCalls, setWaiterCalls] = useState({})
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [showReservationsModal, setShowReservationsModal] = useState(false)
  const [selectedTableReservations, setSelectedTableReservations] = useState([])
  const [showCreateReservationModal, setShowCreateReservationModal] = useState(false)
  const [showCancelReservationModal, setShowCancelReservationModal] = useState(false)
  const [selectedReservationToCancel, setSelectedReservationToCancel] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [reservationForm, setReservationForm] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    partySize: 2,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    specialRequests: ''
  })
  const [currentUser, setCurrentUser] = useState(null)
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false)
  const [availableTimeSlots, setAvailableTimeSlots] = useState([])
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)

  // Payment and invoice state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [unpaidOrders, setUnpaidOrders] = useState([])
  const [showPostPaymentModal, setShowPostPaymentModal] = useState(false)
  const [completedOrderIds, setCompletedOrderIds] = useState([])
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [invoiceTableId, setInvoiceTableId] = useState(null)
  const [invoiceOrderId, setInvoiceOrderId] = useState(null)
  const [invoiceSplitBillData, setInvoiceSplitBillData] = useState(null) // For split bill invoices
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [notification, setNotification] = useState(null)

  // Split bill state
  const [showSplitBillModal, setShowSplitBillModal] = useState(false)
  const [splitBills, setSplitBills] = useState([{ id: 1, name: 'Bill 1', items: [], total: 0 }])
  const [availableItems, setAvailableItems] = useState([])
  const [splitBillTableId, setSplitBillTableId] = useState(null) // Store table ID for split bill session

  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [currentOrder, setCurrentOrder] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [itemNotes, setItemNotes] = useState({}) // Track special instructions per item
  const [userType, setUserType] = useState(null)

  // Order modal UX state - category navigation and search
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [productSearch, setProductSearch] = useState('')

  // Canvas settings
  const canvasWidth = currentFloor?.width || 1200
  const canvasHeight = currentFloor?.height || 800

  // Detect dark mode for canvas background
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetchData()
  }, [])

  // Refresh floor data when refresh trigger changes
  useEffect(() => {
    if (!restaurant || !currentFloor) return

    console.log('🔵 TABLES FLOOR PLAN - Refresh trigger fired:', refreshTrigger)
    loadFloorData(currentFloor.id, restaurant.id)
    fetchTableOrderInfo(restaurant.id)
    fetchWaiterCalls(restaurant.id)
  }, [restaurant, currentFloor, refreshTrigger])

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!restaurant || !currentFloor) return

    const restaurantId = restaurant.id

    // Subscribe to table changes for real-time updates
    const tablesChannel = supabase
      .channel('floor-plan-tables-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('🔵 TABLES FLOOR PLAN - Table change detected:', payload)
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to order changes
    const ordersChannel = supabase
      .channel(`floor-plan-orders-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('🔵 TABLES FLOOR PLAN - Order changed:', payload)
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to order_items changes
    const orderItemsChannel = supabase
      .channel(`floor-plan-order-items-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items'
        },
        (payload) => {
          console.log('🔵 TABLES FLOOR PLAN - Order item changed:', payload)
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to split bills changes
    const splitBillsChannel = supabase
      .channel(`floor-plan-split-bills-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'split_bills',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('🔵 TABLES FLOOR PLAN - Split bill changed:', payload)
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    // Subscribe to waiter calls
    const waiterCallsChannel = supabase
      .channel(`floor-plan-waiter-calls-realtime-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waiter_calls',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('🔵 TABLES FLOOR PLAN - Waiter call changed:', payload)
          setRefreshTrigger(prev => prev + 1)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tablesChannel)
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(orderItemsChannel)
      supabase.removeChannel(splitBillsChannel)
      supabase.removeChannel(waiterCallsChannel)
    }
  }, [restaurant, currentFloor])

  // No longer need automatic invoice opening - using manual "Create Invoice" buttons instead

  const showNotificationMessage = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const fetchData = async () => {
    try {
      let restaurantId = null

      // Check for staff session first (PIN-based login)
      const staffSessionData = localStorage.getItem('staff_session')
      if (staffSessionData) {
        const staffSession = JSON.parse(staffSessionData)
        setRestaurant(staffSession.restaurant)
        restaurantId = staffSession.restaurant_id
        setCurrentUser({ email: staffSession.staff_name || 'Staff' })
        setUserType('staff')
      } else {
        // Check for regular auth user (owner/admin staff)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/dashboard')
          return
        }

        setCurrentUser(user)

        // Get staff member info
        const { data: staffData } = await supabase
          .from('staff')
          .select('*, restaurants(*)')
          .eq('user_id', user.id)
          .single()

        if (!staffData) {
          router.push('/dashboard')
          return
        }

        setStaff(staffData)
        setRestaurant(staffData.restaurants)
        restaurantId = staffData.restaurant_id
        setUserType(staffData.role === 'admin' ? 'owner' : 'staff')
      }

      if (!restaurantId) {
        router.push('/dashboard')
        return
      }

      // Get floors
      const { data: floorsData } = await supabase
        .from('floors')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('level')

      setFloors(floorsData || [])
      if (floorsData && floorsData.length > 0) {
        setCurrentFloor(floorsData[0])
        await loadFloorData(floorsData[0].id, restaurantId)
      }

      // Fetch menu items and categories for order modal
      // Explicitly include special instructions fields
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*, requires_special_instructions, special_instructions_label')
        .eq('restaurant_id', restaurantId)
        .eq('available', true)
        .order('name')

      setMenuItems(menuData || [])

      const { data: categoriesData } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('sort_order')

      setCategories(categoriesData || [])

      // Fetch table order info
      await fetchTableOrderInfo(restaurantId)

      // Fetch today's reservations
      await fetchTodayReservations(restaurantId)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTableOrderInfo = async (restaurantId) => {
    // Get all unpaid, non-cancelled orders with their items
    const { data: orders } = await supabase
      .from('orders')
      .select(`
        id,
        table_id,
        total,
        order_items (
          id,
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

    // Group by table and calculate ready departments
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
      orderInfo[order.table_id].total += order.total || 0

      // Check if any items are ready (marked_ready_at is set and delivered_at is null)
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

    // Also merge pending ORDER UPDATES (items added to existing orders while offline)
    try {
      const pendingUpdatesByTable = await getAllPendingOrderUpdatesByTable()
      Object.entries(pendingUpdatesByTable).forEach(([tableId, updateData]) => {
        if (orderInfo[tableId]) {
          // Add pending update totals to existing table data
          orderInfo[tableId].total += updateData.total
        } else {
          // Table only has pending updates (edge case - shouldn't happen normally)
          orderInfo[tableId] = {
            count: 1,
            total: updateData.total,
            readyDepartments: [],
          }
        }
      })
    } catch (err) {
      console.warn('Failed to get pending order updates for merge:', err)
    }

    setTableOrderInfo(orderInfo)
  }

  const fetchTodayReservations = async (restaurantId) => {
    const today = new Date().toISOString().split('T')[0]

    // Get all pending and confirmed reservations for today grouped by table
    const { data: reservations } = await supabase
      .from('reservations')
      .select('*, tables(table_number)')
      .eq('restaurant_id', restaurantId)
      .eq('reservation_date', today)
      .in('status', ['pending', 'confirmed'])
      .order('reservation_time')

    // Group by table_id (confirmed reservations) or show pending without table
    const reservationsByTable = {}
    reservations?.forEach(reservation => {
      // For pending reservations, we might not have a table_id yet
      const tableKey = reservation.table_id || 'pending'
      if (!reservationsByTable[tableKey]) {
        reservationsByTable[tableKey] = []
      }
      reservationsByTable[tableKey].push(reservation)
    })

    setTodayReservations(reservationsByTable)
  }

  const fetchWaiterCalls = async (restaurantId) => {
    console.log('🔵 TABLES FLOOR PLAN - Fetching waiter calls for restaurant:', restaurantId)

    const { data: calls, error } = await supabase
      .from('waiter_calls')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('🔵 TABLES FLOOR PLAN - Error fetching waiter calls:', error)
      return
    }

    console.log('🔵 TABLES FLOOR PLAN - Fetched waiter calls:', calls)

    // Group by table_id
    const callsByTable = {}
    calls?.forEach(call => {
      if (!callsByTable[call.table_id]) {
        callsByTable[call.table_id] = []
      }
      callsByTable[call.table_id].push(call)
    })

    console.log('🔵 TABLES FLOOR PLAN - Setting waiter calls state:', callsByTable)
    setWaiterCalls(callsByTable)
  }

  const handleViewReservations = (table) => {
    const reservations = todayReservations[table.id] || []
    setSelectedTableReservations(reservations)
    setSelectedTable(table)
    setShowReservationsModal(true)
  }

  const handleMarkCleaned = async (table) => {
    // OFFLINE: Update local state immediately
    if (!navigator.onLine) {
      setTables(prev => prev.map(t =>
        t.id === table.id
          ? { ...t, status: 'available', payment_completed_at: null }
          : t
      ))
      // Track that this table was cleaned offline to prevent payment sync from resetting status
      markTableCleanedOffline(table.id)
      showNotificationMessage('success', `Table ${table.table_number} marked as cleaned (will sync when online)`)
      return
    }

    try {
      // Use the RPC function to properly mark table as cleaned
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

      // Refresh floor data and order info to update table status and clear old orders
      await loadFloorData(currentFloor.id, restaurant.id)
      await fetchTableOrderInfo(restaurant.id)

      const cleanupTime = data?.cleanup_duration_minutes
      const message = cleanupTime
        ? `Table ${table.table_number} marked as cleaned! Cleanup took ${cleanupTime} minutes.`
        : `Table ${table.table_number} marked as cleaned and ready!`

      showNotificationMessage('success', message)
    } catch (error) {
      console.error('Error marking table as cleaned:', error)
      // If network failed mid-request, update local state anyway
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        setTables(prev => prev.map(t =>
          t.id === table.id
            ? { ...t, status: 'available', payment_completed_at: null }
            : t
        ))
        // Track that this table was cleaned offline
        markTableCleanedOffline(table.id)
        showNotificationMessage('success', `Table ${table.table_number} marked as cleaned (will sync when online)`)
        return
      }
      showNotificationMessage('error', 'Failed to mark table as cleaned')
    }
  }

  const handleMarkDelivered = async (table, department) => {
    try {
      // Get all undelivered items for this table in this department
      const { data: orderItems, error: fetchError } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          orders!inner (
            table_id,
            restaurant_id
          ),
          menu_items!inner (
            department
          )
        `)
        .eq('orders.table_id', table.id)
        .eq('orders.restaurant_id', restaurant.id)
        .eq('menu_items.department', department)
        .not('marked_ready_at', 'is', null)
        .is('delivered_at', null)

      if (fetchError) throw fetchError

      if (!orderItems || orderItems.length === 0) {
        showNotificationMessage('info', `No ready items to deliver for ${department}`)
        return
      }

      const itemsToDeliver = orderItems.map(item => item.id)

      // Mark items as delivered
      const { error: updateError } = await supabase
        .from('order_items')
        .update({ delivered_at: new Date().toISOString() })
        .in('id', itemsToDeliver)

      if (updateError) throw updateError

      // Refresh table order info
      await fetchTableOrderInfo(restaurant.id)

      const departmentLabel = department.charAt(0).toUpperCase() + department.slice(1)
      showNotificationMessage('success', `${itemsToDeliver.length} ${departmentLabel} item${itemsToDeliver.length > 1 ? 's' : ''} delivered to Table ${table.table_number}!`)
    } catch (error) {
      console.error('Error marking items as delivered:', error)
      showNotificationMessage('error', 'Failed to mark items as delivered')
    }
  }

  const loadFloorData = async (floorId, restaurantId) => {
    // Load tables
    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .eq('floor_id', floorId)
      .order('table_number')

    // Load elements
    const { data: elementsData } = await supabase
      .from('floor_elements')
      .select('*')
      .eq('floor_id', floorId)

    // Load active orders (unpaid only)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('paid', false)
      .in('status', ['pending', 'preparing', 'ready'])

    setTables(tablesData || [])
    setElements(elementsData || [])
    setOrders(ordersData || [])
  }

  const handleTableClick = (table) => {
    setSelectedTable(table)
  }

  // ============================================================================
  // handleNewOrder - Opens the order modal for a selected table
  // ============================================================================
  // SYNC ARCHITECTURE OVERVIEW:
  //
  // This function handles loading existing orders when staff opens a table.
  // It must work in both ONLINE and OFFLINE modes:
  //
  // ONLINE MODE:
  //   1. Clear Supabase query cache to ensure fresh data (prevents stale reads)
  //   2. Clear localStorage order cache for this table
  //   3. Fetch fresh order data directly from Supabase
  //   4. Merge any pending offline updates (items added while offline)
  //
  // OFFLINE MODE:
  //   1. Read from localStorage cache (table_orders_${tableId})
  //   2. Merge with pending offline orders from IndexedDB
  //   3. Merge with pending order updates from IndexedDB
  //
  // CACHING LAYERS:
  //   - Supabase query cache (sbcache_*): Auto-caches GET responses for offline fallback
  //   - localStorage order cache (table_orders_*): Manual cache after order submit
  //   - IndexedDB pending_orders: Full orders created while offline
  //   - IndexedDB pending_order_updates: Items added to existing orders while offline
  //
  // CRITICAL: Both pages (/tables and /tables-floor-plan) must use IDENTICAL
  // query filters to avoid loading different orders for the same table!
  // ============================================================================
  const handleNewOrder = async () => {
    if (!selectedTable) return

    console.log('========== FLOOR PLAN: OPENING ORDER MODAL ==========')
    console.log('Table:', selectedTable.table_number, 'ID:', selectedTable.id)

    // STEP 1: Clear ALL state first to prevent duplicates from previous modal opens
    // This is critical - leftover state can cause item duplication
    console.log('STEP 1: Clearing ALL state completely')
    setOrderItems([])
    setItemNotes({})
    setCurrentOrder(null)
    setSelectedCategory(null)
    setProductSearch('')

    // STEP 2: Check if this table was paid offline
    // If paid offline, the localStorage cache might still contain stale "unpaid" orders
    // that were actually paid - we need to skip loading that stale data
    const wasPaidOffline = wasTablePaidOffline(selectedTable.id)
    console.log('STEP 2: Was table paid offline?', wasPaidOffline)

    // If we're back online, clear the offline paid status since we can fetch fresh data
    if (navigator.onLine && wasPaidOffline) {
      console.log('Back online - clearing offline paid status')
      clearTablePaidOfflineStatus(selectedTable.id)
    }

    // If paid offline and still offline, start with empty order (don't load cached data)
    if (wasPaidOffline && !navigator.onLine) {
      console.log('Table was paid offline and still offline - starting fresh')
      showNotificationMessage('info', 'Starting new order')
      setShowOrderModal(true)
      return
    }

    // STEP 3: Clear caches when ONLINE to ensure fresh data
    // This prevents the scenario where:
    //   1. Order placed on /tables page (cached)
    //   2. Order updated on /tables-floor-plan (but reads stale cache)
    // IMPORTANT: Only clear cache when ONLINE - when offline we NEED the cached data!
    if (navigator.onLine) {
      console.log('STEP 3: ONLINE - Clearing caches to fetch fresh data')
      clearAllOrdersCache() // Clears all sbcache_* entries for orders
      clearTableOrdersLocalCache(selectedTable.id) // Clears table_orders_${tableId}
    } else {
      console.log('STEP 3: OFFLINE - Preserving caches for offline data access')
    }

    // STEP 4: Check for pending offline orders in IndexedDB
    // These are FULL orders created while offline that haven't synced yet
    // NOTE: Don't return early - we need to also check for cached online orders and merge them!
    let pendingOfflineOrders = []
    try {
      pendingOfflineOrders = await getPendingOrdersForTable(selectedTable.id) || []
      if (pendingOfflineOrders.length > 0) {
        console.log('STEP 4: Found pending offline orders:', pendingOfflineOrders.length)
      } else {
        console.log('STEP 4: No pending offline orders')
      }
    } catch (err) {
      console.warn('STEP 4: Error checking offline orders:', err)
    }

    let existingOrder = null
    const cacheKey = `table_orders_${selectedTable.id}`

    if (!navigator.onLine) {
      // ========== OFFLINE MODE ==========
      // When offline, we cannot fetch from Supabase, so we rely on cached data
      console.log('========== OFFLINE MODE ==========')
      console.log('Checking localStorage cache for existing orders...')

      try {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const cachedOrders = JSON.parse(cached)
          console.log('Found cached orders:', cachedOrders.length)

          // Filter to only unpaid orders with valid status
          // MUST match the same filter used in ONLINE mode!
          const unpaidOrders = cachedOrders.filter(order =>
            order.table_id === selectedTable.id &&
            !order.paid &&
            ['pending', 'preparing', 'ready'].includes(order.status)
          )
          console.log('Filtered unpaid orders:', unpaidOrders.length)

          if (unpaidOrders.length > 0) {
            // Use the most recent order (last in ascending order, first in descending)
            existingOrder = unpaidOrders[unpaidOrders.length - 1]
            console.log('OFFLINE: Using cached order:', existingOrder.id)
          }
        } else {
          console.log('No cache found for key:', cacheKey)
        }
      } catch (e) {
        console.warn('Failed to load cached orders:', e)
      }

      // If no cached online order, check if we have pending offline orders
      if (!existingOrder && pendingOfflineOrders.length > 0) {
        console.log('OFFLINE: No cached orders but found pending offline orders')
        const latestOfflineOrder = pendingOfflineOrders[pendingOfflineOrders.length - 1]
        console.log('Using pending offline order:', latestOfflineOrder.client_id)

        // Map items from the pending offline order
        // Use a map to consolidate duplicate items by menu_item_id
        const itemsMap = {}
        const offlineItems = latestOfflineOrder.items || latestOfflineOrder.order_items || []
        offlineItems.forEach(item => {
          itemsMap[item.menu_item_id] = {
            menu_item_id: item.menu_item_id,
            name: item.name,
            price_at_time: item.price_at_time,
            quantity: item.quantity,
            isExisting: true,        // Mark as existing so UI shows it correctly
            existingQuantity: item.quantity  // Track original quantity for validation
          }
        })

        setCurrentOrder({
          client_id: latestOfflineOrder.client_id,
          table_id: latestOfflineOrder.table_id,
          order_items: offlineItems,
          isOfflineOrder: true  // Flag to indicate this is an offline-only order
        })
        setOrderItems(Object.values(itemsMap))
        setShowOrderModal(true)
        return
      }

      // If still no order, start fresh
      if (!existingOrder) {
        console.log('OFFLINE: No cached orders and no offline orders - starting fresh')
        showNotificationMessage('info', 'Offline mode — starting new order')
        setShowOrderModal(true)
        return
      }
    } else {
      // ========== ONLINE MODE ==========
      // Fetch fresh data from Supabase
      // CRITICAL: Query filters MUST match /tables page to avoid sync issues!
      console.log('========== ONLINE MODE ==========')
      console.log('Fetching fresh data from Supabase...')

      try {
        const { data: existingOrders, error: fetchError } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('table_id', selectedTable.id)
          // CRITICAL: Use .in() for status filter - matches /tables page exactly
          .in('status', ['pending', 'preparing', 'ready'])
          // CRITICAL: Use .is() not .eq() for boolean - handles null correctly
          .is('paid', false)
          .order('created_at', { ascending: false })
          // CRITICAL: Limit to 1 order to avoid confusion with multiple orders
          .limit(1)

        if (fetchError) {
          console.error('Error fetching existing orders:', fetchError)
        } else {
          console.log('Fetched orders:', existingOrders?.length || 0)
          if (existingOrders && existingOrders.length > 0) {
            existingOrder = existingOrders[0]
            console.log('Using order:', existingOrder.id, 'with', existingOrder.order_items?.length, 'items')

            // VALIDATION: Ensure the returned order actually belongs to this table
            // This prevents cached responses from other tables being used incorrectly
            if (existingOrder.table_id !== selectedTable.id) {
              console.error('CACHE MISMATCH: Order table_id', existingOrder.table_id, 'does not match selected table', selectedTable.id)
              console.error('Discarding stale cached order to prevent cross-table pollution')
              existingOrder = null
            }
          } else {
            console.log('No existing unpaid orders found for this table')
          }
        }
      } catch (err) {
        console.warn('Network error fetching orders:', err)
        // Don't throw - we'll proceed with empty order or try offline data
      }
    }

    // ========== STEP 5: Process existing order and merge offline data ==========
    if (existingOrder) {
      console.log('STEP 5: Processing existing order:', existingOrder.id)
      console.log('DEBUG: Raw order_items from DB:', existingOrder.order_items?.map(i => `${i.name} x${i.quantity} (id: ${i.id}, menu_item_id: ${i.menu_item_id})`))
      console.log('DEBUG: order_items count from DB:', existingOrder.order_items?.length)

      // CRITICAL VALIDATION: Check if DB already has duplicates
      const menuItemCounts = {}
      existingOrder.order_items?.forEach(item => {
        menuItemCounts[item.menu_item_id] = (menuItemCounts[item.menu_item_id] || 0) + 1
      })
      const duplicates = Object.entries(menuItemCounts).filter(([_, count]) => count > 1)
      if (duplicates.length > 0) {
        console.error('⚠️ DUPLICATE ITEMS IN DATABASE:', duplicates)
      }

      // Use a map to consolidate items by menu_item_id
      // This prevents duplicates and allows easy merging of quantities
      const itemsMap = {}
      const orderItems = existingOrder.order_items || []

      // First, add all items from the Supabase order
      orderItems.forEach(item => {
        if (itemsMap[item.menu_item_id]) {
          // Duplicate item in DB - sum quantities (shouldn't happen but handle gracefully)
          console.warn('DUPLICATE FOUND IN DB:', item.menu_item_id, item.name)
          itemsMap[item.menu_item_id].quantity += item.quantity
          itemsMap[item.menu_item_id].existingQuantity += item.quantity
        } else {
          itemsMap[item.menu_item_id] = {
            menu_item_id: item.menu_item_id,
            name: item.name,
            price_at_time: item.price_at_time,
            quantity: item.quantity,
            isExisting: true,        // Mark as existing so staff can't reduce below this
            existingQuantity: item.quantity  // Track original quantity for validation
          }
        }
      })

      // ========== MERGE PENDING ORDER UPDATES ==========
      // DISABLED: This was causing duplication issues. When online, we should
      // only use fresh Supabase data - no merging needed.
      // The offline data should only be used when actually OFFLINE.
      if (!navigator.onLine && existingOrder.id) {
        try {
          const pendingUpdates = await getPendingOrderUpdatesForTable(selectedTable.id)
          // Filter to only updates for THIS order
          const orderUpdates = pendingUpdates.filter(u => u.order_id === existingOrder.id)

          if (orderUpdates.length > 0) {
            console.log('OFFLINE: Merging', orderUpdates.length, 'pending order updates for order:', existingOrder.id)
            for (const update of orderUpdates) {
              if (update.items) {
                for (const item of update.items) {
                  if (itemsMap[item.menu_item_id]) {
                    // Item already exists - add the offline quantity
                    console.log(`  Adding ${item.quantity}x ${item.name} to existing item`)
                    itemsMap[item.menu_item_id].quantity += item.quantity
                    // ALSO update existingQuantity so these aren't treated as "new" on next submit
                    itemsMap[item.menu_item_id].existingQuantity += item.quantity
                  } else {
                    // New item from offline update
                    console.log(`  Adding new item: ${item.quantity}x ${item.name}`)
                    itemsMap[item.menu_item_id] = {
                      menu_item_id: item.menu_item_id,
                      name: item.name,
                      price_at_time: item.price_at_time,
                      quantity: item.quantity,
                      isExisting: true,  // Mark as existing so staff can't reduce
                      existingQuantity: item.quantity
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn('Error merging pending order updates:', err)
        }
      }

      // ========== MERGE PENDING OFFLINE ORDERS ==========
      // DISABLED when ONLINE: Only merge offline orders when actually offline.
      // When online, we have fresh data from Supabase - no merging needed.
      if (!navigator.onLine && pendingOfflineOrders.length > 0) {
        console.log('OFFLINE: Merging', pendingOfflineOrders.length, 'pending offline orders into existing online order')
        for (const offlineOrder of pendingOfflineOrders) {
          const offlineItems = offlineOrder.items || offlineOrder.order_items || []
          for (const item of offlineItems) {
            if (itemsMap[item.menu_item_id]) {
              console.log(`  Adding ${item.quantity}x ${item.name} from offline order`)
              itemsMap[item.menu_item_id].quantity += item.quantity
              itemsMap[item.menu_item_id].existingQuantity += item.quantity
            } else {
              console.log(`  Adding new offline item: ${item.quantity}x ${item.name}`)
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
      }

      // Convert map back to array
      const normalizedItems = Object.values(itemsMap)
      console.log('DEBUG STEP 5 COMPLETE: Final orderItems to set:', normalizedItems.map(i => `${i.name} x${i.quantity} (menuItemId: ${i.menu_item_id})`))
      console.log('DEBUG: normalizedItems length:', normalizedItems.length)

      // ========== STEP 6: Set state with merged data ==========
      // CRITICAL: Update currentOrder.order_items to include ALL merged items
      // This ensures that when submitting, the comparison uses ALL existing items
      // (both from Supabase AND from pending offline updates) to avoid creating
      // duplicate pending updates for items that were already added offline
      console.log('STEP 6: Setting state with merged data')
      setCurrentOrder({
        ...existingOrder,
        order_items: normalizedItems.map(item => ({
          menu_item_id: item.menu_item_id,
          name: item.name,
          price_at_time: item.price_at_time,
          quantity: item.quantity,  // Use the merged quantity (online + offline)
        }))
      })
      setOrderItems(normalizedItems)
    } else {
      console.log('STEP 5: No existing order - starting with empty orderItems')
      setCurrentOrder(null)
      setOrderItems([])
      setItemNotes({})
    }

    console.log('========== FLOOR PLAN: MODAL OPEN COMPLETE ==========')
    setShowOrderModal(true)
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
        const newItem = {
          menu_item_id: item.id,
          name: item.name,
          price_at_time: item.price,
          quantity: 1,
          isExisting: false,
          existingQuantity: 0
        }
        return [...prevItems, newItem]
      }
    })
  }

  const updateItemQuantity = (menuItemId, newQuantity) => {
    setOrderItems(prevItems => {
      const itemIndex = prevItems.findIndex(oi => oi.menu_item_id === menuItemId)

      if (itemIndex === -1) return prevItems

      const item = prevItems[itemIndex]

      // For staff: can modify items only if order is NOT paid yet
      // If order is paid, staff cannot modify existing items
      const isOrderPaid = currentOrder?.paid === true

      if (userType === 'staff' && item.isExisting && isOrderPaid && newQuantity < item.existingQuantity) {
        showNotificationMessage('error', 'Cannot modify items after payment. Only owners can modify paid orders.')
        return prevItems
      }

      if (userType === 'staff' && item.isExisting && isOrderPaid && newQuantity === 0) {
        showNotificationMessage('error', 'Cannot remove items after payment. Only owners can modify paid orders.')
        return prevItems
      }

      if (newQuantity === 0) {
        return prevItems.filter(oi => oi.menu_item_id !== menuItemId)
      } else {
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

  const consolidateOrderItems = (items) => {
    const consolidated = {}
    items.forEach(item => {
      const key = item.menu_item_id
      if (consolidated[key]) {
        consolidated[key].quantity += item.quantity
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
    return consolidated.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0)
  }

  // ============================================================================
  // submitOrder - Saves order to Supabase (online) or IndexedDB (offline)
  // ============================================================================
  // ONLINE FLOW:
  //   1. Consolidate items to merge duplicates
  //   2. If updating existing order: DELETE all old items, INSERT all new items
  //   3. If creating new order: INSERT order, then INSERT items
  //   4. Cache the updated order to localStorage for offline fallback
  //
  // OFFLINE FLOW:
  //   1. If updating existing Supabase order: Create pending_order_update in IndexedDB
  //      - Only saves the NEW/INCREASED items (delta from original)
  //   2. If creating new order: Create pending_order in IndexedDB
  //
  // CRITICAL: The online flow uses DELETE-then-INSERT for updates, not UPSERT
  // This ensures a clean slate and prevents orphaned items
  // ============================================================================
  const submitOrder = async () => {
    if (orderItems.length === 0) return

    // DEPLOYMENT MARKER v2 - 2026-02-26 14:15
    console.log('%c 🚀 FLOOR PLAN SUBMIT v2 - DELETE VERIFICATION ENABLED ', 'background: green; color: white; font-size: 16px;')
    console.log('========== FLOOR PLAN: SUBMITTING ORDER ==========')
    console.log('DEBUG: Raw orderItems BEFORE consolidation:', orderItems.map(i => `${i.name} x${i.quantity} (menuItemId: ${i.menu_item_id})`))
    console.log('DEBUG: orderItems length:', orderItems.length)
    const consolidatedItems = consolidateOrderItems(orderItems)
    const total = consolidatedItems.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0)
    console.log('DEBUG: Consolidated items AFTER consolidation:', consolidatedItems.map(i => `${i.name} x${i.quantity}`))
    console.log('Total:', total)

    try {
      if (currentOrder) {
        // ========== UPDATING EXISTING ORDER ==========
        console.log('Updating existing order:', currentOrder.id)

        // Staff validation: prevent reducing quantities or removing items
        if (userType === 'staff') {
          const originalItems = currentOrder.order_items || []

          // Check if any item quantity was reduced
          for (const originalItem of originalItems) {
            const newItem = consolidatedItems.find(item => item.menu_item_id === originalItem.menu_item_id)
            if (newItem && newItem.quantity < originalItem.quantity) {
              showNotificationMessage('error', 'Staff cannot reduce item quantities from placed orders. Only owners can do this.')
              return
            }
          }

          // Check if any item was removed
          for (const originalItem of originalItems) {
            const stillExists = consolidatedItems.find(item => item.menu_item_id === originalItem.menu_item_id)
            if (!stillExists) {
              showNotificationMessage('error', 'Staff cannot remove items from placed orders. Only owners can do this.')
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

        // Delete old order items
        // CRITICAL FIX: Use .select() to get deleted rows and verify deletion
        console.log('Deleting old order items for order:', currentOrder.id)
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

        // Insert new items
        // CRITICAL: Build items from consolidatedItems which is already deduplicated
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

        if (itemsError) throw itemsError

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

        // Update table status to occupied
        const { error: tableError } = await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', selectedTable.id)

        if (tableError) {
          console.error('Error updating table status:', tableError)
        }
      }

      // ========== CRITICAL: Clear all offline data for this table ==========
      // After a successful ONLINE submit, we must clear any pending offline data
      // (orders and order updates) to prevent them from being merged on next load.
      // This is the ROOT CAUSE of the duplication bug: stale offline data was being
      // merged with fresh Supabase data on each load!
      console.log('Clearing all offline data for table:', selectedTable.id)
      try {
        await clearAllOfflineOrdersForTable(selectedTable.id)
        console.log('Cleared offline orders and updates for table')
      } catch (err) {
        console.warn('Failed to clear offline data:', err)
      }

      // Close modal and reset state
      setShowOrderModal(false)
      setCurrentOrder(null)
      setOrderItems([])
      setItemNotes({})

      // Refresh floor data to update table badges/indicators
      await loadFloorData(currentFloor.id, restaurant.id)

      // ========== CACHE ORDERS FOR OFFLINE SUPPORT ==========
      // After successfully submitting an order online, cache the updated orders
      // to localStorage so they're available if the device goes offline before payment
      //
      // IMPORTANT: Use the same query filters as handleNewOrder to ensure consistency!
      // Cache key: table_orders_${tableId}
      console.log('========== CACHING ORDERS FOR OFFLINE USE ==========')
      try {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('table_id', selectedTable.id)
          // CRITICAL: Must match the filters used in handleNewOrder
          .in('status', ['pending', 'preparing', 'ready'])
          .is('paid', false)
          .order('created_at', { ascending: true })  // Ascending so oldest order is first

        console.log('Orders to cache:', ordersData?.length || 0)
        if (ordersData && ordersData.length > 0) {
          const cacheKey = `table_orders_${selectedTable.id}`
          localStorage.setItem(cacheKey, JSON.stringify(ordersData))
          console.log('Orders cached successfully to:', cacheKey)
        } else {
          // Clear cache if no orders (table was paid/cleared)
          localStorage.removeItem(`table_orders_${selectedTable.id}`)
          console.log('No orders to cache - cleared cache')
        }
      } catch (e) {
        console.warn('Failed to cache orders:', e)
      }

      console.log('========== FLOOR PLAN: ORDER SUBMITTED SUCCESSFULLY ==========')
      showNotificationMessage('success', currentOrder ? 'Order updated successfully!' : 'Order placed successfully!')
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
              showNotificationMessage('info', 'No new items to add. Reducing quantities requires internet.')
              return
            }

            totalToSave = itemsToSave.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0)

            // If this is an existing order from Supabase, store as an ORDER UPDATE
            // so items get added to the same order (not as separate orders)
            if (currentOrder.id) {
              await addPendingOrderUpdate(currentOrder.id, selectedTable.id, itemsToSave.map(item => ({
                menu_item_id: item.menu_item_id,
                name: item.name,
                quantity: item.quantity,
                price_at_time: item.price_at_time,
              })))

              // NOTE: We do NOT update localStorage cache here to avoid double-counting!
              // The cache stays as the "online state" and pending updates are the "offline delta"
              // When loading the order, we merge: cache + pending updates = full state
              // If we updated the cache here, items would be counted twice when loading

              // Recalculate table order info to include the new offline items
              // This uses getAllPendingOrderUpdatesByTable() which will include our just-added items
              await fetchTableOrderInfo(restaurant.id)

              setShowOrderModal(false)
              setCurrentOrder(null)
              setOrderItems([])
              setItemNotes({})
              showNotificationMessage('success', 'Items added to order offline. Will sync when internet is restored.')
              return
            }
          }

          // New order (or updating an offline-only order that doesn't have a real ID yet)
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

          // Update local table state to show the new order immediately
          setTableOrderInfo(prev => {
            const existing = prev[selectedTable.id] || { count: 0, total: 0, readyDepartments: [] }
            return {
              ...prev,
              [selectedTable.id]: {
                count: existing.count + (currentOrder ? 0 : 1), // Don't increment count for updates
                total: existing.total + totalToSave,
                readyDepartments: existing.readyDepartments,
              }
            }
          })

          setShowOrderModal(false)
          setCurrentOrder(null)
          setOrderItems([])
          setItemNotes({})
          const message = currentOrder
            ? 'Additional items saved offline. Will sync when internet is restored.'
            : 'Order saved offline. It will sync when internet is restored.'
          showNotificationMessage('success', message)
          return
        } catch (offlineErr) {
          console.error('Failed to save order offline:', offlineErr)
        }
      }

      console.error('Error submitting order:', error)
      showNotificationMessage('error', 'Failed to submit order. Please try again.')
    }
  }

  const handleViewOrders = () => {
    if (selectedTable) {
      router.push(`/dashboard/orders?table=${selectedTable.id}`)
    }
  }

  const handlePayBill = async () => {
    if (!selectedTable) return

    const cacheKey = `table_orders_${selectedTable.id}`

    try {
      let orders = []

      if (navigator.onLine) {
        // Online: fetch from Supabase and cache
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('table_id', selectedTable.id)
          .eq('paid', false)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        orders = ordersData || []

        // Cache the orders for offline use
        if (orders.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(orders))
          } catch (e) {
            console.warn('Failed to cache orders:', e)
          }
        }
      } else {
        // Offline: try to use cached data
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            orders = JSON.parse(cached)
          }
        } catch (e) {
          console.warn('Failed to load cached orders:', e)
        }
      }

      // Also get pending offline orders for this table
      const offlineOrders = await getPendingOrdersForTable(selectedTable.id)

      // Get pending order updates (items added to existing orders while offline)
      const pendingUpdates = await getPendingOrderUpdatesForTable(selectedTable.id)

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
      const supabaseClientIds = new Set(orders.filter(o => o.client_id).map(o => o.client_id))
      const uniqueOfflineOrders = formattedOfflineOrders.filter(o => !supabaseClientIds.has(o.client_id))

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

      if (allOrders.length === 0) {
        showNotificationMessage('info', 'No unpaid orders found for this table.')
        return
      }

      setUnpaidOrders(allOrders)
      setShowPaymentModal(true)
    } catch (err) {
      console.error('Error fetching orders:', err)
      showNotificationMessage('error', 'Failed to load orders')
    }
  }

  const calculateTableTotal = () => {
    return unpaidOrders.reduce((sum, order) => sum + (order.total || 0), 0)
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
    } else {
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
        showNotificationMessage('error', 'Only cash payments are available offline. Card payments require internet.')
        return
      }

      try {
        // Separate real order IDs from offline order client_ids
        const orderIds = unpaidOrders.filter(o => o.id && !o.client_id).map(o => o.id)
        const orderClientIds = unpaidOrders.filter(o => o.client_id).map(o => o.client_id)

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

        // Mark offline orders as paid locally
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

        // Clean up any stale offline orders for this table
        await clearPaidOfflineOrders(selectedTable.id)

        // Clear any pending order updates for this table
        await clearPendingOrderUpdates(selectedTable.id)

        // Clear the localStorage cache for this table
        localStorage.removeItem(`table_orders_${selectedTable.id}`)

        // Clear the Supabase query cache for this table's orders
        // This prevents stale cached orders from appearing when placing new orders
        clearOrdersCacheForTable(selectedTable.id)

        showNotificationMessage('success', `Cash payment of £${totalAmount.toFixed(2)} saved offline. Will sync when internet is restored.`)

        // Don't show post-payment modal for offline payments (invoice generation needs internet)
        return
      } catch (offlineErr) {
        console.error('Offline payment error:', offlineErr)
        showNotificationMessage('error', 'Failed to save offline payment. Please try again.')
        return
      }
    }

    // ONLINE PAYMENT HANDLING
    try {
      // Get order IDs - filter out offline-only orders that don't have real IDs
      const orderIds = unpaidOrders.filter(order => order.id && !order.id.toString().startsWith('offline_')).map(order => order.id)

      // Use RPC function to process payment (bypasses RLS)
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

      setShowPaymentModal(false)
      setUnpaidOrders([])
      setCompletedOrderIds(orderIds)

      // Clean up any stale offline orders for this table
      await clearPaidOfflineOrders(selectedTable.id)

      // Clear the localStorage cache for this table
      localStorage.removeItem(`table_orders_${selectedTable.id}`)

      // Refresh data
      await loadFloorData(currentFloor.id, restaurant.id)
      await fetchTableOrderInfo(restaurant.id)

      showNotificationMessage('success', `Payment of £${totalAmount.toFixed(2)} processed successfully via ${paymentMethod}!`)

      // Show post-payment modal (with invoice option)
      setShowPostPaymentModal(true)
    } catch (error) {
      console.error('Payment error:', error)
      showNotificationMessage('error', 'Failed to process payment. Please try again.')
    }
  }

  const processSplitBillPayment = async (bill, paymentMethod) => {
    if (!bill || bill.items.length === 0) {
      showNotificationMessage('error', 'No items in this bill')
      return
    }

    try {
      console.log('=== Starting split bill payment ===')
      console.log('Bill:', bill)
      console.log('Payment method:', paymentMethod)

      let userName = 'Unknown'
      let userId = null

      // Check if staff session (PIN login)
      const staffSessionData = localStorage.getItem('staff_session')
      if (staffSessionData) {
        const staffSession = JSON.parse(staffSessionData)
        userName = staffSession.name || staffSession.email || 'Staff'
        console.log('Using staff session:', userName)
      } else {
        const { data: userData } = await supabase.auth.getUser()
        userName = userData.user?.user_metadata?.name || userData.user?.email || 'Unknown'
        userId = userData.user?.id || null
        console.log('Using auth user:', userName, 'userId:', userId)
      }

      // Prepare split bill items for RPC function
      const splitBillItems = bill.items.map(item => ({
        order_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
        item_total: item.total
      }))

      console.log('Processing split bill payment via RPC:', {
        restaurant_id: restaurant.id,
        table_id: splitBillTableId,
        split_name: bill.name,
        total_amount: bill.total,
        payment_method: paymentMethod,
        paid_by: userName,
        paid_by_user_id: userId,
        items: splitBillItems
      })

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

      console.log('RPC result:', rpcResult)
      console.log('RPC error:', rpcError)

      if (rpcError) throw rpcError
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error)

      // Mark this bill as paid in the state and get updated bills
      let updatedSplitBills = []
      setSplitBills(prev => {
        updatedSplitBills = prev.map(b => b.id === bill.id ? { ...b, paid: true, paymentMethod, tableId: splitBillTableId } : b)
        return updatedSplitBills
      })

      // Don't remove items from available since they're tracked by quantity now
      // Items with quantity 0 won't show in the UI

      showNotificationMessage('success', `${bill.name} paid successfully: £${bill.total.toFixed(2)} via ${paymentMethod}`)

      // Refresh floor data immediately after each split bill payment
      await loadFloorData(currentFloor.id, restaurant.id)

      // Check if all original items have been paid (all items have 0 quantity available and no unpaid split bills)
      const remainingQuantity = availableItems.reduce((sum, item) => sum + item.quantity, 0)
      const unpaidBillsWithItems = updatedSplitBills.filter(b => !b.paid && b.items.length > 0)
      const allItemsPaid = remainingQuantity === 0 && unpaidBillsWithItems.length === 0

      console.log('Remaining quantity available:', remainingQuantity)
      console.log('Unpaid bills with items:', unpaidBillsWithItems.length)
      console.log('All items paid?', allItemsPaid)

      if (allItemsPaid) {
        // All items have been paid across all split bills - complete the order
        // Get unique order IDs from availableItems (which have orderId property)
        const allOrderIds = [...new Set(
          availableItems.map(item => item.orderId).filter(Boolean)
        )]
        console.log('Marking orders as paid:', allOrderIds)

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

          // Don't close split bill modal - let user generate invoices first
          setShowPaymentModal(false)
          setCompletedOrderIds(allOrderIds)

          // Refresh data
          await loadFloorData(currentFloor.id, restaurant.id)

          showNotificationMessage('success', 'All bills paid! You can now generate invoices for each bill.')
          // Don't show post payment modal since we're staying in split bill modal
        }
      } else {
        // Show message that partial payment was successful
        if (remainingQuantity > 0) {
          showNotificationMessage('info', `${remainingQuantity} item${remainingQuantity !== 1 ? 's' : ''} remaining to be paid`)
        }
      }
    } catch (error) {
      console.error('=== Split bill payment error ===')
      console.error('Error object:', error)
      console.error('Error message:', error?.message)
      console.error('Error code:', error?.code)
      console.error('Error details:', error?.details)
      console.error('Error hint:', error?.hint)
      console.error('Full error:', JSON.stringify(error, null, 2))
      showNotificationMessage('error', 'Failed to process payment. Please try again.')
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
      let splitBillData = invoiceSplitBillData

      // Handle split bill invoice generation
      if (splitBillData && !orderId) {
        // For split bills, we need to get one of the order IDs from the items
        const orderIds = [...new Set(splitBillData.items.map(item => item.orderId))]
        if (orderIds.length > 0) {
          orderId = orderIds[0] // Use the first order ID as base
        }
      }

      // If no specific order ID, find the most recent paid order for this table
      if (!orderId && invoiceTableId) {
        const { data: orders, error: ordersError} = await supabase
          .from('orders')
          .select('*')
          .eq('table_id', invoiceTableId)
          .eq('paid', true)
          .order('created_at', { ascending: false })
          .limit(1)

        if (ordersError) throw ordersError

        if (!orders || orders.length === 0) {
          showNotificationMessage('error', 'No paid orders found for this table')
          setGeneratingInvoice(false)
          return
        }

        orderId = orders[0].id
      }

      if (!orderId) {
        throw new Error('No order ID available')
      }

      // First, generate invoice data from API
      const generateResponse = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          clientId: clientId || null,
          clientData: clientData || null,
          splitBillData: splitBillData || null // Pass split bill data if available
        })
      })

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({}))
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
            orderId,
            clientId: clientId || null,
            clientData: clientData || null,
            splitBillData: splitBillData || null,
            pdfBase64
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to send invoice email (${emailResponse.status})`)
        }

        showNotificationMessage('success', 'Invoice sent via email successfully!')
      } else if (action === 'download') {
        // Download invoice as PDF (generated client-side)
        await downloadInvoicePdf(invoice, invoiceRestaurant)

        showNotificationMessage('success', 'Invoice downloaded successfully!')
      }

      setShowInvoiceModal(false)
      setInvoiceTableId(null)
      setInvoiceOrderId(null)
      setInvoiceSplitBillData(null) // Clear split bill data
      setShowPostPaymentModal(false)
      setSelectedTable(null)
      setUnpaidOrders([])
      setCompletedOrderIds([])
    } catch (error) {
      console.error('Invoice generation error:', error)
      showNotificationMessage('error', error.message || 'Failed to generate invoice')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const generateTimeSlots = async (selectedDate) => {
    setLoadingTimeSlots(true)
    const slots = []

    // Generate time slots from 9:00 to 23:00 in 30-minute intervals
    for (let hour = 9; hour < 23; hour++) {
      for (let minute of [0, 30]) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
        slots.push(timeString)
      }
    }

    // Fetch existing reservations for this date and table
    try {
      const { data: existingReservations, error: fetchError } = await supabase
        .from('reservations')
        .select('reservation_time, customer_name, status')
        .eq('restaurant_id', restaurant.id)
        .eq('table_id', selectedTable.id)
        .eq('reservation_date', selectedDate)
        .in('status', ['pending', 'confirmed'])

      if (fetchError) {
        console.error('Error fetching reservations:', fetchError)
      }

      console.log('Existing reservations for date', selectedDate, ':', existingReservations)

      const bookedTimes = new Set(existingReservations?.map(r => {
        // Database returns time in "HH:MM:SS" format, but we need "HH:MM"
        const timeStr = r.reservation_time
        // Remove seconds if present (09:00:00 -> 09:00)
        const normalizedTime = timeStr.substring(0, 5)
        console.log('Booked time from DB:', timeStr, '-> normalized:', normalizedTime, 'for customer:', r.customer_name)
        return normalizedTime
      }) || [])

      console.log('Booked times set:', Array.from(bookedTimes))

      // Mark slots as available or booked
      const slotsWithAvailability = slots.map(slot => ({
        time: slot,
        isBooked: bookedTimes.has(slot)
      }))

      setAvailableTimeSlots(slotsWithAvailability)
    } catch (error) {
      console.error('Error fetching reservations:', error)
      setAvailableTimeSlots(slots.map(slot => ({ time: slot, isBooked: false })))
    } finally {
      setLoadingTimeSlots(false)
    }
  }

  const handleCreateReservation = () => {
    if (selectedTable) {
      const today = new Date().toISOString().split('T')[0]
      setReservationForm({
        date: today,
        time: '',
        partySize: 2,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        specialRequests: ''
      })
      generateTimeSlots(today)
      setShowCreateReservationModal(true)
    }
  }

  const handleDateChange = (newDate) => {
    setReservationForm({ ...reservationForm, date: newDate, time: '' })
    generateTimeSlots(newDate)
  }

  const handleTimeSelect = (time) => {
    setReservationForm({ ...reservationForm, time })
    setShowTimeSlotModal(false)
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
          status: 'confirmed',
          confirmed_by_staff_name: currentUser?.email || 'Staff',
          confirmed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        // Check if it's a trigger error (double booking)
        const errorMessage = error.message || error.hint || 'Failed to create reservation'
        throw new Error(errorMessage)
      }

      // Refresh today's reservations to update the badge
      await fetchTodayReservations(restaurant.id)

      // Refresh time slots to show newly booked slot
      await generateTimeSlots(reservationForm.date)

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
      alert('Reservation created successfully!')
    } catch (error) {
      console.error('Error creating reservation:', error)
      // Display the actual error message from the database trigger
      const displayMessage = error.message || 'Failed to create reservation. Please try again.'
      alert(displayMessage)
    }
  }

  const confirmReservation = async (reservation) => {
    // For pending reservations, we need to assign them to the currently selected table
    if (!selectedTable) {
      showNotificationMessage('error', 'Table information missing')
      return
    }

    try {
      const staffSessionData = localStorage.getItem('staff_session')
      const isPinBasedLogin = !!staffSessionData

      const staffName = currentUser?.email || 'Staff'
      const userId = isPinBasedLogin ? null : currentUser?.id

      // Use RPC function to confirm reservation
      const { data, error } = await supabase.rpc('confirm_reservation', {
        p_reservation_id: reservation.id,
        p_table_id: selectedTable.id,
        p_confirmed_by_staff_name: staffName,
        p_confirmed_by_user_id: userId
      })

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to confirm reservation')
      }

      // Send confirmation email
      fetch('/api/reservations/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: reservation.id })
      }).catch(console.error)

      showNotificationMessage('success', 'Reservation confirmed successfully')

      // Refresh today's reservations to update the badge
      await fetchTodayReservations(restaurant.id)

      // Also refresh the reservations list if viewing
      if (showReservationsModal && selectedTable) {
        const updatedReservations = todayReservations[selectedTable.id] || []
        setSelectedTableReservations(updatedReservations)
      }
    } catch (error) {
      console.error('Error confirming reservation:', error)
      showNotificationMessage('error', error.message || 'Failed to confirm reservation')
    }
  }

  const openCancelReservationModal = (reservation) => {
    setSelectedReservationToCancel(reservation)
    setCancelReason('')
    setShowCancelReservationModal(true)
  }

  const cancelReservation = async () => {
    if (!cancelReason.trim()) {
      showNotificationMessage('error', 'Please provide a reason for cancellation')
      return
    }

    try {
      // Check if this is a PIN-based staff login (no real auth user)
      const staffSessionData = localStorage.getItem('staff_session')
      const isPinBasedLogin = !!staffSessionData

      const staffName = currentUser?.email || 'Staff'
      const userId = isPinBasedLogin ? null : currentUser?.id

      // Use RPC function to bypass RLS restrictions for staff
      const { data, error } = await supabase.rpc('deny_reservation', {
        p_reservation_id: selectedReservationToCancel.id,
        p_denial_reason: cancelReason,
        p_denied_by_staff_name: staffName,
        p_denied_by_user_id: userId
      })

      if (error) throw error

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to cancel reservation')
      }

      showNotificationMessage('success', 'Reservation cancelled successfully')
      setShowCancelReservationModal(false)
      setCancelReason('')
      setSelectedReservationToCancel(null)

      // Refresh today's reservations to update the badge
      await fetchTodayReservations(restaurant.id)

      // Also refresh the reservations list if viewing
      if (showReservationsModal && selectedTable) {
        const updatedReservations = selectedTableReservations.filter(
          r => r.id !== selectedReservationToCancel.id
        )
        setSelectedTableReservations(updatedReservations)
      }
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      showNotificationMessage('error', error.message || 'Failed to cancel reservation')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">Loading floor plan...</div>
      </div>
    )
  }

  if (!currentFloor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">No floor plan available yet</p>
          <p className="text-sm text-slate-500 dark:text-slate-500">Ask your manager to set up the floor plan</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Floor Plan</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{restaurant?.name}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-slate-600 dark:text-slate-400">Available</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span className="text-slate-600 dark:text-slate-400">Has Orders</span>
              </div>
            </div>
        </div>

        {/* Floor Tabs */}
        {floors.length > 1 && (
          <div className="px-4 flex gap-2 overflow-x-auto pb-0">
            {floors.map(floor => (
              <button
                key={floor.id}
                onClick={() => {
                  setCurrentFloor(floor)
                  loadFloorData(floor.id, restaurant.id)
                  setSelectedTable(null)
                }}
                className={`px-6 py-3 font-medium text-sm whitespace-nowrap transition-all border-b-2 ${
                  currentFloor?.id === floor.id
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {floor.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto p-8">
          <div
            style={{
              width: canvasWidth,
              height: canvasHeight,
              position: 'relative',
              backgroundColor: isDarkMode ? '#1e293b' : (currentFloor?.background_color || '#ffffff'),
            }}
            className="mx-auto shadow-2xl rounded-2xl border-4 border-slate-200 dark:border-slate-700"
          >
            {/* Decorative Elements */}
            {elements.map((element) => (
              <FloorPlanElement key={element.id} element={element} />
            ))}

            {/* Tables */}
            {tables.map((table) => (
              <FloorPlanTable
                key={table.id}
                table={table}
                orderInfo={tableOrderInfo[table.id]}
                reservations={todayReservations[table.id]}
                waiterCalls={waiterCalls[table.id]}
                onClick={() => handleTableClick(table)}
                onMarkCleaned={handleMarkCleaned}
                onMarkDelivered={handleMarkDelivered}
                onViewReservations={handleViewReservations}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Table Details Modal */}
      {selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setSelectedTable(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Table {selectedTable.table_number}
              </h2>
              <button
                onClick={() => setSelectedTable(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Table Info */}
            <div className="space-y-3 mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Capacity:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTable.capacity} seats</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Active Orders:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {tableOrderInfo[selectedTable.id]?.count || 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Status:</span>
                <span className={`font-semibold ${
                  tableOrderInfo[selectedTable.id]?.count > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {tableOrderInfo[selectedTable.id]?.count > 0 ? 'Occupied' : 'Available'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              <button
                onClick={handleNewOrder}
                className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {tableOrderInfo[selectedTable.id]?.count > 0 ? 'Update Order' : 'Place Order'}
              </button>

              <button
                onClick={handlePayBill}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Pay Bill
              </button>

              <button
                onClick={handleCreateReservation}
                className="w-full px-4 py-3 border-2 border-primary text-primary hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM12 13h5v5h-5z"/>
                </svg>
                New Reservation
              </button>

              {tableOrderInfo[selectedTable.id]?.count > 0 && (
                <button
                  onClick={handleViewOrders}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  View All Orders ({tableOrderInfo[selectedTable.id]?.count})
                </button>
              )}
            </div>

            {/* Active Orders List */}
            {tableOrderInfo[selectedTable.id]?.count > 0 && (
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-sm uppercase tracking-wide">
                  Active Orders
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orders
                    .filter(order => order.table_id === selectedTable.id)
                    .map(order => (
                      <div
                        key={order.id}
                        className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                            Order #{order.id.slice(0, 8)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' :
                            order.status === 'preparing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          £{order.total?.toFixed(2)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Reservations Modal */}
      {showReservationsModal && selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => {
            setShowReservationsModal(false)
            setSelectedTable(null)
            setSelectedTableReservations([])
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-2xl animate-zoom-in max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Reservations - Table {selectedTable.table_number}
              </h2>
              <button
                onClick={() => {
                  setShowReservationsModal(false)
                  setSelectedTable(null)
                  setSelectedTableReservations([])
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {selectedTableReservations.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 text-center">
                <p className="text-slate-500 dark:text-slate-400">No confirmed reservations for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedTableReservations.map((reservation) => (
                  <div key={reservation.id} className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-800 dark:text-slate-200">{reservation.customer_name}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            reservation.status === 'confirmed'
                              ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200'
                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200'
                          }`}>
                            {reservation.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                            </svg>
                            <span>{reservation.reservation_time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                            </svg>
                            <span>{reservation.party_size} {reservation.party_size === 1 ? 'guest' : 'guests'}</span>
                          </div>
                          {reservation.customer_email && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                              </svg>
                              <span>{reservation.customer_email}</span>
                            </div>
                          )}
                          {reservation.customer_phone && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                              </svg>
                              <span>{reservation.customer_phone}</span>
                            </div>
                          )}
                          {reservation.special_requests && (
                            <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800 rounded text-xs">
                              <strong>Special requests:</strong> {reservation.special_requests}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      {reservation.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmReservation(reservation)}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Confirm Reservation
                          </button>
                          <button
                            onClick={() => openCancelReservationModal(reservation)}
                            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                          >
                            Deny
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openCancelReservationModal(reservation)}
                          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                        >
                          Cancel Reservation
                        </button>
                      )}
                    </div>
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => {
            setShowCreateReservationModal(false)
            setSelectedTable(null)
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">
              Create Reservation - Table {selectedTable.table_number}
            </h2>

            <form onSubmit={submitReservation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={reservationForm.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Time
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTimeSlotModal(true)}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 dark:bg-slate-700 text-left hover:border-[#6262bd] transition-colors"
                  >
                    {reservationForm.time || 'Select time...'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Party Size
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="50"
                  value={reservationForm.partySize}
                  onChange={(e) => setReservationForm({ ...reservationForm, partySize: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={reservationForm.customerName}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 dark:bg-slate-700"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={reservationForm.customerEmail}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerEmail: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 dark:bg-slate-700"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={reservationForm.customerPhone}
                  onChange={(e) => setReservationForm({ ...reservationForm, customerPhone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 dark:bg-slate-700"
                  placeholder="+44 123 456 7890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={reservationForm.specialRequests}
                  onChange={(e) => setReservationForm({ ...reservationForm, specialRequests: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 dark:text-slate-200 dark:bg-slate-700 resize-none"
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
                  className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
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

      {/* Time Slot Picker Modal */}
      {showTimeSlotModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowTimeSlotModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Select Time Slot
              </h2>
              <button
                onClick={() => setShowTimeSlotModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {loadingTimeSlots ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd]"></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Table {selectedTable?.table_number} - {new Date(reservationForm.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                <div className="grid grid-cols-4 gap-3">
                  {availableTimeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => !slot.isBooked && handleTimeSelect(slot.time)}
                      disabled={slot.isBooked}
                      className={`py-3 px-4 rounded-xl font-medium transition-all ${
                        slot.isBooked
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-800 cursor-not-allowed line-through'
                          : reservationForm.time === slot.time
                          ? 'bg-[#6262bd] text-white border-2 border-[#6262bd]'
                          : 'border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-[#6262bd] hover:bg-[#6262bd]/10 dark:hover:bg-[#6262bd]/20'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-semibold mb-1">Time Slot Information</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <span className="line-through text-red-600 dark:text-red-400">Red slots</span> are already booked</li>
                        <li>• Available slots are shown in white</li>
                        <li>• Each reservation lasts 2 hours by default</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md animate-zoom-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Pay Bill - Table {selectedTable.table_number}
              </h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedTable(null)
                  setUnpaidOrders([])
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {unpaidOrders.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 text-center mb-6">
                <p className="text-slate-500 dark:text-slate-400">No unpaid orders for this table</p>
              </div>
            ) : (
              <>
                {/* Order Summary */}
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Orders Summary</h3>
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto">
                    {unpaidOrders.map((order, index) => (
                      <div key={order.id} className="border-b border-slate-200 dark:border-slate-700 pb-3 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Order #{index + 1}</span>
                          <span className="text-sm font-semibold text-primary">£{order.total?.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                          {order.order_items?.map((item, idx) => (
                            <div key={idx}>
                              {item.quantity}x {item.name}
                            </div>
                          ))}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Status: <span className="capitalize">{order.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-primary/10 rounded-xl p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Total to Pay</span>
                    <span className="text-2xl font-bold text-primary">£{calculateTableTotal().toFixed(2)}</span>
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
                    Pay with Cash
                  </button>
                  <button
                    onClick={() => processPayment('card')}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                    </svg>
                    Pay with Card
                  </button>

                  {/* Split Bill Option */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">or</span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        // Get existing paid split bills for this table to know what's already been paid
                        const { data: existingSplitBills, error: splitBillsError } = await supabase
                          .from('split_bills')
                          .select('*, split_bill_items(*)')
                          .eq('table_id', selectedTable.id)
                          .eq('payment_status', 'completed')

                        if (splitBillsError) throw splitBillsError

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

                        // Prepare items from unpaid orders, subtracting already paid quantities
                        const items = []
                        unpaidOrders.forEach(order => {
                          order.order_items?.forEach(item => {
                            const alreadyPaid = paidQuantities[item.id] || 0
                            const remainingQuantity = item.quantity - alreadyPaid

                            if (remainingQuantity > 0) {
                              items.push({
                                id: item.id,
                                orderId: order.id,
                                name: item.name,
                                quantity: remainingQuantity,
                                price: item.price_at_time || item.price || 0,
                                total: remainingQuantity * (item.price_at_time || item.price || 0),
                                assignedToBill: null
                              })
                            }
                          })
                        })

                        setAvailableItems(items)
                        setSplitBills([{ id: 1, name: 'Bill 1', items: [], total: 0 }])
                        setSplitBillTableId(selectedTable?.id || null) // Store table ID for this split bill session
                        setShowSplitBillModal(true)
                      } catch (err) {
                        console.error('Error opening split bill:', err)
                        if (!navigator.onLine) {
                          showNotificationMessage('error', 'Split bill is not available offline. Please connect to the internet.')
                        } else {
                          showNotificationMessage('error', 'Failed to open split bill')
                        }
                      }
                    }}
                    className="w-full bg-slate-600 text-white py-3 rounded-xl font-semibold hover:bg-slate-700 flex items-center justify-center gap-2 border-2 border-slate-400"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    Split Bill
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {showSplitBillModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-zoom-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Split Bill - Table {selectedTable?.table_number}
              </h2>
              <button
                onClick={() => {
                  // Don't clear pendingInvoiceData here - let useEffect handle it after modal closes
                  setShowSplitBillModal(false)
                  setSplitBills([{ id: 1, name: 'Bill 1', items: [], total: 0 }])
                  setAvailableItems([])
                  setSplitBillTableId(null)
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side: Available Items */}
              <div>
                <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4 mb-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Available Items</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Click on items to assign them to a bill</p>
                </div>

                <div className="space-y-2">
                  {availableItems.filter(item => item.quantity > 0).map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-xl p-4 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {item.quantity} available × £{item.price.toFixed(2)}
                          </p>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          £{(item.quantity * item.price).toFixed(2)}
                        </span>
                      </div>

                      {/* Bill Assignment Buttons with Quantity Selector - Only show unpaid bills */}
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
                              className="flex-1 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                              </svg>
                              Add to {bill.name}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {availableItems.filter(item => item.quantity > 0).length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      All items have been assigned to bills
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Split Bills */}
              <div>
                {/* Top Section - Paid Bills (Simple List) */}
                {splitBills.filter(b => b.paid).length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Paid Bills</h3>
                    <div className="space-y-2">
                      {splitBills.filter(b => b.paid).map((bill) => (
                        <div key={bill.id} className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{bill.name}</span>
                            <span className="text-slate-600 dark:text-slate-400">£{bill.total.toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => {
                              // For split bills, pass the bill data directly for invoice generation
                              setInvoiceSplitBillData({
                                billName: bill.name,
                                items: bill.items,
                                total: bill.total,
                                paymentMethod: bill.paymentMethod
                              })
                              setInvoiceTableId(bill.tableId || selectedTable?.id || null)
                              setInvoiceOrderId(null) // Clear regular order ID
                              setShowInvoiceModal(true)
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                            Create Invoice
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Section - Active Unpaid Bills */}
                <div className="space-y-4">
                  {/* Show only unpaid bills with full details */}
                  {splitBills.filter(b => !b.paid).map((bill) => (
                    <div
                      key={bill.id}
                      className="bg-white dark:bg-slate-700 border-2 border-primary/30 rounded-xl p-4"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{bill.name}</h4>
                        {splitBills.filter(b => !b.paid).length > 1 && (
                          <button
                            onClick={() => {
                              // Remove bill and return all quantities to available
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
                              <div
                                key={item.id}
                                className="flex justify-between items-center text-sm bg-slate-50 dark:bg-slate-600 rounded-lg p-2"
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{item.name}</div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400">
                                    {item.quantity} × £{item.price.toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    £{item.total.toFixed(2)}
                                  </span>
                                  <button
                                    onClick={() => {
                                      // Return 1 quantity back to available items
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

                          <div className="border-t-2 border-slate-200 dark:border-slate-600 pt-3">
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-bold text-slate-700 dark:text-slate-300">Total</span>
                              <span className="text-xl font-bold text-primary">£{bill.total.toFixed(2)}</span>
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
                                Pay £{bill.total.toFixed(2)} Cash
                              </button>
                              <button
                                onClick={() => processSplitBillPayment(bill, 'card')}
                                className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:bg-primary-hover flex items-center justify-center gap-2 text-sm"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                                </svg>
                                Pay £{bill.total.toFixed(2)} Card
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-sm">
                          No items assigned to this bill yet
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add Another Bill Button */}
                  {splitBills.some(b => b.paid) && availableItems.some(item => item.quantity > 0) && (
                    <button
                      onClick={() => {
                        const newBillId = Math.max(...splitBills.map(b => b.id), 0) + 1
                        setSplitBills([...splitBills, {
                          id: newBillId,
                          name: `Bill ${newBillId}`,
                          items: [],
                          total: 0
                        }])
                      }}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      Add Another Bill
                    </button>
                  )}
                </div>

                {/* Summary */}
                <div className="mt-4 bg-primary/10 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Original Total</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">£{calculateTableTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Assigned to Bills</span>
                    <span className="font-bold text-primary">
                      £{splitBills.reduce((sum, b) => sum + b.total, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Remaining</span>
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

      {/* Post-Payment Modal */}
      {showPostPaymentModal && restaurant?.invoice_settings?.enabled && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => {
            setShowPostPaymentModal(false)
            setSelectedTable(null)
            setUnpaidOrders([])
            setCompletedOrderIds([])
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Payment Successful!</h2>
              <p className="text-slate-600 dark:text-slate-400">Would you like to generate an invoice for this order?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const orderId = completedOrderIds[0]
                  openInvoiceModal(orderId)
                }}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
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
                className="w-full border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                No Thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Place/Update Order Modal */}
      {showOrderModal && selectedTable && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in"
          onClick={() => {
            setShowOrderModal(false)
            setSelectedTable(null)
            setCurrentOrder(null)
            setOrderItems([])
            setItemNotes({})
            setSelectedCategory(null)
            setProductSearch('')
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-6xl my-4 max-h-[90vh] flex flex-col animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                  {currentOrder ? 'Update Order' : 'Place Order'} - Table {selectedTable.table_number}
                </h2>
                {currentOrder && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Order #{(currentOrder.id || currentOrder.client_id || 'new').slice(0, 8)}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowOrderModal(false)
                  setSelectedTable(null)
                  setCurrentOrder(null)
                  setOrderItems([])
                  setItemNotes({})
                  setSelectedCategory(null)
                  setProductSearch('')
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Info banner for staff editing existing orders */}
            {currentOrder && userType === 'staff' && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Updating Existing Order</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      You can add more items or increase quantities, but cannot remove items or reduce quantities. Only restaurant owners can modify placed orders.
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
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6262bd]/50 focus:border-[#6262bd] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-700 transition-colors"
                    />
                    {productSearch && (
                      <button
                        onClick={() => setProductSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {menuItems.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 text-center">
                    <p className="text-slate-500 dark:text-slate-400">No menu items available</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Add items in the Menu tab first</p>
                  </div>
                ) : productSearch ? (
                  /* Search Results View */
                  <div className="flex-1 overflow-y-auto pr-2">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Search Results</h3>
                    {(() => {
                      const searchLower = productSearch.toLowerCase()
                      const filteredItems = menuItems.filter(item =>
                        item.name.toLowerCase().includes(searchLower) ||
                        (item.description && item.description.toLowerCase().includes(searchLower))
                      )
                      if (filteredItems.length === 0) {
                        return (
                          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 text-center">
                            <p className="text-slate-500 dark:text-slate-400">No products found</p>
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
                                  ? 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md'
                                  : 'bg-slate-100 dark:bg-slate-900 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-24 rounded-lg object-cover mb-2"
                                />
                              ) : (
                                <div className="w-full h-24 rounded-lg bg-slate-200 dark:bg-slate-700 mb-2 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm line-clamp-2">{item.name}</p>
                              <div className="mt-auto pt-2 flex items-center justify-between">
                                <span className="font-semibold text-[#6262bd]">£{item.price.toFixed(2)}</span>
                                {!item.available && (
                                  <span className="text-xs text-red-500">Unavailable</span>
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
                    <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Select a Category</h3>
                    {categories.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {categories.map(category => {
                          const categoryItems = menuItems.filter(item => item.category_id === category.id)
                          if (categoryItems.length === 0) return null
                          return (
                            <button
                              key={category.id}
                              onClick={() => setSelectedCategory(category)}
                              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 hover:from-[#6262bd]/10 hover:to-[#6262bd]/5 dark:hover:from-[#6262bd]/20 dark:hover:to-[#6262bd]/10 rounded-xl transition-all hover:shadow-md border border-slate-200 dark:border-slate-600 hover:border-[#6262bd]/30"
                            >
                              <div className="w-12 h-12 rounded-full bg-[#6262bd]/10 flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-[#6262bd]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-200 text-center">{category.name}</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'}</span>
                            </button>
                          )
                        })}
                        {/* Show uncategorized items if any */}
                        {(() => {
                          const uncategorizedItems = menuItems.filter(item => !item.category_id || !categories.find(c => c.id === item.category_id))
                          if (uncategorizedItems.length === 0) return null
                          return (
                            <button
                              onClick={() => setSelectedCategory({ id: 'uncategorized', name: 'Other' })}
                              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 hover:from-[#6262bd]/10 hover:to-[#6262bd]/5 dark:hover:from-[#6262bd]/20 dark:hover:to-[#6262bd]/10 rounded-xl transition-all hover:shadow-md border border-slate-200 dark:border-slate-600 hover:border-[#6262bd]/30"
                            >
                              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-200 text-center">Other</span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{uncategorizedItems.length} {uncategorizedItems.length === 1 ? 'item' : 'items'}</span>
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
                                ? 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md'
                                : 'bg-slate-100 dark:bg-slate-900 opacity-60 cursor-not-allowed'
                            }`}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-24 rounded-lg object-cover mb-2"
                                />
                              ) : (
                                <div className="w-full h-24 rounded-lg bg-slate-200 dark:bg-slate-700 mb-2 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm line-clamp-2">{item.name}</p>
                              <div className="mt-auto pt-2 flex items-center justify-between">
                                <span className="font-semibold text-[#6262bd]">£{item.price.toFixed(2)}</span>
                                {!item.available && (
                                  <span className="text-xs text-red-500">Unavailable</span>
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
                        Back
                      </button>
                      <h3 className="font-semibold text-slate-700 dark:text-slate-300">{selectedCategory.name}</h3>
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
                                  ? 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md'
                                  : 'bg-slate-100 dark:bg-slate-900 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-24 rounded-lg object-cover mb-2"
                                />
                              ) : (
                                <div className="w-full h-24 rounded-lg bg-slate-200 dark:bg-slate-700 mb-2 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm line-clamp-2">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                              )}
                              <div className="mt-auto pt-2 flex items-center justify-between">
                                <span className="font-semibold text-[#6262bd]">£{item.price.toFixed(2)}</span>
                                {!item.available && (
                                  <span className="text-xs text-red-500">Unavailable</span>
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
                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">Order Summary</h3>
                {orderItems.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 text-center">
                    <p className="text-slate-500 dark:text-slate-400">No items added yet</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-4 max-h-64 overflow-y-auto">
                      {orderItems.map((item) => {
                        const newQuantity = item.isExisting ? item.quantity - item.existingQuantity : item.quantity
                        const hasNewItems = newQuantity > 0
                        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id)
                        const requiresInstructions = menuItem?.requires_special_instructions
                        const instructionsLabel = menuItem?.special_instructions_label || 'Special instructions'

                        return (
                          <div key={item.menu_item_id} className={`mb-3 last:mb-0 rounded-lg p-2 ${item.isExisting ? 'bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">{item.quantity}x {item.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">£{item.price_at_time.toFixed(2)} each</p>

                                {item.isExisting && hasNewItems && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                    {item.existingQuantity} existing + {newQuantity} new
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
                                      className="w-full px-2 py-1 text-xs border border-amber-200 dark:border-amber-700 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 placeholder-amber-400 dark:placeholder-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                                    />
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {userType === 'owner' || !currentOrder ? (
                                  <>
                                    <button
                                      onClick={() => updateItemQuantity(item.menu_item_id, item.quantity - 1)}
                                      className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                                    >
                                      -
                                    </button>
                                    <span className="w-8 text-center font-medium text-slate-800 dark:text-slate-200">{item.quantity}</span>
                                    <button
                                      onClick={() => updateItemQuantity(item.menu_item_id, item.quantity + 1)}
                                      className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
                                    >
                                      +
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => updateItemQuantity(item.menu_item_id, item.quantity - 1)}
                                      disabled={currentOrder?.paid === true && item.isExisting && item.quantity <= item.existingQuantity}
                                      className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                                    >
                                      -
                                    </button>
                                    <span className="w-8 text-center font-medium text-slate-800 dark:text-slate-200">{item.quantity}</span>
                                    <button
                                      onClick={() => updateItemQuantity(item.menu_item_id, item.quantity + 1)}
                                      className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 flex items-center justify-center transition-colors"
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

                    <div className="bg-primary/10 rounded-xl p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Total</span>
                        <span className="text-xl font-bold text-primary">£{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={submitOrder}
                      className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover"
                    >
                      {currentOrder ? 'Update Order' : 'Place Order'}
                    </button>
                  </>
                )}
              </div>
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
            setInvoiceSplitBillData(null)
          }}
          isGenerating={generatingInvoice}
        />
      )}

      {/* Cancel Reservation Modal */}
      {showCancelReservationModal && selectedReservationToCancel && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => {
            setShowCancelReservationModal(false)
            setSelectedReservationToCancel(null)
            setCancelReason('')
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              Cancel Reservation
            </h2>

            <div className="mb-6">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                Cancelling reservation for <strong>{selectedReservationToCancel.customer_name}</strong>
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                {selectedReservationToCancel.reservation_time} - {selectedReservationToCancel.party_size} {selectedReservationToCancel.party_size === 1 ? 'guest' : 'guests'}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Reason for Cancellation *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancelling this reservation..."
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-xl focus:outline-none focus:border-red-500 resize-none"
                rows="4"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelReservationModal(false)
                  setSelectedReservationToCancel(null)
                  setCancelReason('')
                }}
                className="flex-1 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Keep Reservation
              </button>
              <button
                onClick={cancelReservation}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-medium"
              >
                Cancel Reservation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-fade-in">
          <div className={`px-6 py-4 rounded-xl shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-600 text-white'
              : notification.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            <div className="flex items-center gap-3">
              {notification.type === 'success' && (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
              {notification.type === 'error' && (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
