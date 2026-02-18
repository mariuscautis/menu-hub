'use client'

import { useState, useEffect } from 'react'
import webrtcClient from '@/lib/webrtcClient'
import syncCoordinator from '@/lib/syncCoordinator'
import HubScanner from '@/components/HubScanner'

/**
 * Hub Connection Status - Shows connection status and provides connection UI
 *
 * Displays:
 * - Hub connection status (connected/disconnected)
 * - Internet connection status
 * - Pending sync count
 * - Button to connect to hub
 */
export default function HubConnectionStatus({ restaurantId, staffInfo }) {
  const [isConnected, setIsConnected] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : false)
  const [showScanner, setShowScanner] = useState(false)
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    pendingCount: 0
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Set device info
    if (staffInfo && restaurantId) {
      webrtcClient.setDeviceInfo({
        deviceName: staffInfo.name || 'Staff Device',
        deviceRole: staffInfo.department || 'staff',
        restaurantId: restaurantId
      })
    }

    // Auto-connect if the user arrived via QR code scan
    const pendingData = sessionStorage.getItem('pending_hub_connection')
    if (pendingData) {
      sessionStorage.removeItem('pending_hub_connection')
      console.log('[HubConnectionStatus] Found pending hub connection from QR scan')
      handleConnect(pendingData).catch((err) => {
        console.error('[HubConnectionStatus] Auto-connect failed:', err)
      })
    }

    // Listen for connection events
    const unsubConnected = webrtcClient.on('connected', () => {
      console.log('[HubConnectionStatus] Connected to hub')
      setIsConnected(true)
      setShowScanner(false)
    })

    const unsubDisconnected = webrtcClient.on('disconnected', () => {
      console.log('[HubConnectionStatus] Disconnected from hub')
      setIsConnected(false)
    })

    // Listen for sync events
    const unsubSyncStart = syncCoordinator.on('sync_start', () => {
      setSyncStatus(prev => ({ ...prev, isSyncing: true }))
    })

    const unsubSyncComplete = syncCoordinator.on('sync_complete', () => {
      setSyncStatus(prev => ({ ...prev, isSyncing: false }))
      updatePendingCount()
    })

    // Monitor online/offline
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status
    const status = webrtcClient.getStatus()
    setIsConnected(status.isConnected)

    // Update pending count periodically
    updatePendingCount()
    const interval = setInterval(updatePendingCount, 10000) // Every 10 seconds

    return () => {
      unsubConnected()
      unsubDisconnected()
      unsubSyncStart()
      unsubSyncComplete()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [restaurantId, staffInfo])

  const updatePendingCount = async () => {
    if (typeof window === 'undefined') return

    try {
      const { getPendingCount } = await import('@/lib/offlineQueue')
      const count = await getPendingCount()
      setSyncStatus(prev => ({ ...prev, pendingCount: count }))
    } catch (error) {
      console.error('[HubConnectionStatus] Failed to get pending count:', error)
    }
  }

  const handleConnect = async (qrData) => {
    try {
      await webrtcClient.connectToHub(qrData)
    } catch (error) {
      console.error('[HubConnectionStatus] Connection error:', error)
      throw error
    }
  }

  const handleDisconnect = () => {
    if (confirm('Disconnect from local hub?')) {
      webrtcClient.disconnect()
      setIsConnected(false)
    }
  }

  // Don't render if no restaurant
  if (!restaurantId) return null

  return (
    <>
      {/* Connection Status Bar */}
      <div className="flex items-center gap-3">
        {/* Internet Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={isOnline ? 'Online' : 'Offline'}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Hub Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'
            }`}
            title={isConnected ? 'Hub Connected' : 'Hub Disconnected'}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400 hidden sm:inline">
            {isConnected ? 'Hub' : 'No Hub'}
          </span>
        </div>

        {/* Pending Sync Count */}
        {syncStatus.pendingCount > 0 && (
          <div
            className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-full"
            title="Pending orders to sync"
          >
            <svg
              className={`w-3 h-3 text-orange-600 dark:text-orange-400 ${
                syncStatus.isSyncing ? 'animate-spin' : ''
              }`}
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

        {/* Connect/Disconnect Button */}
        {!isConnected ? (
          <button
            onClick={() => setShowScanner(true)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            title="Connect to local hub"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="hidden sm:inline">Connect Hub</span>
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            title="Disconnect from hub"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        )}
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <HubScanner
            onConnect={handleConnect}
            onCancel={() => setShowScanner(false)}
          />
        </div>
      )}
    </>
  )
}
