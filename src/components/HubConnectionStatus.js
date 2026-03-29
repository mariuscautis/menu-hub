'use client'

import { useState, useEffect } from 'react'
import localHubClient from '@/lib/localHubClient'
import { onSyncEvent } from '@/lib/syncManager'
import { getPendingCount } from '@/lib/offlineQueue'

/**
 * Hub Connection Status
 *
 * Shows the local hub and internet connection status in the dashboard header.
 * Automatically connects to the hub discovered via IP scan or cached URL.
 * No QR scanning required — connection is fully automatic.
 */
export default function HubConnectionStatus({ restaurantId, staffInfo }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [connectedCount, setConnectedCount] = useState(0)
  const [hubUrl, setHubUrl] = useState(null)
  const [syncStatus, setSyncStatus] = useState({ isSyncing: false, pendingCount: 0 })

  useEffect(() => {
    if (typeof window === 'undefined' || !restaurantId) return

    // Update device info so the hub knows who this device is
    if (staffInfo) {
      localHubClient.setDeviceInfo({
        deviceName: staffInfo.name || 'Staff Device',
        deviceRole: staffInfo.department || 'staff',
        restaurantId,
      })
    }

    // Subscribe to hub events
    const unsubConnected = localHubClient.on('connected', () => {
      setIsConnected(true)
      const status = localHubClient.getStatus()
      setHubUrl(status.hubUrl)
    })

    const unsubDisconnected = localHubClient.on('disconnected', () => {
      setIsConnected(false)
    })

    const unsubDeviceList = localHubClient.on('device_list', (data) => {
      setConnectedCount(data?.count || 0)
    })

    // Subscribe to sync events
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

    // Online/offline
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Reflect current state immediately
    const status = localHubClient.getStatus()
    setIsConnected(status.isConnected)
    setHubUrl(status.hubUrl)

    // Connect if not already connected
    if (!status.isConnected) {
      localHubClient.connect(restaurantId).catch(() => {})
    }

    // Load initial pending count
    getPendingCount().then(count => {
      setSyncStatus(prev => ({ ...prev, pendingCount: count }))
    }).catch(() => {})

    // Refresh pending count every 15s
    const countInterval = setInterval(async () => {
      try {
        const count = await getPendingCount()
        setSyncStatus(prev => ({ ...prev, pendingCount: count }))
      } catch {}
    }, 15_000)

    return () => {
      unsubConnected()
      unsubDisconnected()
      unsubDeviceList()
      unsubSyncStart()
      unsubSyncComplete()
      unsubPendingChange()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(countInterval)
    }
  }, [restaurantId, staffInfo])

  if (!restaurantId) return null

  return (
    <div className="flex items-center gap-3">
      {/* Internet status */}
      <div className="flex items-center gap-1.5" title={isOnline ? 'Internet: Online' : 'Internet: Offline'}>
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Hub status */}
      <div
        className="flex items-center gap-1.5"
        title={
          isConnected
            ? `Hub connected — ${connectedCount} device${connectedCount !== 1 ? 's' : ''} (${hubUrl || ''})`
            : 'Hub: Searching...'
        }
      >
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            isConnected ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
          }`}
        />
        <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
          {isConnected
            ? connectedCount > 1 ? `Hub (${connectedCount})` : 'Hub'
            : 'No Hub'}
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
