'use client'

import { useState, useEffect, useCallback } from 'react'
import { onSyncEvent } from '@/lib/syncManager'
import { getPendingCount } from '@/lib/offlineQueue'
import { isHubConfigured, isHubDevice, pingHub, getHubIp } from '@/lib/localHub'

/**
 * Connection status indicator shown in the dashboard header.
 * Displays internet connectivity, pending offline-sync count, and hub status.
 *
 * Hub badge:
 * - Hub device: shows a purple "Hub" pill so staff know this device is the hub
 * - Spoke device (hub IP configured): shows a coloured dot indicating hub reachability
 * - Normal device: no hub badge
 */
export default function HubConnectionStatus({ restaurantId }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [syncStatus, setSyncStatus] = useState({ isSyncing: false, pendingCount: 0 })

  // Hub status
  const [hubMode, setHubMode] = useState(null) // null | 'hub' | 'spoke'
  const [hubReachable, setHubReachable] = useState(null) // null | true | false
  const [hubChecking, setHubChecking] = useState(false)

  const refreshHubMode = useCallback(() => {
    if (isHubDevice()) {
      setHubMode('hub')
    } else if (isHubConfigured()) {
      setHubMode('spoke')
    } else {
      setHubMode(null)
    }
  }, [])

  const checkHub = useCallback(async () => {
    if (!isHubConfigured()) return
    setHubChecking(true)
    const ok = await pingHub()
    setHubReachable(ok)
    setHubChecking(false)
  }, [])

  // Detect hub mode changes (e.g. user saves settings in another tab)
  useEffect(() => {
    refreshHubMode()
    const handleStorage = () => { refreshHubMode(); checkHub() }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [refreshHubMode, checkHub])

  // Ping hub on mount and every 15 seconds when in spoke mode
  useEffect(() => {
    if (hubMode !== 'spoke') return
    checkHub()
    const interval = setInterval(checkHub, 15000)
    return () => clearInterval(interval)
  }, [hubMode, checkHub])

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

    // Load initial pending count
    getPendingCount().then(count => {
      setSyncStatus(prev => ({ ...prev, pendingCount: count }))
    }).catch(() => {})

    // Refresh pending count every 15s
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
      {/* Hub device pill */}
      {hubMode === 'hub' && (
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full"
          title="This device is the offline hub"
        >
          <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
          </svg>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Hub</span>
        </div>
      )}

      {/* Spoke: hub reachability dot */}
      {hubMode === 'spoke' && (
        <div
          className="flex items-center gap-1.5"
          title={
            hubChecking || hubReachable === null
              ? `Checking hub (${getHubIp()})`
              : hubReachable
              ? `Hub connected (${getHubIp()})`
              : `Hub unreachable (${getHubIp()}) — orders queued locally`
          }
        >
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              hubChecking || hubReachable === null
                ? 'bg-slate-400 animate-pulse'
                : hubReachable
                ? 'bg-green-500'
                : 'bg-amber-500'
            }`}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
            {hubReachable === null || hubChecking ? 'Hub...' : hubReachable ? 'Hub' : 'Hub offline'}
          </span>
        </div>
      )}

      {/* Internet status */}
      <div className="flex items-center gap-1.5" title={isOnline ? 'Internet: Online' : 'Internet: Offline'}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
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
