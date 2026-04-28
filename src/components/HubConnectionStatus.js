'use client'

import { useState, useEffect } from 'react'
import { onSyncEvent } from '@/lib/syncManager'
import { getPendingCount } from '@/lib/offlineQueue'

/**
 * Connection status indicator shown in the dashboard header.
 * Shows internet connectivity and pending offline-sync count.
 */
export default function HubConnectionStatus({ restaurantId }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [syncStatus, setSyncStatus] = useState({ isSyncing: false, pendingCount: 0 })

  useEffect(() => {
    if (typeof window === 'undefined' || !restaurantId) return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const unsubSyncStart = onSyncEvent('sync-start', () => {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }))
    })

    const unsubSyncComplete = onSyncEvent('sync-complete', async () => {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }))
      try {
        const count = await getPendingCount()
        setSyncStatus(prev => ({ ...prev, pendingCount: count }))
      } catch {}
    })

    const unsubPendingChange = onSyncEvent('pending-count-change', (e) => {
      setSyncStatus(prev => ({ ...prev, pendingCount: e.detail?.count ?? prev.pendingCount }))
    })

    getPendingCount().then(count => {
      setSyncStatus(prev => ({ ...prev, pendingCount: count }))
    }).catch(() => {})

    const interval = setInterval(async () => {
      try {
        const count = await getPendingCount()
        setSyncStatus(prev => ({ ...prev, pendingCount: count }))
      } catch {}
    }, 15_000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubSyncStart()
      unsubSyncComplete()
      unsubPendingChange()
      clearInterval(interval)
    }
  }, [restaurantId])

  if (!restaurantId) return null

  return (
    <div className="flex items-center gap-3">
      {/* Internet status */}
      <div className="flex items-center gap-1.5" title={isOnline ? 'Internet: Online' : 'Internet: Offline'}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Pending sync badge */}
      {syncStatus.pendingCount > 0 && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/20 rounded-full"
          title={`${syncStatus.pendingCount} order${syncStatus.pendingCount !== 1 ? 's' : ''} pending sync`}
        >
          <svg
            className={`w-3 h-3 text-orange-600 dark:text-orange-400 ${syncStatus.isSyncing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
            {syncStatus.pendingCount}
          </span>
        </div>
      )}
    </div>
  )
}
