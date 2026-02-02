'use client'

import { useState, useEffect } from 'react'
import localHubClient from '@/lib/localHubClient'

/**
 * Connection Status Indicator Component
 *
 * Shows the current connection mode:
 * - 🟢 Local Hub (instant local sync)
 * - 🟡 Cloud Only (via Supabase)
 * - 🔴 Offline (queued in IndexedDB)
 */
export default function HubConnectionStatus({ className = '' }) {
  const [status, setStatus] = useState({
    isOnline: true,
    hubConnected: false,
    hubUrl: null
  })

  useEffect(() => {
    const updateStatus = () => {
      const hubStatus = localHubClient.getStatus()
      setStatus({
        isOnline: navigator.onLine,
        hubConnected: hubStatus.isConnected,
        hubUrl: hubStatus.hubUrl
      })
    }

    // Initial status
    updateStatus()

    // Listen for connection changes
    const unsubConnected = localHubClient.on('connected', updateStatus)
    const unsubDisconnected = localHubClient.on('disconnected', updateStatus)

    // Listen for online/offline events
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      unsubConnected()
      unsubDisconnected()
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  const getStatusInfo = () => {
    if (status.hubConnected) {
      return {
        icon: '🟢',
        label: 'Local Hub',
        description: 'Connected to Menu Hub Station',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      }
    }

    if (status.isOnline) {
      return {
        icon: '🟡',
        label: 'Cloud Only',
        description: 'Connected to internet',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      }
    }

    return {
      icon: '🔴',
      label: 'Offline',
      description: 'Orders will sync when online',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusInfo.bgColor} ${statusInfo.borderColor} ${className}`}>
      <span className="text-lg">{statusInfo.icon}</span>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        <span className="text-xs text-gray-500">
          {statusInfo.description}
        </span>
      </div>
    </div>
  )
}

/**
 * Simple badge version for compact spaces
 */
export function HubConnectionBadge({ className = '' }) {
  const [status, setStatus] = useState({
    isOnline: true,
    hubConnected: false
  })

  useEffect(() => {
    const updateStatus = () => {
      const hubStatus = localHubClient.getStatus()
      setStatus({
        isOnline: navigator.onLine,
        hubConnected: hubStatus.isConnected
      })
    }

    updateStatus()

    const unsubConnected = localHubClient.on('connected', updateStatus)
    const unsubDisconnected = localHubClient.on('disconnected', updateStatus)
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    return () => {
      unsubConnected()
      unsubDisconnected()
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  const getIcon = () => {
    if (status.hubConnected) return '🟢'
    if (status.isOnline) return '🟡'
    return '🔴'
  }

  return (
    <div className={`inline-flex items-center gap-1 ${className}`} title={status.hubConnected ? 'Connected to Local Hub' : status.isOnline ? 'Cloud Only' : 'Offline'}>
      <span>{getIcon()}</span>
    </div>
  )
}
