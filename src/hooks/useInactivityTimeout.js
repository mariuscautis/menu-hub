'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'inactivity_timeout_ms'
const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000 // 3 minutes
const DISABLED_VALUE = 'disabled'

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click', 'pointerdown']

export function getInactivityTimeoutSetting() {
  if (typeof window === 'undefined') return DEFAULT_TIMEOUT_MS
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === DISABLED_VALUE) return DISABLED_VALUE
  const parsed = parseInt(stored, 10)
  return !isNaN(parsed) && parsed >= 10000 ? parsed : DEFAULT_TIMEOUT_MS
}

export function setInactivityTimeoutSetting(value) {
  if (typeof window === 'undefined') return
  if (value === DISABLED_VALUE) {
    localStorage.setItem(STORAGE_KEY, DISABLED_VALUE)
  } else {
    localStorage.setItem(STORAGE_KEY, String(value))
  }
}

export function useInactivityTimeout({ enabled = true } = {}) {
  const router = useRouter()
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const rafRef = useRef(null)

  const [progress, setProgress] = useState(1) // 1 = full, 0 = empty
  const [setting, setSetting] = useState(() => getInactivityTimeoutSetting())
  const [timeRemaining, setTimeRemaining] = useState(null)

  const isDisabled = setting === DISABLED_VALUE || !enabled

  const doLogout = useCallback(() => {
    const staffSessionData = localStorage.getItem('staff_session')
    let redirectUrl = '/auth/login'
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        if (staffSession.restaurant?.slug) {
          redirectUrl = `/r/${staffSession.restaurant.slug}/auth/staff-login`
        }
      } catch {}
    }
    // Preserve the restaurant password so the login page skips straight to PIN entry
    let restaurantAuthKey = null
    let restaurantAuthValue = null
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        if (staffSession.restaurant_id) {
          restaurantAuthKey = `restaurant_auth_${staffSession.restaurant_id}`
          restaurantAuthValue = sessionStorage.getItem(restaurantAuthKey)
        }
      } catch {}
    }

    localStorage.removeItem('staff_session')
    localStorage.removeItem('session_token')
    sessionStorage.clear()
    sessionStorage.setItem('logout_reason', 'Signed out due to inactivity.')

    // Restore restaurant auth so the PIN page is shown (not the password page)
    if (restaurantAuthKey && restaurantAuthValue !== null) {
      sessionStorage.setItem(restaurantAuthKey, restaurantAuthValue)
    }

    router.push(redirectUrl)
  }, [router])

  const resetTimer = useCallback(() => {
    if (isDisabled) return
    const timeoutMs = setting
    if (typeof timeoutMs !== 'number') return

    clearTimeout(timerRef.current)
    cancelAnimationFrame(rafRef.current)

    startTimeRef.current = Date.now()
    setProgress(1)
    setTimeRemaining(Math.ceil(timeoutMs / 1000))

    timerRef.current = setTimeout(() => {
      doLogout()
    }, timeoutMs)

    // Animate the progress ring smoothly via rAF
    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, timeoutMs - elapsed)
      const p = remaining / timeoutMs
      setProgress(p)
      setTimeRemaining(Math.ceil(remaining / 1000))
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [isDisabled, setting, doLogout])

  // Start/reset on mount and whenever setting changes
  useEffect(() => {
    if (isDisabled) {
      clearTimeout(timerRef.current)
      cancelAnimationFrame(rafRef.current)
      setProgress(1)
      setTimeRemaining(null)
      return
    }
    resetTimer()
    return () => {
      clearTimeout(timerRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [isDisabled, setting, resetTimer])

  // Listen for activity events
  useEffect(() => {
    if (isDisabled) return
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, resetTimer, { passive: true }))
    return () => {
      ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, resetTimer))
    }
  }, [isDisabled, resetTimer])

  const updateSetting = useCallback((value) => {
    setInactivityTimeoutSetting(value)
    setSetting(value)
  }, [])

  return { progress, timeRemaining, setting, updateSetting, resetTimer }
}
