/**
 * Offline Queue - IndexedDB-based order queue for offline support.
 *
 * Stores orders locally when the device is offline and provides
 * methods to retrieve and manage them for syncing when back online.
 * Also handles offline cash payments.
 */

const DB_NAME = 'menuhub-offline'
const DB_VERSION = 3 // Incremented for pending_order_updates store
const ORDERS_STORE = 'pending_orders'
const ORDER_ITEMS_STORE = 'pending_order_items'
const PAYMENTS_STORE = 'pending_payments'
const ORDER_UPDATES_STORE = 'pending_order_updates'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      const oldVersion = event.oldVersion

      // Pending orders store
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        const orderStore = db.createObjectStore(ORDERS_STORE, { keyPath: 'client_id' })
        orderStore.createIndex('sync_status', 'sync_status', { unique: false })
        orderStore.createIndex('created_at', 'created_at', { unique: false })
        orderStore.createIndex('restaurant_id', 'restaurant_id', { unique: false })
        orderStore.createIndex('table_id', 'table_id', { unique: false })
      } else if (oldVersion < 2) {
        // Add table_id index if upgrading from v1
        const tx = event.target.transaction
        const orderStore = tx.objectStore(ORDERS_STORE)
        if (!orderStore.indexNames.contains('table_id')) {
          orderStore.createIndex('table_id', 'table_id', { unique: false })
        }
      }

      // Pending order items store (linked to orders by client_id)
      if (!db.objectStoreNames.contains(ORDER_ITEMS_STORE)) {
        const itemsStore = db.createObjectStore(ORDER_ITEMS_STORE, { keyPath: 'id', autoIncrement: true })
        itemsStore.createIndex('order_client_id', 'order_client_id', { unique: false })
      }

      // Pending payments store (for offline cash payments)
      if (!db.objectStoreNames.contains(PAYMENTS_STORE)) {
        const paymentsStore = db.createObjectStore(PAYMENTS_STORE, { keyPath: 'payment_id' })
        paymentsStore.createIndex('sync_status', 'sync_status', { unique: false })
        paymentsStore.createIndex('created_at', 'created_at', { unique: false })
        paymentsStore.createIndex('table_id', 'table_id', { unique: false })
      }

      // Pending order updates store (for adding items to existing orders offline)
      if (!db.objectStoreNames.contains(ORDER_UPDATES_STORE)) {
        const updatesStore = db.createObjectStore(ORDER_UPDATES_STORE, { keyPath: 'update_id' })
        updatesStore.createIndex('order_id', 'order_id', { unique: false })
        updatesStore.createIndex('sync_status', 'sync_status', { unique: false })
        updatesStore.createIndex('table_id', 'table_id', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Generate a UUID v4 for client-side order identification.
 */
export function generateClientId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Add an order to the offline queue.
 * @param {Object} orderData - The order data (matches Supabase orders table schema)
 * @param {Array} orderItems - Array of order item objects
 * @returns {string} The client_id assigned to this order
 */
export async function addPendingOrder(orderData, orderItems) {
  const db = await openDB()
  const clientId = generateClientId()

  const order = {
    client_id: clientId,
    sync_status: 'pending', // 'pending' | 'syncing' | 'synced' | 'failed'
    retry_count: 0,
    created_at: new Date().toISOString(),
    last_sync_attempt: null,
    error_message: null,
    // Actual order data
    restaurant_id: orderData.restaurant_id,
    table_id: orderData.table_id || null,
    total: orderData.total,
    customer_name: orderData.customer_name,
    customer_email: orderData.customer_email,
    customer_phone: orderData.customer_phone || null,
    notes: orderData.notes || null,
    status: orderData.status || 'pending',
    order_type: orderData.order_type || 'takeaway',
    pickup_code: orderData.pickup_code,
    locale: orderData.locale || 'en',
  }

  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readwrite')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)

  orderStore.add(order)

  for (const item of orderItems) {
    itemsStore.add({
      order_client_id: clientId,
      menu_item_id: item.menu_item_id || item.id,
      name: item.name,
      quantity: item.quantity,
      price_at_time: item.price_at_time || item.price,
    })
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve(clientId)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Update an existing pending order in IndexedDB (add items and update total).
 * Use this when adding items to an order that was created offline.
 * @param {string} clientId - The client_id of the existing offline order
 * @param {Array} newItems - New items to add to the order
 * @param {number} additionalTotal - Amount to add to the order total
 * @returns {boolean} True if successful
 */
export async function updatePendingOrder(clientId, newItems, additionalTotal) {
  const db = await openDB()
  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readwrite')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)

  // Get the existing order
  const getRequest = orderStore.get(clientId)

  return new Promise((resolve, reject) => {
    getRequest.onsuccess = () => {
      const order = getRequest.result
      if (!order) {
        db.close()
        reject(new Error(`Order with client_id ${clientId} not found`))
        return
      }

      // Update the order total
      order.total = (order.total || 0) + additionalTotal
      orderStore.put(order)

      // Add the new items
      for (const item of newItems) {
        itemsStore.add({
          order_client_id: clientId,
          menu_item_id: item.menu_item_id || item.id,
          name: item.name,
          quantity: item.quantity,
          price_at_time: item.price_at_time || item.price,
        })
      }
    }

    getRequest.onerror = () => {
      db.close()
      reject(getRequest.error)
    }

    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }

    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Get all pending orders (not yet synced).
 * @param {string} [restaurantId] - Optional filter by restaurant
 * @returns {Array} Array of pending order objects
 */
export async function getPendingOrders(restaurantId) {
  const db = await openDB()
  const tx = db.transaction(ORDERS_STORE, 'readonly')
  const store = tx.objectStore(ORDERS_STORE)
  const index = store.index('sync_status')
  const request = index.getAll('pending')

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      let results = request.result || []
      if (restaurantId) {
        results = results.filter(o => o.restaurant_id === restaurantId)
      }
      db.close()
      resolve(results)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Get all orders that need syncing (pending or failed with retries left).
 * @returns {Array} Orders to sync
 */
export async function getOrdersToSync() {
  const db = await openDB()
  const tx = db.transaction(ORDERS_STORE, 'readonly')
  const store = tx.objectStore(ORDERS_STORE)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const all = request.result || []
      const toSync = all.filter(o =>
        o.sync_status === 'pending' ||
        (o.sync_status === 'failed' && o.retry_count < 5)
      )
      db.close()
      resolve(toSync)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Get order items for a specific pending order.
 * @param {string} clientId - The client_id of the order
 * @returns {Array} Order items
 */
export async function getOrderItems(clientId) {
  const db = await openDB()
  const tx = db.transaction(ORDER_ITEMS_STORE, 'readonly')
  const store = tx.objectStore(ORDER_ITEMS_STORE)
  const index = store.index('order_client_id')
  const request = index.getAll(clientId)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      db.close()
      resolve(request.result || [])
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Update the sync status of an order.
 * @param {string} clientId
 * @param {string} status - 'pending' | 'syncing' | 'synced' | 'failed'
 * @param {string} [errorMessage]
 */
export async function updateSyncStatus(clientId, status, errorMessage = null) {
  const db = await openDB()
  const tx = db.transaction(ORDERS_STORE, 'readwrite')
  const store = tx.objectStore(ORDERS_STORE)
  const request = store.get(clientId)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const order = request.result
      if (!order) {
        db.close()
        resolve(false)
        return
      }

      order.sync_status = status
      order.last_sync_attempt = new Date().toISOString()
      if (status === 'failed') {
        order.retry_count = (order.retry_count || 0) + 1
        order.error_message = errorMessage
      }
      if (status === 'synced') {
        order.error_message = null
      }

      const putRequest = store.put(order)
      putRequest.onsuccess = () => {
        db.close()
        resolve(true)
      }
      putRequest.onerror = () => {
        db.close()
        reject(putRequest.error)
      }
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Remove a synced order from IndexedDB (cleanup).
 * @param {string} clientId
 */
export async function removeSyncedOrder(clientId) {
  const db = await openDB()
  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readwrite')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)

  // Delete order
  orderStore.delete(clientId)

  // Delete associated items
  const itemsIndex = itemsStore.index('order_client_id')
  const itemsRequest = itemsIndex.getAllKeys(clientId)
  itemsRequest.onsuccess = () => {
    for (const key of itemsRequest.result) {
      itemsStore.delete(key)
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Get the count of pending (unsynced) orders.
 * @returns {number}
 */
export async function getPendingCount() {
  const db = await openDB()
  const tx = db.transaction(ORDERS_STORE, 'readonly')
  const store = tx.objectStore(ORDERS_STORE)
  const index = store.index('sync_status')
  const request = index.count('pending')

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      // Also count failed orders (they're still unsynced)
      const pendingCount = request.result
      const failedRequest = index.count('failed')
      failedRequest.onsuccess = () => {
        db.close()
        resolve(pendingCount + failedRequest.result)
      }
      failedRequest.onerror = () => {
        db.close()
        resolve(pendingCount)
      }
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Clear all synced orders (housekeeping).
 */
export async function clearSyncedOrders() {
  const db = await openDB()
  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readwrite')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)
  const index = orderStore.index('sync_status')
  const request = index.getAllKeys('synced')

  request.onsuccess = () => {
    for (const key of request.result) {
      orderStore.delete(key)
      // Clean up items
      const itemsIndex = itemsStore.index('order_client_id')
      const itemsReq = itemsIndex.getAllKeys(key)
      itemsReq.onsuccess = () => {
        for (const itemKey of itemsReq.result) {
          itemsStore.delete(itemKey)
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Clear all paid offline orders (both synced and locally paid).
 * Call this after processing payment to clean up stale data.
 * @param {string} [tableId] - Optional: only clear orders for this table
 */
export async function clearPaidOfflineOrders(tableId = null) {
  const db = await openDB()
  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readwrite')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)
  const request = orderStore.getAll()

  request.onsuccess = () => {
    const orders = request.result || []
    for (const order of orders) {
      // Skip if table filter is set and doesn't match
      if (tableId && order.table_id !== tableId) continue

      // Remove orders that are synced OR paid offline
      if (order.sync_status === 'synced' || order.paid_offline) {
        orderStore.delete(order.client_id)
        // Clean up items
        const itemsIndex = itemsStore.index('order_client_id')
        const itemsReq = itemsIndex.getAllKeys(order.client_id)
        itemsReq.onsuccess = () => {
          for (const itemKey of itemsReq.result) {
            itemsStore.delete(itemKey)
          }
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Aggressively clear ALL offline orders for a specific table.
 * Call this after payment to ensure no stale orders remain.
 * This removes ALL orders regardless of their sync/paid status.
 * @param {string} tableId - The table ID to clear orders for
 */
export async function clearAllOfflineOrdersForTable(tableId) {
  if (!tableId) return

  const db = await openDB()
  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE, ORDER_UPDATES_STORE], 'readwrite')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)
  const updatesStore = tx.objectStore(ORDER_UPDATES_STORE)

  // Get and remove all orders for this table
  const ordersRequest = orderStore.getAll()
  ordersRequest.onsuccess = () => {
    const orders = ordersRequest.result || []
    for (const order of orders) {
      if (order.table_id === tableId) {
        orderStore.delete(order.client_id)
        // Clean up items for this order
        const itemsIndex = itemsStore.index('order_client_id')
        const itemsReq = itemsIndex.getAllKeys(order.client_id)
        itemsReq.onsuccess = () => {
          for (const itemKey of itemsReq.result) {
            itemsStore.delete(itemKey)
          }
        }
      }
    }
  }

  // Also clear any pending order updates for this table
  const updatesIndex = updatesStore.index('table_id')
  const updatesRequest = updatesIndex.getAllKeys(tableId)
  updatesRequest.onsuccess = () => {
    for (const key of updatesRequest.result || []) {
      updatesStore.delete(key)
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      console.log(`[OfflineQueue] Cleared all offline orders for table ${tableId}`)
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

// ============================================================================
// OFFLINE CASH PAYMENTS
// ============================================================================

/**
 * Add a pending cash payment to the offline queue.
 * This marks orders as paid locally and queues the payment for sync.
 * @param {Object} paymentData - Payment details
 * @returns {string} The payment_id assigned
 */
export async function addPendingPayment(paymentData) {
  const db = await openDB()
  const paymentId = generateClientId()

  const payment = {
    payment_id: paymentId,
    sync_status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
    last_sync_attempt: null,
    error_message: null,
    // Payment data
    restaurant_id: paymentData.restaurant_id,
    table_id: paymentData.table_id,
    order_ids: paymentData.order_ids || [], // Real order IDs from DB
    order_client_ids: paymentData.order_client_ids || [], // Offline order client_ids
    total_amount: paymentData.total_amount,
    payment_method: 'cash', // Only cash works offline
    staff_name: paymentData.staff_name || 'Staff',
    user_id: paymentData.user_id || null,
  }

  const tx = db.transaction(PAYMENTS_STORE, 'readwrite')
  const store = tx.objectStore(PAYMENTS_STORE)
  store.add(payment)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve(paymentId)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Get all payments that need syncing.
 * @returns {Array} Payments to sync
 */
export async function getPaymentsToSync() {
  const db = await openDB()
  const tx = db.transaction(PAYMENTS_STORE, 'readonly')
  const store = tx.objectStore(PAYMENTS_STORE)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const all = request.result || []
      const toSync = all.filter(p =>
        p.sync_status === 'pending' ||
        (p.sync_status === 'failed' && p.retry_count < 5)
      )
      db.close()
      resolve(toSync)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Update the sync status of a payment.
 * @param {string} paymentId
 * @param {string} status
 * @param {string} [errorMessage]
 */
export async function updatePaymentSyncStatus(paymentId, status, errorMessage = null) {
  const db = await openDB()
  const tx = db.transaction(PAYMENTS_STORE, 'readwrite')
  const store = tx.objectStore(PAYMENTS_STORE)
  const request = store.get(paymentId)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const payment = request.result
      if (!payment) {
        db.close()
        resolve(false)
        return
      }

      payment.sync_status = status
      payment.last_sync_attempt = new Date().toISOString()
      if (status === 'failed') {
        payment.retry_count = (payment.retry_count || 0) + 1
        payment.error_message = errorMessage
      }
      if (status === 'synced') {
        payment.error_message = null
      }

      const putRequest = store.put(payment)
      putRequest.onsuccess = () => {
        db.close()
        resolve(true)
      }
      putRequest.onerror = () => {
        db.close()
        reject(putRequest.error)
      }
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Remove a synced payment from IndexedDB.
 * @param {string} paymentId
 */
export async function removeSyncedPayment(paymentId) {
  const db = await openDB()
  const tx = db.transaction(PAYMENTS_STORE, 'readwrite')
  const store = tx.objectStore(PAYMENTS_STORE)
  store.delete(paymentId)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Get pending payments for a specific table (to check if table has been paid offline).
 * @param {string} tableId
 * @returns {Array} Pending payments for this table
 */
export async function getPendingPaymentsForTable(tableId) {
  const db = await openDB()
  const tx = db.transaction(PAYMENTS_STORE, 'readonly')
  const store = tx.objectStore(PAYMENTS_STORE)
  const index = store.index('table_id')
  const request = index.getAll(tableId)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const payments = request.result || []
      // Return only unsynced payments
      const pending = payments.filter(p => p.sync_status !== 'synced')
      db.close()
      resolve(pending)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

// ============================================================================
// OFFLINE ORDER TRACKING FOR TABLE STATE
// ============================================================================

/**
 * Get all pending (unsynced) orders for a specific table.
 * Used to show correct table state when offline.
 * @param {string} tableId
 * @returns {Array} Pending orders for this table with their items
 */
export async function getPendingOrdersForTable(tableId) {
  const db = await openDB()
  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readonly')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)

  const ordersRequest = orderStore.getAll()

  return new Promise((resolve, reject) => {
    ordersRequest.onsuccess = async () => {
      const allOrders = ordersRequest.result || []
      // Filter by table_id and only include unsynced orders that aren't paid
      const tableOrders = allOrders.filter(o =>
        o.table_id === tableId &&
        o.sync_status !== 'synced' &&
        !o.paid_offline
      )

      // Get items for each order
      const ordersWithItems = []
      for (const order of tableOrders) {
        const itemsIndex = itemsStore.index('order_client_id')
        const itemsRequest = itemsIndex.getAll(order.client_id)
        await new Promise((res) => {
          itemsRequest.onsuccess = () => {
            ordersWithItems.push({
              ...order,
              order_items: itemsRequest.result || []
            })
            res()
          }
          itemsRequest.onerror = () => res()
        })
      }

      db.close()
      resolve(ordersWithItems)
    }
    ordersRequest.onerror = () => {
      db.close()
      reject(ordersRequest.error)
    }
  })
}

/**
 * Mark offline orders as paid locally (before syncing).
 * This updates the order in IndexedDB to reflect that payment was processed offline.
 * @param {Array} clientIds - Array of client_ids to mark as paid
 */
export async function markOrdersPaidOffline(clientIds) {
  const db = await openDB()
  const tx = db.transaction(ORDERS_STORE, 'readwrite')
  const store = tx.objectStore(ORDERS_STORE)

  for (const clientId of clientIds) {
    const request = store.get(clientId)
    request.onsuccess = () => {
      const order = request.result
      if (order) {
        order.paid_offline = true
        order.paid_at = new Date().toISOString()
        store.put(order)
      }
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Get all pending (unpaid) orders grouped by table ID.
 * Used by fetchTableOrderInfo to merge offline orders with Supabase data.
 * @returns {Object} Map of tableId -> { count, total }
 */
export async function getAllPendingOrdersByTable() {
  const db = await openDB()
  const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readonly')
  const orderStore = tx.objectStore(ORDERS_STORE)
  const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)

  const ordersRequest = orderStore.getAll()

  return new Promise((resolve, reject) => {
    ordersRequest.onsuccess = async () => {
      const allOrders = ordersRequest.result || []
      // Filter: only unsynced orders that aren't paid offline
      const pendingOrders = allOrders.filter(o =>
        o.table_id &&
        o.sync_status !== 'synced' &&
        !o.paid_offline
      )

      // Group by table and calculate totals
      const ordersByTable = {}
      for (const order of pendingOrders) {
        if (!ordersByTable[order.table_id]) {
          ordersByTable[order.table_id] = {
            count: 0,
            total: 0,
            readyDepartments: [], // Offline orders aren't ready yet
            orders: []
          }
        }
        ordersByTable[order.table_id].count += 1
        ordersByTable[order.table_id].total += order.total || 0
        ordersByTable[order.table_id].orders.push(order)
      }

      db.close()
      resolve(ordersByTable)
    }
    ordersRequest.onerror = () => {
      db.close()
      reject(ordersRequest.error)
    }
  })
}

/**
 * Get all pending order updates grouped by table ID.
 * Used by fetchTableOrderInfo to include offline-added items in totals.
 * @returns {Object} Map of tableId -> { total, updates: [...] }
 */
export async function getAllPendingOrderUpdatesByTable() {
  const db = await openDB()
  const tx = db.transaction(ORDER_UPDATES_STORE, 'readonly')
  const store = tx.objectStore(ORDER_UPDATES_STORE)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const allUpdates = request.result || []
      // Filter: only unsynced updates
      const pendingUpdates = allUpdates.filter(u => u.sync_status !== 'synced')

      // Group by table
      const updatesByTable = {}
      for (const update of pendingUpdates) {
        if (!update.table_id) continue

        if (!updatesByTable[update.table_id]) {
          updatesByTable[update.table_id] = {
            total: 0,
            updates: []
          }
        }
        updatesByTable[update.table_id].total += update.total_to_add || 0
        updatesByTable[update.table_id].updates.push(update)
      }

      db.close()
      resolve(updatesByTable)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Get pending payment count (for UI indicator).
 * @returns {number}
 */
export async function getPendingPaymentCount() {
  const db = await openDB()
  const tx = db.transaction(PAYMENTS_STORE, 'readonly')
  const store = tx.objectStore(PAYMENTS_STORE)
  const index = store.index('sync_status')
  const request = index.count('pending')

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const pendingCount = request.result
      const failedRequest = index.count('failed')
      failedRequest.onsuccess = () => {
        db.close()
        resolve(pendingCount + failedRequest.result)
      }
      failedRequest.onerror = () => {
        db.close()
        resolve(pendingCount)
      }
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

// ============================================================================
// OFFLINE ORDER UPDATES (adding items to existing orders)
// ============================================================================

/**
 * Add a pending update to an existing order (adding items offline).
 * @param {string} orderId - The original order ID from Supabase
 * @param {string} tableId - The table ID
 * @param {Array} itemsToAdd - Items to add to the order
 * @returns {string} The update_id
 */
export async function addPendingOrderUpdate(orderId, tableId, itemsToAdd) {
  const db = await openDB()
  const updateId = generateClientId()

  const update = {
    update_id: updateId,
    order_id: orderId,
    table_id: tableId,
    items: itemsToAdd,
    total_to_add: itemsToAdd.reduce((sum, item) => sum + (item.price_at_time * item.quantity), 0),
    sync_status: 'pending',
    created_at: new Date().toISOString(),
  }

  const tx = db.transaction(ORDER_UPDATES_STORE, 'readwrite')
  const store = tx.objectStore(ORDER_UPDATES_STORE)
  store.add(update)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve(updateId)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Get all pending order updates for a table.
 * Used to merge with cached orders when displaying for payment.
 * @param {string} tableId
 * @returns {Array} Pending updates grouped by order_id
 */
export async function getPendingOrderUpdatesForTable(tableId) {
  const db = await openDB()
  const tx = db.transaction(ORDER_UPDATES_STORE, 'readonly')
  const store = tx.objectStore(ORDER_UPDATES_STORE)
  const index = store.index('table_id')
  const request = index.getAll(tableId)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const updates = (request.result || []).filter(u => u.sync_status !== 'synced')
      db.close()
      resolve(updates)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Get all pending order updates to sync.
 * @returns {Array}
 */
export async function getOrderUpdatesToSync() {
  const db = await openDB()
  const tx = db.transaction(ORDER_UPDATES_STORE, 'readonly')
  const store = tx.objectStore(ORDER_UPDATES_STORE)
  const request = store.getAll()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const all = request.result || []
      const toSync = all.filter(u =>
        u.sync_status === 'pending' ||
        (u.sync_status === 'failed' && (u.retry_count || 0) < 5)
      )
      db.close()
      resolve(toSync)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Update the sync status of an order update.
 */
export async function updateOrderUpdateSyncStatus(updateId, status, errorMessage = null) {
  const db = await openDB()
  const tx = db.transaction(ORDER_UPDATES_STORE, 'readwrite')
  const store = tx.objectStore(ORDER_UPDATES_STORE)
  const request = store.get(updateId)

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const update = request.result
      if (!update) {
        db.close()
        resolve(false)
        return
      }

      update.sync_status = status
      if (status === 'failed') {
        update.retry_count = (update.retry_count || 0) + 1
        update.error_message = errorMessage
      }

      const putRequest = store.put(update)
      putRequest.onsuccess = () => {
        db.close()
        resolve(true)
      }
      putRequest.onerror = () => {
        db.close()
        reject(putRequest.error)
      }
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/**
 * Remove a synced order update.
 */
export async function removeSyncedOrderUpdate(updateId) {
  const db = await openDB()
  const tx = db.transaction(ORDER_UPDATES_STORE, 'readwrite')
  const store = tx.objectStore(ORDER_UPDATES_STORE)
  store.delete(updateId)

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve(true)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Clear all pending order updates for a table (after payment).
 */
export async function clearPendingOrderUpdates(tableId) {
  const db = await openDB()
  const tx = db.transaction(ORDER_UPDATES_STORE, 'readwrite')
  const store = tx.objectStore(ORDER_UPDATES_STORE)
  const index = store.index('table_id')
  const request = index.getAllKeys(tableId)

  request.onsuccess = () => {
    for (const key of request.result) {
      store.delete(key)
    }
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}
