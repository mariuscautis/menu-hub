'use client'

import { useState, useEffect } from 'react'
import { getPendingCount } from '@/lib/offlineQueue'
import { onSyncEvent, syncPendingOrders } from '@/lib/syncManager'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showNotification, setShowNotification] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncResult, setLastSyncResult] = useState(null)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowNotification(true)
      setTimeout(() => setShowNotification(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowNotification(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen for sync events and pending count changes
  useEffect(() => {
    getPendingCount().then(setPendingCount).catch(() => {})

    const unsubStart = onSyncEvent('sync-start', () => setIsSyncing(true))
    const unsubComplete = onSyncEvent('sync-complete', (e) => {
      setIsSyncing(false)
      const { synced, failed, pendingCount: remaining } = e.detail
      if (synced > 0 || failed > 0) {
        setLastSyncResult({ synced, failed })
        setTimeout(() => setLastSyncResult(null), 5000)
      }
      if (typeof remaining === 'number') {
        setPendingCount(remaining)
      }
    })
    const unsubCount = onSyncEvent('pending-count-change', (e) => {
      setPendingCount(e.detail.count)
    })

    return () => {
      unsubStart()
      unsubComplete()
      unsubCount()
    }
  }, [])

  const handleManualSync = async () => {
    if (!navigator.onLine || isSyncing) return
    await syncPendingOrders()
  }

  // Show the persistent pending bar when there are unsynced orders
  const showPendingBar = pendingCount > 0

  return (
    <>
      {/* Online/Offline notification toast */}
      {showNotification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          {isOnline ? (
            <div className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Back online</span>
            </div>
          ) : (
            <div className="bg-yellow-500 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">You're offline - Orders will be saved locally</span>
            </div>
          )}
        </div>
      )}

      {/* Sync result toast */}
      {lastSyncResult && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
          <div className={`${lastSyncResult.failed > 0 ? 'bg-amber-500' : 'bg-green-500'} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3`}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">
              {lastSyncResult.synced > 0 && `${lastSyncResult.synced} order${lastSyncResult.synced > 1 ? 's' : ''} synced`}
              {lastSyncResult.synced > 0 && lastSyncResult.failed > 0 && ' · '}
              {lastSyncResult.failed > 0 && `${lastSyncResult.failed} failed`}
            </span>
          </div>
        </div>
      )}

      {/* Persistent pending orders bar */}
      {showPendingBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-orange-500 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSyncing ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">
                {isSyncing
                  ? 'Syncing orders...'
                  : `${pendingCount} order${pendingCount > 1 ? 's' : ''} pending sync`
                }
              </span>
            </div>
            {isOnline && !isSyncing && (
              <button
                onClick={handleManualSync}
                className="bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-lg font-medium text-sm transition-colors"
              >
                Sync now
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
