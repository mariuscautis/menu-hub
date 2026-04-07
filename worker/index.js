/**
 * Custom Service Worker extension for Background Sync.
 *
 * This file is merged into the auto-generated sw.js by next-pwa
 * via the customWorkerDir option. It adds Background Sync support
 * so that offline orders are pushed to the server when connectivity
 * returns, even if the user has closed the tab.
 */

// When skipWaiting activates a new SW, immediately claim all open clients so
// every tab is controlled by the new worker. Without this, a tab opened under
// the old SW keeps using the old fetch handlers even after the new SW activates,
// which can result in stale cached HTML referencing old JS chunk hashes.
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

const DB_NAME = 'menuhub-offline'
const DB_VERSION = 3
const ORDERS_STORE = 'pending_orders'
const ORDER_ITEMS_STORE = 'pending_order_items'
const PAYMENTS_STORE = 'pending_payments'
const ORDER_UPDATES_STORE = 'pending_order_updates'

// Supabase config - set via message from the main thread
let SUPABASE_URL = ''
let SUPABASE_KEY = ''

// Listen for config from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_SUPABASE_CONFIG') {
    SUPABASE_URL = event.data.url
    SUPABASE_KEY = event.data.key
  }
  // Allow the main thread to trigger a sync check
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    syncAllOrders()
  }
  // Pre-warm a list of URLs into the cache so they work offline without a prior visit
  if (event.data && event.data.type === 'PRECACHE_URLS') {
    event.waitUntil(precacheUrls(event.data.urls))
  }
})

/**
 * Fetch each URL and store it in the appropriate runtime cache.
 * Uses a separate 'precache-on-demand' cache so it doesn't pollute
 * the workbox runtime caches, which have their own size limits.
 * Runs quietly — failures are ignored so one bad URL can't block the rest.
 */
async function precacheUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return
  const cache = await caches.open('precache-on-demand')
  for (const url of urls) {
    try {
      // Only fetch if not already cached (avoids redundant network calls)
      const existing = await cache.match(url)
      if (existing) continue
      const response = await fetch(url, { credentials: 'same-origin' })
      if (response.ok) {
        await cache.put(url, response)
      }
    } catch (_) {
      // Silently ignore — device may be offline, or URL may not exist yet
    }
  }
}

// Open IndexedDB from within the service worker
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // v1 stores (always create if missing)
      if (!db.objectStoreNames.contains(ORDERS_STORE)) {
        const orderStore = db.createObjectStore(ORDERS_STORE, { keyPath: 'client_id' })
        orderStore.createIndex('sync_status', 'sync_status', { unique: false })
        orderStore.createIndex('created_at', 'created_at', { unique: false })
        orderStore.createIndex('restaurant_id', 'restaurant_id', { unique: false })
      }
      if (!db.objectStoreNames.contains(ORDER_ITEMS_STORE)) {
        const itemsStore = db.createObjectStore(ORDER_ITEMS_STORE, { keyPath: 'id', autoIncrement: true })
        itemsStore.createIndex('order_client_id', 'order_client_id', { unique: false })
      }

      // v2: pending_payments store
      if (!db.objectStoreNames.contains(PAYMENTS_STORE)) {
        const paymentsStore = db.createObjectStore(PAYMENTS_STORE, { keyPath: 'payment_id' })
        paymentsStore.createIndex('sync_status', 'sync_status', { unique: false })
        paymentsStore.createIndex('created_at', 'created_at', { unique: false })
        paymentsStore.createIndex('restaurant_id', 'restaurant_id', { unique: false })
      }

      // v3: pending_order_updates store
      if (!db.objectStoreNames.contains(ORDER_UPDATES_STORE)) {
        const updatesStore = db.createObjectStore(ORDER_UPDATES_STORE, { keyPath: 'update_id' })
        updatesStore.createIndex('sync_status', 'sync_status', { unique: false })
        updatesStore.createIndex('order_id', 'order_id', { unique: false })
        updatesStore.createIndex('created_at', 'created_at', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getOrdersToSync(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, 'readonly')
    const store = tx.objectStore(ORDERS_STORE)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result || []
      resolve(all.filter(o =>
        o.sync_status === 'pending' ||
        (o.sync_status === 'failed' && o.retry_count < 5)
      ))
    }
    request.onerror = () => reject(request.error)
  })
}

function getOrderItemsFromDB(db, clientId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDER_ITEMS_STORE, 'readonly')
    const store = tx.objectStore(ORDER_ITEMS_STORE)
    const index = store.index('order_client_id')
    const request = index.getAll(clientId)

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function updateOrderStatusInDB(db, clientId, status, errorMessage) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ORDERS_STORE, 'readwrite')
    const store = tx.objectStore(ORDERS_STORE)
    const request = store.get(clientId)

    request.onsuccess = () => {
      const order = request.result
      if (!order) { resolve(false); return }

      order.sync_status = status
      order.last_sync_attempt = new Date().toISOString()
      if (status === 'failed') {
        order.retry_count = (order.retry_count || 0) + 1
        order.error_message = errorMessage || null
      }
      if (status === 'synced') {
        order.error_message = null
      }

      store.put(order)
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  })
}

function removeOrderFromDB(db, clientId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([ORDERS_STORE, ORDER_ITEMS_STORE], 'readwrite')
    const orderStore = tx.objectStore(ORDERS_STORE)
    const itemsStore = tx.objectStore(ORDER_ITEMS_STORE)

    orderStore.delete(clientId)

    const itemsIndex = itemsStore.index('order_client_id')
    const itemsReq = itemsIndex.getAllKeys(clientId)
    itemsReq.onsuccess = () => {
      for (const key of itemsReq.result) {
        itemsStore.delete(key)
      }
    }

    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Serve pre-warmed pages from the 'precache-on-demand' cache as a fallback
 * when the network is unavailable and the workbox runtime cache misses.
 * Only handles same-origin navigation requests (HTML pages).
 */
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only intercept same-origin GET navigation requests
  if (
    request.method !== 'GET' ||
    request.mode !== 'navigate' ||
    !request.url.startsWith(self.registration.scope)
  ) return

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open('precache-on-demand')
      const cached = await cache.match(request)
      return cached || caches.match('/offline.html')
    })
  )
})

/**
 * Background Sync handler.
 * Fires when connectivity is restored (even if the tab is closed).
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-orders') {
    event.waitUntil(syncAllOrders())
  }
})

async function syncAllOrders() {
  // If we don't have Supabase config yet, try to get it from a client
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    const allClients = await self.clients.matchAll()
    if (allClients.length > 0) {
      // Ask the first client to send us the config
      allClients[0].postMessage({ type: 'REQUEST_SUPABASE_CONFIG' })
      // Wait briefly for the response
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[SW Sync] No Supabase credentials available — sync deferred to main thread')
    return
  }

  let db
  try {
    db = await openDB()
    const orders = await getOrdersToSync(db)

    if (orders.length === 0) {
      db.close()
      return
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation',
    }

    for (const order of orders) {
      try {
        await updateOrderStatusInDB(db, order.client_id, 'syncing')

        // Check for existing order (dedup by client_id)
        const checkRes = await fetch(
          `${SUPABASE_URL}/rest/v1/orders?client_id=eq.${order.client_id}&select=id`,
          { headers }
        )
        const existing = await checkRes.json()

        let serverId

        if (existing && existing.length > 0) {
          serverId = existing[0].id
        } else {
          // Insert order
          const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              restaurant_id: order.restaurant_id,
              table_id: order.table_id,
              total: order.total,
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              customer_phone: order.customer_phone,
              notes: order.notes,
              status: order.status,
              order_type: order.order_type,
              pickup_code: order.pickup_code,
              locale: order.locale,
              client_id: order.client_id,
            }),
          })

          if (!orderRes.ok) {
            const errText = await orderRes.text()
            throw new Error(`Order insert failed: ${orderRes.status} ${errText}`)
          }

          const newOrders = await orderRes.json()
          serverId = newOrders[0].id

          // Insert order items
          const items = await getOrderItemsFromDB(db, order.client_id)
          if (items.length > 0) {
            const orderItems = items.map((item) => ({
              order_id: serverId,
              menu_item_id: item.menu_item_id,
              name: item.name,
              quantity: item.quantity,
              price_at_time: item.price_at_time,
            }))

            const itemsRes = await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'return=minimal' },
              body: JSON.stringify(orderItems),
            })

            if (!itemsRes.ok) {
              const errText = await itemsRes.text()
              throw new Error(`Items insert failed: ${itemsRes.status} ${errText}`)
            }
          }

          // Trigger confirmation email (best-effort, relative URL via scope origin)
          try {
            await fetch(new URL('/api/takeaway/order', self.registration.scope).href, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: serverId,
                restaurantId: order.restaurant_id,
                locale: order.locale,
              }),
            })
          } catch (_) {
            // Non-blocking
          }
        }

        await updateOrderStatusInDB(db, order.client_id, 'synced')
        await removeOrderFromDB(db, order.client_id)
        console.log(`[SW Sync] Order ${order.client_id} synced as ${serverId}`)
      } catch (err) {
        console.error(`[SW Sync] Failed to sync order ${order.client_id}:`, err)
        await updateOrderStatusInDB(db, order.client_id, 'failed', err.message)
      }
    }

    db.close()

    // Notify all clients that sync is complete
    const allClients = await self.clients.matchAll()
    for (const client of allClients) {
      client.postMessage({ type: 'SYNC_COMPLETE' })
    }
  } catch (err) {
    console.error('[SW Sync] Error:', err)
    if (db) db.close()
  }
}
