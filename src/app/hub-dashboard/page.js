'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import localHubClient from '@/lib/localHubClient'

// Force dynamic rendering (don't pre-render at build time)
export const dynamic = 'force-dynamic'

export default function HubDashboard() {
  const router = useRouter()
  const [staffSession, setStaffSession] = useState(null)
  const [hubStatus, setHubStatus] = useState({
    isConnected: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectedDevices: [],
    lastSync: null
  })
  const [recentOrders, setRecentOrders] = useState([])

  useEffect(() => {
    // Check if user is logged in and is a hub user
    const session = localStorage.getItem('staff_session')
    if (!session) {
      router.push('/auth/staff-login')
      return
    }

    const parsedSession = JSON.parse(session)
    if (!parsedSession.is_hub) {
      // Not a hub user, redirect to normal dashboard
      router.push('/dashboard')
      return
    }

    setStaffSession(parsedSession)

    // Initialize local hub client
    initializeHub(parsedSession)
  }, [router])

  const initializeHub = async (session) => {
    // Set device info
    localHubClient.setDeviceInfo({
      deviceName: `${session.name}'s Hub Device`,
      deviceRole: 'hub',
      restaurantId: session.restaurant_id
    })

    // Connect to hub (this will start the WebSocket server)
    await localHubClient.connect(session.restaurant_id)

    // Listen for status updates
    const unsubConnected = localHubClient.on('connected', updateStatus)
    const unsubDisconnected = localHubClient.on('disconnected', updateStatus)
    const unsubNewOrder = localHubClient.on('new_order', handleNewOrder)

    // Initial status
    updateStatus()

    return () => {
      unsubConnected()
      unsubDisconnected()
      unsubNewOrder()
    }
  }

  const updateStatus = () => {
    const status = localHubClient.getStatus()
    setHubStatus({
      isConnected: status.isConnected,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectedDevices: status.connectedDevices || [],
      lastSync: status.lastSync
    })
  }

  const handleNewOrder = (data) => {
    setRecentOrders(prev => [data.order, ...prev].slice(0, 5))
  }

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = Math.floor((now - date) / 1000)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return date.toLocaleTimeString()
  }

  const switchToNormalMode = () => {
    if (confirm('Switch to normal staff dashboard? The hub will stop coordinating orders.')) {
      router.push('/dashboard')
    }
  }

  if (!staffSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  const { isConnected, isOnline, connectedDevices } = hubStatus

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 text-white">
      {/* Header */}
      <div className="w-full max-w-4xl mb-12">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">🍽️ Veno App Station</h1>
            <p className="text-slate-400">Local Network Coordinator</p>
          </div>
          <button
            onClick={switchToNormalMode}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
          >
            Switch to Normal Dashboard
          </button>
        </div>
      </div>

      {/* Main Status Circle */}
      <div className="w-full max-w-4xl mb-16">
        <div className="flex flex-col items-center justify-center py-16">
          {/* Animated Status Circle */}
          <div className="relative mb-8">
            <div
              className={`w-48 h-48 rounded-full flex items-center justify-center ${
                isOnline ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}
            >
              <div
                className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  isOnline ? 'bg-green-500/30' : 'bg-red-500/30'
                } animate-pulse`}
              >
                <div
                  className={`w-20 h-20 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
            </div>
            {/* Pulse animation */}
            {isOnline && (
              <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
            )}
          </div>

          {/* Status Text */}
          <h2 className="text-5xl font-bold mb-4">
            {isOnline ? 'Connected' : 'Offline'}
          </h2>
          <p className="text-xl text-slate-400">
            {isOnline
              ? 'Hub is active and coordinating local network sync'
              : 'Hub is offline - devices will use cloud sync'}
          </p>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="w-full max-w-4xl mb-12">
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <span>📱</span>
            <span>{connectedDevices.length} Connected Devices</span>
          </h3>

          {connectedDevices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📡</div>
              <p className="text-slate-400 text-lg">
                Waiting for staff devices to connect...
              </p>
              <p className="text-slate-500 text-sm mt-2">
                Devices will auto-connect when they open the app
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedDevices.map((device, index) => (
                <div
                  key={device.deviceId || index}
                  className="bg-slate-900/50 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-lg">{device.deviceName}</h4>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        device.deviceRole === 'kitchen'
                          ? 'bg-orange-500/20 text-orange-300'
                          : device.deviceRole === 'bar'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {device.deviceRole}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Connected {formatTime(device.connectedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-2">🌐 Internet</div>
          <div className="text-2xl font-bold">
            {isOnline ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-2">☁️ Last Sync</div>
          <div className="text-2xl font-bold">
            {formatTime(hubStatus.lastSync)}
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
          <div className="text-slate-400 text-sm mb-2">📍 Status</div>
          <div className="text-2xl font-bold text-green-400">Active</div>
        </div>
      </div>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="w-full max-w-4xl mt-12">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
            <h3 className="text-2xl font-semibold mb-6">📋 Recent Orders</h3>
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <div
                  key={order.client_id || index}
                  className="bg-slate-900/50 rounded-lg p-4 border border-slate-700"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm text-blue-400">
                      #{order.client_id?.slice(0, 8)}
                    </span>
                    <span className="text-slate-400 text-sm">
                      ${order.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
