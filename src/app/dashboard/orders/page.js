'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import InvoiceClientModal from '@/components/invoices/InvoiceClientModal'

export default function Orders() {
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

      // Set up real-time subscription
      const channel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `restaurant_id=eq.${restaurantData.id}`
          },
          () => {
            fetchOrders(restaurantData.id)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    fetchData()
  }, [])

  const fetchOrders = async (restaurantId) => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        tables (table_number),
        order_items (*)
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

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

  const handleInvoiceGeneration = async ({ clientId, clientData, action }) => {
    if (!invoiceOrderId) return

    setGeneratingInvoice(true)

    try {
      if (action === 'email') {
        // Send invoice via email
        const response = await fetch('/api/invoices/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: invoiceOrderId,
            clientId,
            clientData
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `Failed to send invoice email (${response.status})`)
        }

        const result = await response.json()

        // Close modal
        setShowInvoiceModal(false)
        setInvoiceOrderId(null)
        showNotification('success', `Invoice emailed successfully to ${clientData.email}!`)
      } else {
        // Download invoice as PDF
        const response = await fetch('/api/invoices/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: invoiceOrderId,
            clientId,
            clientData
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `Failed to generate invoice (${response.status})`)
        }

        // Download PDF
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url

        const contentDisposition = response.headers.get('content-disposition')
        let filename = 'invoice.pdf'
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/)
          if (filenameMatch) filename = filenameMatch[1]
        }

        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        // Close modal
        setShowInvoiceModal(false)
        setInvoiceOrderId(null)
        showNotification('success', 'Invoice generated and downloaded successfully!')
      }
    } catch (error) {
      console.error('Invoice generation error:', error)
      showNotification('error', error.message || 'Failed to generate invoice')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'active') return ['pending', 'preparing'].includes(order.status) && !order.paid && order.status !== 'cancelled'
    if (filter === 'completed') return order.status === 'completed' || order.paid
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
    return <div className="text-slate-500">Loading orders...</div>
  }

  return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
            <p className="text-slate-500">Manage incoming orders in real-time</p>
          </div>
        </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['active', 'completed', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl font-medium capitalize ${
              filter === f
                ? 'bg-[#6262bd] text-white'
                : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
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
            {filter === 'active' ? 'There are currently no active orders.' : `No ${filter} orders`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const filteredItems = filterOrderItems(order.order_items)
            // Skip orders with no relevant items for this department
            if (filteredItems.length === 0 && staffDepartment && staffDepartment !== 'universal' && userType !== 'owner') {
              return null
            }

            return (
            <div key={order.id} className="bg-white border-2 border-slate-100 rounded-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-slate-800">
                      Table {order.tables?.table_number || 'N/A'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm">
                    Order #{order.id.slice(0, 8)} • {formatTime(order.created_at)}
                  </p>
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
                  <p className="text-sm text-amber-700"><strong>Note:</strong> {order.notes}</p>
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
                      <p className="text-sm font-semibold text-green-700">PAID</p>
                    </div>
                    <div className="text-xs text-green-600 space-y-0.5">
                      <p>Method: <span className="font-medium capitalize">{order.payment_method}</span></p>
                      <p>Processed by: <span className="font-medium">{order.payment_taken_by_name || 'Staff'}</span></p>
                      {order.payment_taken_at && (
                        <p>Time: {new Date(order.payment_taken_at).toLocaleString()}</p>
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
                      Generate Invoice
                    </button>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {!order.paid && (
                <div className="flex gap-3">
                  {order.status === 'pending' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'preparing')}
                    className="bg-[#6262bd] text-white px-4 py-2 rounded-xl font-medium hover:bg-[#5252a3]"
                  >
                    Start Preparing
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700"
                  >
                    Mark Ready
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'completed')}
                    className="bg-slate-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-slate-700"
                  >
                    Complete Order
                  </button>
                )}
                  {userType === 'owner' && ['pending', 'preparing'].includes(order.status) && (
                    <button
                      onClick={() => confirmCancelOrder(order)}
                      className="border-2 border-red-200 text-red-600 px-4 py-2 rounded-xl font-medium hover:bg-red-50"
                    >
                      Cancel
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
            <h2 className="text-xl font-bold text-slate-800 mb-4">Cancel Order?</h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to cancel order from Table {orderToCancel.tables?.table_number}?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setOrderToCancel(null)
                }}
                className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
              >
                No, Keep Order
              </button>
              <button
                onClick={cancelOrder}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700"
              >
                Yes, Cancel Order
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