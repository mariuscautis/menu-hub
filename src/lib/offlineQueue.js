/**
 * Offline Queue - IndexedDB-based order queue for offline support.
 *
 * Stores orders locally when the device is offline and provides
 * methods to retrieve and manage them for syncing when back online.
 */

const DB_NAME = 'menuhub-offline'
const DB_VERSION = 1
const ORDERS_STORE = 'pending_orders'
const ORDER_ITEMS_STORE = 'pending_order_items'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // Pending orders store
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        const orderStore = db.createObjectStore(ORDERS_STORE, { keyPath: 'client_id' })
        orderStore.createIndex('sync_status', 'sync_status', { unique: false })
        orderStore.createIndex('created_at', 'created_at', { unique: false })
        orderStore.createIndex('restaurant_id', 'restaurant_id', { unique: false })
      }

      // Pending order items store (linked to orders by client_id)
      if (!db.objectStoreNames.contains(ORDER_ITEMS_STORE)) {
        const itemsStore = db.createObjectStore(ORDER_ITEMS_STORE, { keyPath: 'id', autoIncrement: true })
        itemsStore.createIndex('order_client_id', 'order_client_id', { unique: false })
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
