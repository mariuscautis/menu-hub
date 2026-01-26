'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Session validation reasons that require logout
const LOGOUT_REASONS = {
  session_blocked: 'Your session has been blocked by the restaurant manager.',
  session_not_found: 'Your session has expired or was signed out remotely.',
  session_expired: 'Your session has expired. Please log in again.'
}

export function useSessionValidator(options = {}) {
  const {
    enabled = true,
    validateOnMount = true,
    validateInterval = 60000, // Validate every 60 seconds by default
    onSessionInvalid = null
  } = options

  const router = useRouter()
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidation, setLastValidation] = useState(null)
  const [sessionStatus, setSessionStatus] = useState('unknown') // 'unknown', 'valid', 'invalid'

  const validateSession = useCallback(async () => {
    if (typeof window === 'undefined') return { valid: true }

    const sessionToken = localStorage.getItem('session_token')
    const deviceId = localStorage.getItem('device_id')
    const staffSession = localStorage.getItem('staff_session')

    // If no staff session, this is likely an owner - skip validation
    if (!staffSession) {
      setSessionStatus('valid')
      return { valid: true }
    }

    // If no session token or device ID, skip validation (legacy sessions)
    if (!sessionToken || !deviceId) {
      setSessionStatus('valid')
      return { valid: true }
    }

    setIsValidating(true)

    try {
      const response = await fetch('/api/sessions/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, deviceId })
      })

      const data = await response.json()
      setLastValidation(new Date())

      if (data.valid) {
        setSessionStatus('valid')
        return { valid: true, session: data.session }
      }

      // Session is invalid
      setSessionStatus('invalid')

      const reason = LOGOUT_REASONS[data.reason] || 'Your session is no longer valid.'

      if (onSessionInvalid) {
        onSessionInvalid(data.reason, reason)
      } else {
        // Default behavior: clear session and redirect
        handleInvalidSession(reason)
      }

      return { valid: false, reason: data.reason }

    } catch (error) {
      console.error('Session validation error:', error)
      // On network error, assume session is valid to avoid unnecessary logouts
      setSessionStatus('valid')
      return { valid: true }
    } finally {
      setIsValidating(false)
    }
  }, [onSessionInvalid])

  const handleInvalidSession = useCallback((reason) => {
    // Get redirect URL before clearing session
    const staffSessionData = localStorage.getItem('staff_session')
    let redirectUrl = '/auth/login'

    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        if (staffSession.restaurant?.slug) {
          redirectUrl = `/r/${staffSession.restaurant.slug}/auth/staff-login`
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Clear session data
    localStorage.removeItem('staff_session')
    localStorage.removeItem('session_token')
    sessionStorage.clear()

    // Store the reason for display on the login page
    sessionStorage.setItem('logout_reason', reason)

    // Redirect
    router.push(redirectUrl)
  }, [router])

  // Validate on mount
  useEffect(() => {
    if (enabled && validateOnMount) {
      validateSession()
    }
  }, [enabled, validateOnMount, validateSession])

  // Periodic validation
  useEffect(() => {
    if (!enabled || validateInterval <= 0) return

    const intervalId = setInterval(() => {
      validateSession()
    }, validateInterval)

    return () => clearInterval(intervalId)
  }, [enabled, validateInterval, validateSession])

  // Listen for storage changes (e.g., if session is cleared in another tab)
  useEffect(() => {
    if (!enabled) return

    const handleStorageChange = (e) => {
      if (e.key === 'session_token' && !e.newValue) {
        // Session token was removed
        handleInvalidSession('Your session was signed out.')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [enabled, handleInvalidSession])

  return {
    validateSession,
    isValidating,
    lastValidation,
    sessionStatus,
    handleInvalidSession
  }
}

export default useSessionValidator
