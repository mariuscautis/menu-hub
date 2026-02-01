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
  getPaymentsToSync,
  updatePaymentSyncStatus,
  removeSyncedPayment,
  getPendingPaymentCount,
  getOrderUpdatesToSync,
  updateOrderUpdateSyncStatus,
  removeSyncedOrderUpdate,
} from './offlineQueue'
import { wasTableCleanedOffline, clearTableCleanedOfflineStatus, clearAllOfflinePaidTables } from './supabase'

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
 * Sync all pending cash payments to Supabase.
 * @returns {{ synced: number, failed: number }}
 */
export async function syncPendingPayments() {
  if (!navigator.onLine) return { synced: 0, failed: 0, offline: true }

  let synced = 0
  let failed = 0

  try {
    const payments = await getPaymentsToSync()
    if (payments.length === 0) {
      return { synced: 0, failed: 0 }
    }

    const supabase = getSyncSupabase()

    for (const payment of payments) {
      try {
        await updatePaymentSyncStatus(payment.payment_id, 'syncing')
        emitSyncEvent('sync-progress', { paymentId: payment.payment_id, status: 'syncing', type: 'payment' })

        // If payment includes offline order client_ids, first sync those orders and get their real IDs
        let orderIdsToProcess = [...(payment.order_ids || [])]

        if (payment.order_client_ids && payment.order_client_ids.length > 0) {
          // Look up real order IDs by client_id
          for (const clientId of payment.order_client_ids) {
            const { data: order } = await supabase
              .from('orders')
              .select('id')
              .eq('client_id', clientId)
              .maybeSingle()

            if (order) {
              orderIdsToProcess.push(order.id)
            } else {
              console.warn(`[SyncManager] Offline order ${clientId} not found in DB — may need to sync orders first`)
            }
          }
        }

        if (orderIdsToProcess.length === 0) {
          // No orders to process — mark as synced anyway
          await updatePaymentSyncStatus(payment.payment_id, 'synced')
          await removeSyncedPayment(payment.payment_id)
          synced++
          continue
        }

        // Use the RPC function to process payment (same as online flow)
        const { data, error } = await supabase.rpc('process_table_payment', {
          p_order_ids: orderIdsToProcess,
          p_payment_method: payment.payment_method,
          p_staff_name: payment.staff_name,
          p_user_id: payment.user_id,
        })

        if (error) throw error

        if (data && !data.success) {
          throw new Error(data.error || 'Failed to process payment')
        }

        // If the table was cleaned offline, restore its 'available' status
        // (process_table_payment sets it to 'needs_cleaning', but staff already cleaned it)
        if (payment.table_id && wasTableCleanedOffline(payment.table_id)) {
          try {
            await supabase.rpc('mark_table_cleaned', {
              p_table_id: payment.table_id,
              p_payment_completed_at: null
            })
            clearTableCleanedOfflineStatus(payment.table_id)
            console.log(`[SyncManager] Restored table ${payment.table_id} to 'available' (was cleaned offline)`)
          } catch (cleanErr) {
            console.warn(`[SyncManager] Failed to restore table status:`, cleanErr)
          }
        }

        // Mark as synced and clean up
        await updatePaymentSyncStatus(payment.payment_id, 'synced')
        await removeSyncedPayment(payment.payment_id)
        synced++
        emitSyncEvent('sync-progress', { paymentId: payment.payment_id, status: 'synced', type: 'payment' })
      } catch (err) {
        console.error(`[SyncManager] Failed to sync payment ${payment.payment_id}:`, err)
        await updatePaymentSyncStatus(payment.payment_id, 'failed', err.message)
        failed++
        emitSyncEvent('sync-progress', { paymentId: payment.payment_id, status: 'failed', type: 'payment', error: err.message })
      }
    }
  } catch (err) {
    console.error('[SyncManager] Payment sync process error:', err)
  }

  return { synced, failed }
}

/**
 * Sync pending order updates (items added to existing orders while offline).
 * @returns {{ synced: number, failed: number }}
 */
export async function syncPendingOrderUpdates() {
  if (!navigator.onLine) return { synced: 0, failed: 0, offline: true }

  let synced = 0
  let failed = 0

  try {
    const updates = await getOrderUpdatesToSync()
    if (updates.length === 0) {
      return { synced: 0, failed: 0 }
    }

    const supabase = getSyncSupabase()

    for (const update of updates) {
      try {
        await updateOrderUpdateSyncStatus(update.update_id, 'syncing')
        emitSyncEvent('sync-progress', { updateId: update.update_id, status: 'syncing', type: 'order_update' })

        // Verify the order still exists
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('id, total')
          .eq('id', update.order_id)
          .maybeSingle()

        if (orderError) throw orderError

        if (!order) {
          console.warn(`[SyncManager] Order ${update.order_id} not found — skipping update`)
          await updateOrderUpdateSyncStatus(update.update_id, 'failed', 'Order not found')
          failed++
          continue
        }

        // Insert the new order items
        const orderItems = (update.items || []).map((item) => ({
          order_id: update.order_id,
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

        // Update the order total
        const newTotal = (order.total || 0) + (update.total_to_add || 0)
        const { error: updateError } = await supabase
          .from('orders')
          .update({ total: newTotal })
          .eq('id', update.order_id)

        if (updateError) throw updateError

        // Mark as synced and clean up
        await updateOrderUpdateSyncStatus(update.update_id, 'synced')
        await removeSyncedOrderUpdate(update.update_id)
        synced++
        emitSyncEvent('sync-progress', { updateId: update.update_id, status: 'synced', type: 'order_update' })
      } catch (err) {
        console.error(`[SyncManager] Failed to sync order update ${update.update_id}:`, err)
        await updateOrderUpdateSyncStatus(update.update_id, 'failed', err.message)
        failed++
        emitSyncEvent('sync-progress', { updateId: update.update_id, status: 'failed', type: 'order_update', error: err.message })
      }
    }
  } catch (err) {
    console.error('[SyncManager] Order updates sync process error:', err)
  }

  return { synced, failed }
}

/**
 * Sync orders, order updates, and payments.
 * Orders are synced first, then updates, then payments.
 */
export async function syncAll() {
  const ordersResult = await syncPendingOrders()
  const orderUpdatesResult = await syncPendingOrderUpdates()
  const paymentsResult = await syncPendingPayments()

  // Clear offline paid tables tracking after successful sync
  // (the data is now in sync with the server)
  if (paymentsResult.synced > 0) {
    clearAllOfflinePaidTables()
  }

  return {
    orders: ordersResult,
    orderUpdates: orderUpdatesResult,
    payments: paymentsResult,
  }
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
    syncAll()
  }

  window.addEventListener('online', handleOnline)

  // Periodic sync every 30s when online
  intervalId = setInterval(() => {
    if (navigator.onLine) {
      syncAll()
    }
  }, 30000)

  // Initial sync attempt
  if (navigator.onLine) {
    syncAll()
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
