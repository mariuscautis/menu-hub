/**
 * Sync Manager - Coordinates syncing offline orders to Supabase.
 *
 * Drains the IndexedDB queue by pushing each pending order to Supabase,
 * then triggers the confirmation email via the existing API endpoint.
 * Handles retries and deduplication via client_id.
 */

import { createClient } from '@supabase/supabase-js'
import {
  getOrdersToSync,
  getOrderItems,
  updateSyncStatus,
  removeSyncedOrder,
  getPendingCount,
} from './offlineQueue'

// Event target for sync status updates (so UI components can listen)
const syncEventTarget = typeof window !== 'undefined' ? new EventTarget() : null

/**
 * Dispatch a sync status event for UI updates.
 */
function emitSyncEvent(type, detail = {}) {
  if (!syncEventTarget) return
  syncEventTarget.dispatchEvent(new CustomEvent(type, { detail }))
}

/**
 * Subscribe to sync events.
 * @param {string} event - 'sync-start' | 'sync-progress' | 'sync-complete' | 'sync-error' | 'pending-count-change'
 * @param {Function} handler
 * @returns {Function} Unsubscribe function
 */
export function onSyncEvent(event, handler) {
  if (!syncEventTarget) return () => {}
  syncEventTarget.addEventListener(event, handler)
  return () => syncEventTarget.removeEventListener(event, handler)
}

/**
 * Get a fresh Supabase client for syncing.
 * Uses the public environment variables (same as the app).
 */
function getSyncSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase credentials not available for sync')
  }
  return createClient(url, key)
}

let isSyncing = false

/**
 * Sync all pending orders to Supabase.
 * Safe to call multiple times — will skip if already syncing.
 *
 * @returns {{ synced: number, failed: number }}
 */
export async function syncPendingOrders() {
  if (isSyncing) return { synced: 0, failed: 0, skipped: true }
  if (!navigator.onLine) return { synced: 0, failed: 0, offline: true }

  isSyncing = true
  emitSyncEvent('sync-start')

  let synced = 0
  let failed = 0

  try {
    const orders = await getOrdersToSync()
    if (orders.length === 0) {
      isSyncing = false
      emitSyncEvent('sync-complete', { synced: 0, failed: 0 })
      return { synced: 0, failed: 0 }
    }

    const supabase = getSyncSupabase()

    for (const order of orders) {
      try {
        await updateSyncStatus(order.client_id, 'syncing')
        emitSyncEvent('sync-progress', { clientId: order.client_id, status: 'syncing' })

        // Check if this order was already synced (dedup by client_id)
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('client_id', order.client_id)
          .maybeSingle()

        let serverId

        if (existing) {
          // Already synced previously — just clean up
          serverId = existing.id
        } else {
          // Insert order into Supabase
          const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
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
            })
            .select()
            .single()

          if (orderError) throw orderError
          serverId = newOrder.id

          // Insert order items
          const items = await getOrderItems(order.client_id)
          const orderItems = items.map((item) => ({
            order_id: serverId,
            menu_item_id: item.menu_item_id,
            name: item.name,
            quantity: item.quantity,
            price_at_time: item.price_at_time,
          }))

          if (orderItems.length > 0) {
            const { error: itemsError } = await supabase
              .from('order_items')
              .insert(orderItems)

            if (itemsError) throw itemsError
          }

          // Send confirmation email (best-effort, don't fail the sync)
          try {
            await fetch('/api/takeaway/order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: serverId,
                restaurantId: order.restaurant_id,
                locale: order.locale,
              }),
            })
          } catch (emailErr) {
            console.warn('[SyncManager] Email send failed (non-blocking):', emailErr)
          }
        }

        // Mark as synced and clean up
        await updateSyncStatus(order.client_id, 'synced')
        await removeSyncedOrder(order.client_id)
        synced++
        emitSyncEvent('sync-progress', { clientId: order.client_id, status: 'synced', serverId })
      } catch (err) {
        console.error(`[SyncManager] Failed to sync order ${order.client_id}:`, err)
        await updateSyncStatus(order.client_id, 'failed', err.message)
        failed++
        emitSyncEvent('sync-progress', { clientId: order.client_id, status: 'failed', error: err.message })
      }
    }
  } catch (err) {
    console.error('[SyncManager] Sync process error:', err)
    emitSyncEvent('sync-error', { error: err.message })
  } finally {
    isSyncing = false
    const pendingCount = await getPendingCount()
    emitSyncEvent('sync-complete', { synced, failed, pendingCount })
    emitSyncEvent('pending-count-change', { count: pendingCount })
  }

  return { synced, failed }
}

/**
 * Set up automatic sync triggers:
 * - When coming back online
 * - Periodic retry every 30 seconds while online
 *
 * Call this once at app initialization.
 * @returns {Function} Cleanup function
 */
export function initAutoSync() {
  if (typeof window === 'undefined') return () => {}

  let intervalId = null

  const handleOnline = () => {
    console.log('[SyncManager] Back online — triggering sync')
    syncPendingOrders()
  }

  window.addEventListener('online', handleOnline)

  // Periodic sync every 30s when online
  intervalId = setInterval(() => {
    if (navigator.onLine) {
      syncPendingOrders()
    }
  }, 30000)

  // Initial sync attempt
  if (navigator.onLine) {
    syncPendingOrders()
  }

  // Register Background Sync and send Supabase config to SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Send Supabase config to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'SET_SUPABASE_CONFIG',
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        })
      }

      // Register Background Sync
      if ('SyncManager' in window) {
        registration.sync.register('sync-offline-orders').catch((err) => {
          console.warn('[SyncManager] Background Sync registration failed:', err)
        })
      }
    })

    // Listen for SW messages (config requests, sync completion)
    const handleSWMessage = (event) => {
      if (event.data?.type === 'REQUEST_SUPABASE_CONFIG') {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'SET_SUPABASE_CONFIG',
              url: process.env.NEXT_PUBLIC_SUPABASE_URL,
              key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            })
          }
        })
      }
      if (event.data?.type === 'SYNC_COMPLETE') {
        // SW completed a sync — refresh pending count
        getPendingCount().then((count) => {
          emitSyncEvent('pending-count-change', { count })
        })
      }
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)

    const cleanup = () => {
      window.removeEventListener('online', handleOnline)
      if (intervalId) clearInterval(intervalId)
      navigator.serviceWorker.removeEventListener('message', handleSWMessage)
    }

    return cleanup
  }

  return () => {
    window.removeEventListener('online', handleOnline)
    if (intervalId) clearInterval(intervalId)
  }
}
