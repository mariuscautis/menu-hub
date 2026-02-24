'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Threshold for considering a session as "online" (30 minutes)
const ONLINE_THRESHOLD_MS = 30 * 60 * 1000

// Helper function to format relative time
function formatRelativeTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`

  return date.toLocaleDateString()
}

// Helper function to check if a session is currently online (active within threshold)
function isSessionOnline(lastActiveAt) {
  if (!lastActiveAt) return false
  const lastActive = new Date(lastActiveAt)
  const now = new Date()
  return (now - lastActive) < ONLINE_THRESHOLD_MS
}

// Helper function to mask IP address for privacy
function maskIpAddress(ip) {
  if (!ip || ip === 'Unknown') return 'Unknown'

  // For IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.**`
    }
  }

  // For IPv6
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length >= 4) {
      return `${parts[0]}:${parts[1]}:****:****`
    }
  }

  return ip
}

// Helper function to get device icon
function getDeviceIcon(deviceName) {
  const name = deviceName?.toLowerCase() || ''

  if (name.includes('ios') || name.includes('iphone') || name.includes('ipad')) {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15.5 1h-8C6.12 1 5 2.12 5 3.5v17C5 21.88 6.12 23 7.5 23h8c1.38 0 2.5-1.12 2.5-2.5v-17C18 2.12 16.88 1 15.5 1zm-4 21c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5-4H7V4h9v14z"/>
      </svg>
    )
  }

  if (name.includes('android')) {
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.6 11.48V11c0-2.08-1.68-3.76-3.76-3.76h-3.68C8.08 7.24 6.4 8.92 6.4 11v.48c-.88.32-1.6 1.2-1.6 2.16v3.72c0 1.32 1.08 2.4 2.4 2.4h9.6c1.32 0 2.4-1.08 2.4-2.4v-3.72c0-.96-.72-1.84-1.6-2.16zM12 4c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm-4 7v-.48c0-.88.72-1.6 1.6-1.6h4.8c.88 0 1.6.72 1.6 1.6V11H8z"/>
      </svg>
    )
  }

  // Desktop icon for Windows, macOS, Linux
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z"/>
    </svg>
  )
}

export default function ConnectedDevicesPanel({ restaurantId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null) // Track which session is being acted upon
  const [message, setMessage] = useState(null)
  const [currentSessionToken, setCurrentSessionToken] = useState(null)
  const [expanded, setExpanded] = useState(true)

  // Get current session token from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('session_token')
      setCurrentSessionToken(token)
    }
  }, [])

  // Fetch sessions
  const fetchSessions = async () => {
    if (!restaurantId) return

    try {
      const response = await fetch(`/api/sessions?restaurantId=${restaurantId}`)
      const data = await response.json()

      if (data.success) {
        setSessions(data.sessions || [])
      } else {
        console.error('Failed to fetch sessions:', data.error)
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()

    // Set up real-time subscription
    const channel = supabase
      .channel(`sessions-realtime-${restaurantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'staff_sessions',
        filter: `restaurant_id=eq.${restaurantId}`
      }, () => {
        fetchSessions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId])

  // Sign out a specific session
  const handleSignOut = async (sessionId) => {
    setActionLoading(sessionId)
    setMessage(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Device signed out successfully' })
        fetchSessions()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to sign out device' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setActionLoading(null)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Block/unblock a session
  const handleToggleBlock = async (sessionId, currentlyBlocked) => {
    setActionLoading(sessionId)
    setMessage(null)

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_blocked: !currentlyBlocked })
      })
      const data = await response.json()

      if (data.success) {
        setMessage({
          type: 'success',
          text: currentlyBlocked ? 'Device unblocked' : 'Device blocked'
        })
        fetchSessions()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update device' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setActionLoading(null)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  // Sign out all other sessions
  const handleSignOutAll = async () => {
    setActionLoading('all')
    setMessage(null)

    try {
      const response = await fetch(
        `/api/sessions?restaurantId=${restaurantId}&currentSessionToken=${currentSessionToken || ''}`,
        { method: 'DELETE' }
      )
      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'All other devices signed out' })
        fetchSessions()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to sign out devices' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setActionLoading(null)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const onlineSessionsCount = sessions.filter(s => !s.is_blocked && isSessionOnline(s.last_active_at)).length
  const inactiveSessionsCount = sessions.filter(s => !s.is_blocked && !isSessionOnline(s.last_active_at)).length
  const blockedSessionsCount = sessions.filter(s => s.is_blocked).length

  return (
    <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl mb-6 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6262bd]/10 dark:bg-[#6262bd]/20 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Connected Devices</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {loading ? 'Loading...' : (
                <>
                  <span className="text-green-600 dark:text-green-400 font-medium">{onlineSessionsCount} online</span>
                  {inactiveSessionsCount > 0 && (
                    <span className="text-slate-500 dark:text-slate-400 ml-2">{inactiveSessionsCount} inactive</span>
                  )}
                  {blockedSessionsCount > 0 && (
                    <span className="text-red-500 dark:text-red-400 ml-2">({blockedSessionsCount} blocked)</span>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && sessions.filter(s => !s.is_blocked).length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSignOutAll()
              }}
              disabled={actionLoading === 'all'}
              className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === 'all' ? 'Signing out...' : 'Sign out all others'}
            </button>
          )}
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mx-4 mb-2 p-3 rounded-xl text-sm ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Content */}
      <div className={`transition-all duration-300 ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
        {loading ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            Loading devices...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center text-slate-500 dark:text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z"/>
            </svg>
            <p>No active sessions found</p>
            <p className="text-xs mt-1">Sessions will appear here when staff log in</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
            {sessions.map((session) => {
              const isCurrentSession = session.session_token === currentSessionToken
              const isBlocked = session.is_blocked
              const isOnline = isSessionOnline(session.last_active_at)

              return (
                <div
                  key={session.id}
                  className={`p-4 ${isBlocked ? 'bg-red-50/50 dark:bg-red-900/10' : !isOnline && !isCurrentSession ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isBlocked
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : isCurrentSession || isOnline
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                      }`}>
                        {getDeviceIcon(session.device_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                            {session.device_name || 'Unknown Device'}
                          </span>
                          {isCurrentSession && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                              This device
                            </span>
                          )}
                          {!isCurrentSession && !isBlocked && isOnline && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                              Online
                            </span>
                          )}
                          {!isCurrentSession && !isBlocked && !isOnline && (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs rounded-full font-medium">
                              Inactive
                            </span>
                          )}
                          {isBlocked && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full font-medium">
                              Blocked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-sm font-medium ${
                            session.userType === 'owner'
                              ? 'text-[#6262bd] dark:text-[#8b8bdd]'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {session.userName}
                          </span>
                          {session.userDepartment && (
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded">
                              {session.userDepartment}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                          <span>Last active: {formatRelativeTime(session.last_active_at)}</span>
                          <span>IP: {maskIpAddress(session.ip_address)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {!isCurrentSession && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleBlock(session.id, session.is_blocked)}
                          disabled={actionLoading === session.id}
                          className={`p-2 rounded-lg transition-colors ${
                            isBlocked
                              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                              : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                          } disabled:opacity-50`}
                          title={isBlocked ? 'Unblock device' : 'Block device'}
                        >
                          {actionLoading === session.id ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : isBlocked ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => handleSignOut(session.id)}
                          disabled={actionLoading === session.id}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Sign out device"
                        >
                          {actionLoading === session.id ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer info */}
        {!loading && sessions.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <strong>Tip:</strong> Devices are shown as "Online" if active in the last 30 minutes. Block suspicious devices to immediately prevent access. Blocked devices cannot log in again until unblocked.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
