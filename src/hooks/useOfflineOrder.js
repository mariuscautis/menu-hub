'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { addPendingOrder, getPendingCount } from '@/lib/offlineQueue'
import { syncPendingOrders, onSyncEvent, initAutoSync } from '@/lib/syncManager'

/**
 * Hook for offline-aware order placement.
 *
 * Priority order:
 * 1. Supabase (if online) - cloud sync
 * 2. IndexedDB (fallback) - queue for later sync when internet returns
 *
 * @returns {Object} { placeOrder, pendingCount, isOnline, isSyncing, syncNow }
 */
export default function useOfflineOrder() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

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

  /**
   * Place an order via Supabase (online) or local IndexedDB queue (offline).
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
    tableId = null,
    orderType = 'takeaway',
  }) => {
    const orderData = {
      restaurant_id: restaurant.id,
      table_id: tableId,
      total,
      customer_name: customerName ? customerName.trim() : null,
      customer_email: customerEmail ? customerEmail.trim().toLowerCase() : null,
      customer_phone: customerPhone ? customerPhone.trim() || null : null,
      notes: orderNotes ? orderNotes.trim() || null : null,
      status: 'pending',
      order_type: orderType,
      pickup_code: pickupCode || null,
      locale: locale || null,
    }

    const orderItems = cart.map((item) => ({
      menu_item_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price_at_time: item.price,
      special_instructions: item.special_instructions || null,
    }))

    // Generate client_id for deduplication
    const clientId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    orderData.client_id = clientId

    // PRIORITY 1: Try Supabase directly (if online)
    if (navigator.onLine) {
      try {
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
        // Network dropped mid-request — fall through to offline queue
        console.warn('[useOfflineOrder] Supabase placement failed, queuing offline:', err.message)
      }
    }

    // PRIORITY 2: Queue locally in IndexedDB (offline or Supabase failed)
    try {
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
  }
}
