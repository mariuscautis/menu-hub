'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { addPendingOrder, getPendingOrders, getPendingCount } from '@/lib/offlineQueue'
import { syncPendingOrders, onSyncEvent, initAutoSync } from '@/lib/syncManager'
import localHubClient from '@/lib/localHubClient'

/**
 * Hook for offline-aware order placement.
 *
 * Priority order:
 * 1. Local Hub (if connected) - instant local sync
 * 2. Supabase (if online but no hub) - cloud sync
 * 3. IndexedDB (if offline) - queue for later sync
 *
 * @returns {Object} { placeOrder, pendingCount, isOnline, isSyncing, syncNow, hubConnected }
 */
export default function useOfflineOrder() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [hubConnected, setHubConnected] = useState(false)

  // Track online status
  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initialize auto-sync and listen for sync events
  useEffect(() => {
    const cleanupAutoSync = initAutoSync()

    const unsubStart = onSyncEvent('sync-start', () => setIsSyncing(true))
    const unsubComplete = onSyncEvent('sync-complete', () => setIsSyncing(false))
    const unsubCount = onSyncEvent('pending-count-change', (e) => {
      setPendingCount(e.detail.count)
    })

    // Get initial pending count
    getPendingCount().then(setPendingCount).catch(() => {})

    return () => {
      cleanupAutoSync()
      unsubStart()
      unsubComplete()
      unsubCount()
    }
  }, [])

  // Monitor local hub connection status
  useEffect(() => {
    const updateHubStatus = () => {
      const status = localHubClient.getStatus()
      setHubConnected(status.isConnected)
    }

    // Initial status
    updateHubStatus()

    // Listen for connection changes
    const unsubConnected = localHubClient.on('connected', updateHubStatus)
    const unsubDisconnected = localHubClient.on('disconnected', updateHubStatus)
    const unsubRegistered = localHubClient.on('registered', updateHubStatus)

    return () => {
      unsubConnected()
      unsubDisconnected()
      unsubRegistered()
    }
  }, [])

  /**
   * Place an order — via local hub, Supabase, or offline queue.
   *
   * @param {Object} params
   * @param {Object} params.restaurant - Restaurant object
   * @param {Array} params.cart - Cart items (with id, name, price, quantity)
   * @param {string} params.customerName
   * @param {string} params.customerEmail
   * @param {string} params.customerPhone
   * @param {string} params.orderNotes
   * @param {string} params.pickupCode
   * @param {string} params.locale
   * @param {number} params.total
   *
   * @returns {{ success: boolean, pickupCode: string, offline: boolean, via: string, error?: string }}
   */
  const placeOrder = useCallback(async ({
    restaurant,
    cart,
    customerName,
    customerEmail,
    customerPhone,
    orderNotes,
    pickupCode,
    locale,
    total,
  }) => {
    const orderData = {
      restaurant_id: restaurant.id,
      table_id: null,
      total,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim().toLowerCase(),
      customer_phone: customerPhone.trim() || null,
      notes: orderNotes.trim() || null,
      status: 'pending',
      order_type: 'takeaway',
      pickup_code: pickupCode,
      locale,
    }

    const orderItems = cart.map((item) => ({
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price_at_time: item.price,
    }))

    // Generate client_id for deduplication
    const clientId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    orderData.client_id = clientId

    // PRIORITY 1: Try local hub first (if connected)
    if (localHubClient.getStatus().isConnected) {
      try {
        console.log('[useOfflineOrder] Placing order via local hub')
        await localHubClient.placeOrder(orderData, orderItems)

        // Order sent to hub successfully
        // The hub will handle syncing with Supabase
        return { success: true, pickupCode, offline: false, via: 'local-hub' }
      } catch (err) {
        console.warn('[useOfflineOrder] Local hub placement failed, falling back:', err.message)
        // Fall through to next method
      }
    }

    // PRIORITY 2: Try Supabase directly (if online but no hub)
    if (navigator.onLine) {
      try {
        console.log('[useOfflineOrder] Placing order via Supabase')
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert(orderData)
          .select()
          .single()

        if (orderError) throw orderError

        const items = orderItems.map((item) => ({
          ...item,
          order_id: order.id,
        }))

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(items)

        if (itemsError) throw itemsError

        // Send confirmation email (best-effort)
        try {
          await fetch('/api/takeaway/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              restaurantId: restaurant.id,
              locale,
            }),
          })
        } catch (emailErr) {
          console.error('Failed to send confirmation email:', emailErr)
        }

        return { success: true, pickupCode, offline: false, via: 'supabase' }
      } catch (err) {
        // If the online attempt fails (e.g., network dropped mid-request),
        // fall through to offline queue
        console.warn('[useOfflineOrder] Supabase placement failed, queuing offline:', err.message)
      }
    }

    // PRIORITY 3: Queue locally in IndexedDB (offline or all else failed)
    try {
      console.log('[useOfflineOrder] Queueing order in IndexedDB')
      await addPendingOrder(orderData, orderItems)
      const count = await getPendingCount()
      setPendingCount(count)
      return { success: true, pickupCode, offline: true, via: 'indexeddb' }
    } catch (err) {
      console.error('[useOfflineOrder] Failed to queue order offline:', err)
      return { success: false, error: 'Failed to save order. Please try again.', offline: true }
    }
  }, [])

  /**
   * Manually trigger a sync.
   */
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0 }
    return syncPendingOrders()
  }, [])

  return {
    placeOrder,
    pendingCount,
    isOnline,
    isSyncing,
    syncNow,
    hubConnected,
  }
}
