'use client'

/**
 * Sync Coordinator - Manages synchronization between offline queue, hub, and cloud
 *
 * This module coordinates data flow between:
 * - IndexedDB offline queue (local storage)
 * - WebRTC Hub/Client (peer-to-peer sync)
 * - Supabase (cloud database)
 *
 * Features:
 * - Auto-detect internet connectivity changes
 * - Auto-sync to cloud when internet returns
 * - Auto-sync to hub when hub connection available
 * - Prioritize hub sync (faster) over cloud sync
 * - Handle sync conflicts and deduplication
 * - Retry failed syncs with exponential backoff
 * - Provide sync status updates
 */

import * as offlineQueue from './offlineQueue'

const SYNC_INTERVAL = 30000 // 30 seconds
const CONNECTIVITY_CHECK_INTERVAL = 10000 // 10 seconds

class SyncCoordinator {
  constructor() {
    this.supabaseClient = null
    this.webrtcHub = null
    this.webrtcClient = null
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false
    this.isHubConnected = false
    this.isSyncing = false
    this.listeners = new Map()
    this.syncTimer = null
    this.connectivityTimer = null
    this.lastSyncTime = null
    this.syncStats = {
      totalSynced: 0,
      totalFailed: 0,
      lastError: null
    }
  }

  /**
   * Initialize the sync coordinator
   */
  async initialize(supabaseClient, webrtcHubOrClient = null) {
    if (typeof window === 'undefined') {
      console.warn('[SyncCoordinator] Cannot initialize in SSR context')
      return false
    }

    this.supabaseClient = supabaseClient

    // Set hub or client reference
    if (webrtcHubOrClient) {
      // Check if it's a hub or client by looking for specific methods
      if (typeof webrtcHubOrClient.createOffer === 'function') {
        this.webrtcHub = webrtcHubOrClient
      } else {
        this.webrtcClient = webrtcHubOrClient
        this.setupClientListeners()
      }
    }

    // Monitor connectivity
    this.setupConnectivityMonitoring()

    // Start periodic sync
    this.startPeriodicSync()

    // Initial sync if online
    if (this.isOnline) {
      setTimeout(() => this.syncAll(), 2000)
    }

    console.log('[SyncCoordinator] Initialized')
    this.emit('initialized')

    return true
  }

  /**
   * Set up WebRTC client listeners
   */
  setupClientListeners() {
    if (!this.webrtcClient) return

    this.webrtcClient.on('connected', () => {
      console.log('[SyncCoordinator] Hub connected, syncing pending orders')
      this.isHubConnected = true
      this.emit('hub_connected')
      // Sync to hub immediately
      this.syncToHub()
    })

    this.webrtcClient.on('disconnected', () => {
      console.log('[SyncCoordinator] Hub disconnected')
      this.isHubConnected = false
      this.emit('hub_disconnected')
    })

    this.webrtcClient.on('new_order', (data) => {
      console.log('[SyncCoordinator] Received order from hub:', data.order?.client_id)
      this.emit('order_received', data)
    })

    this.webrtcClient.on('order_update', (data) => {
      console.log('[SyncCoordinator] Received order update from hub:', data.clientId)
      this.emit('order_update_received', data)
    })
  }

  /**
   * Set up connectivity monitoring
   */
  setupConnectivityMonitoring() {
    if (typeof window === 'undefined') return

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[SyncCoordinator] Internet connection restored')
      this.isOnline = true
      this.emit('online')
      // Sync immediately when back online
      this.syncAll()
    })

    window.addEventListener('offline', () => {
      console.log('[SyncCoordinator] Internet connection lost')
      this.isOnline = false
      this.emit('offline')
    })

    // Periodic connectivity check (navigator.onLine can be unreliable)
    this.connectivityTimer = setInterval(() => {
      this.checkConnectivity()
    }, CONNECTIVITY_CHECK_INTERVAL)
  }

  /**
   * Check actual internet connectivity by making a test request
   */
  async checkConnectivity() {
    if (!this.isOnline) return // Skip if we already know we're offline

    try {
      // Try to ping a reliable endpoint
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // If we get an error, we might be offline
        if (this.isOnline) {
          this.isOnline = false
          this.emit('offline')
        }
      }
    } catch (error) {
      // Network error, we're offline
      if (this.isOnline) {
        console.log('[SyncCoordinator] Connectivity check failed, marking as offline')
        this.isOnline = false
        this.emit('offline')
      }
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync() {
    this.stopPeriodicSync()

    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncAll()
      }
    }, SYNC_INTERVAL)
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
  }

  /**
   * Sync all pending data
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('[SyncCoordinator] Sync already in progress')
      return
    }

    if (!this.isOnline && !this.isHubConnected) {
      console.log('[SyncCoordinator] Offline and no hub connection, skipping sync')
      return
    }

    this.isSyncing = true
    this.emit('sync_start')

    try {
      const startTime = Date.now()

      // Get pending counts
      const pendingOrderCount = await offlineQueue.getPendingCount()
      const pendingPaymentCount = await offlineQueue.getPendingPaymentCount()

      console.log('[SyncCoordinator] Starting sync. Orders:', pendingOrderCount, 'Payments:', pendingPaymentCount)

      let syncedOrders = 0
      let syncedPayments = 0
      let failedOrders = 0
      let failedPayments = 0

      // Priority 1: Sync to hub if available (faster, local network)
      if (this.isHubConnected) {
        const hubResult = await this.syncToHub()
        syncedOrders += hubResult.synced || 0
        failedOrders += hubResult.failed || 0
      }

      // Priority 2: Sync to cloud if online
      if (this.isOnline && this.supabaseClient) {
        const cloudResult = await this.syncToCloud()
        syncedOrders += cloudResult.orders.synced || 0
        failedOrders += cloudResult.orders.failed || 0
        syncedPayments += cloudResult.payments.synced || 0
        failedPayments += cloudResult.payments.failed || 0
      }

      // Update stats
      this.syncStats.totalSynced += syncedOrders + syncedPayments
      this.syncStats.totalFailed += failedOrders + failedPayments
      this.lastSyncTime = Date.now()

      const duration = Date.now() - startTime

      console.log('[SyncCoordinator] Sync complete in', duration, 'ms. Synced:', syncedOrders + syncedPayments, 'Failed:', failedOrders + failedPayments)

      this.emit('sync_complete', {
        orders: { synced: syncedOrders, failed: failedOrders },
        payments: { synced: syncedPayments, failed: failedPayments },
        duration
      })

    } catch (error) {
      console.error('[SyncCoordinator] Sync error:', error)
      this.syncStats.lastError = error.message
      this.emit('sync_error', { error })
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * Sync to hub (peer-to-peer)
   */
  async syncToHub() {
    if (!this.webrtcClient || !this.isHubConnected) {
      return { synced: 0, failed: 0 }
    }

    try {
      const pendingOrders = await offlineQueue.getOrdersToSync()
      console.log('[SyncCoordinator] Syncing', pendingOrders.length, 'orders to hub')

      let synced = 0
      let failed = 0

      for (const order of pendingOrders) {
        try {
          // Get order items
          const items = await offlineQueue.getOrderItems(order.client_id)

          // Send to hub
          await this.webrtcClient.placeOrder(order, items)

          // Note: We don't mark as fully synced yet, only when cloud sync completes
          // But we can update the status to indicate it was sent to hub
          console.log('[SyncCoordinator] Sent order to hub:', order.client_id)
          synced++

        } catch (error) {
          console.error('[SyncCoordinator] Failed to send to hub:', order.client_id, error)
          failed++
        }
      }

      return { synced, failed }

    } catch (error) {
      console.error('[SyncCoordinator] Hub sync error:', error)
      return { synced: 0, failed: 0 }
    }
  }

  /**
   * Sync to cloud (Supabase)
   */
  async syncToCloud() {
    if (!this.supabaseClient || !this.isOnline) {
      return { orders: { synced: 0, failed: 0 }, payments: { synced: 0, failed: 0 } }
    }

    const result = {
      orders: { synced: 0, failed: 0 },
      payments: { synced: 0, failed: 0 }
    }

    try {
      // Sync orders
      const ordersToSync = await offlineQueue.getOrdersToSync()
      console.log('[SyncCoordinator] Syncing', ordersToSync.length, 'orders to cloud')

      for (const order of ordersToSync) {
        try {
          // Update sync status to 'syncing'
          await offlineQueue.updateSyncStatus(order.client_id, 'syncing')

          // Get order items
          const items = await offlineQueue.getOrderItems(order.client_id)

          // Insert order to Supabase
          const { data: orderData, error: orderError } = await this.supabaseClient
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
              created_at: order.created_at
            })
            .select()
            .single()

          if (orderError) throw orderError

          // Insert order items
          const itemsToInsert = items.map(item => ({
            order_id: orderData.id,
            menu_item_id: item.menu_item_id,
            name: item.name,
            quantity: item.quantity,
            price_at_time: item.price_at_time
          }))

          const { error: itemsError } = await this.supabaseClient
            .from('order_items')
            .insert(itemsToInsert)

          if (itemsError) throw itemsError

          // Mark as synced
          await offlineQueue.updateSyncStatus(order.client_id, 'synced')

          // Remove from offline queue after successful sync
          await offlineQueue.removeSyncedOrder(order.client_id)

          result.orders.synced++
          console.log('[SyncCoordinator] Synced order to cloud:', order.client_id)

        } catch (error) {
          console.error('[SyncCoordinator] Failed to sync order:', order.client_id, error)
          await offlineQueue.updateSyncStatus(order.client_id, 'failed', error.message)
          result.orders.failed++
        }
      }

      // Sync payments
      const paymentsToSync = await offlineQueue.getPaymentsToSync()
      console.log('[SyncCoordinator] Syncing', paymentsToSync.length, 'payments to cloud')

      for (const payment of paymentsToSync) {
        try {
          // Update payment status
          await offlineQueue.updatePaymentSyncStatus(payment.payment_id, 'syncing')

          // Insert payment to Supabase
          const { error: paymentError } = await this.supabaseClient
            .from('payments')
            .insert({
              restaurant_id: payment.restaurant_id,
              table_id: payment.table_id,
              total_amount: payment.total_amount,
              payment_method: payment.payment_method,
              staff_name: payment.staff_name,
              user_id: payment.user_id,
              created_at: payment.created_at
            })

          if (paymentError) throw paymentError

          // Mark as synced
          await offlineQueue.updatePaymentSyncStatus(payment.payment_id, 'synced')

          // Remove from offline queue
          await offlineQueue.removeSyncedPayment(payment.payment_id)

          result.payments.synced++
          console.log('[SyncCoordinator] Synced payment to cloud:', payment.payment_id)

        } catch (error) {
          console.error('[SyncCoordinator] Failed to sync payment:', payment.payment_id, error)
          await offlineQueue.updatePaymentSyncStatus(payment.payment_id, 'failed', error.message)
          result.payments.failed++
        }
      }

      // Sync order updates
      const updatesToSync = await offlineQueue.getOrderUpdatesToSync()
      console.log('[SyncCoordinator] Syncing', updatesToSync.length, 'order updates to cloud')

      for (const update of updatesToSync) {
        try {
          // Insert items to existing order
          const itemsToInsert = update.items.map(item => ({
            order_id: update.order_id,
            menu_item_id: item.menu_item_id,
            name: item.name,
            quantity: item.quantity,
            price_at_time: item.price_at_time
          }))

          const { error: itemsError } = await this.supabaseClient
            .from('order_items')
            .insert(itemsToInsert)

          if (itemsError) throw itemsError

          // Update order total
          const { error: updateError } = await this.supabaseClient
            .from('orders')
            .update({
              total: this.supabaseClient.raw(`total + ${update.total_to_add}`)
            })
            .eq('id', update.order_id)

          if (updateError) throw updateError

          // Mark as synced
          await offlineQueue.updateOrderUpdateSyncStatus(update.update_id, 'synced')
          await offlineQueue.removeSyncedOrderUpdate(update.update_id)

          console.log('[SyncCoordinator] Synced order update to cloud:', update.update_id)

        } catch (error) {
          console.error('[SyncCoordinator] Failed to sync order update:', update.update_id, error)
          await offlineQueue.updateOrderUpdateSyncStatus(update.update_id, 'failed', error.message)
        }
      }

      return result

    } catch (error) {
      console.error('[SyncCoordinator] Cloud sync error:', error)
      return result
    }
  }

  /**
   * Force a manual sync
   */
  async forceSyncNow() {
    console.log('[SyncCoordinator] Manual sync triggered')
    await this.syncAll()
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isOnline: this.isOnline,
      isHubConnected: this.isHubConnected,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats
    }
  }

  /**
   * Shutdown sync coordinator
   */
  shutdown() {
    console.log('[SyncCoordinator] Shutting down')
    this.stopPeriodicSync()

    if (this.connectivityTimer) {
      clearInterval(this.connectivityTimer)
      this.connectivityTimer = null
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
    }

    this.emit('shutdown')
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    return () => {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('[SyncCoordinator] Event callback error:', error)
        }
      })
    }
  }
}

// Create singleton instance
const syncCoordinator = new SyncCoordinator()

export default syncCoordinator
