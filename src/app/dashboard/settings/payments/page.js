'use client'

import { useState, useEffect } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function PaymentsSettingsPage() {
  const restaurantCtx = useRestaurant()
  const restaurant = restaurantCtx?.restaurant
  const searchParams = useSearchParams()

  const [status, setStatus] = useState(null) // null | { connected, onboarded, chargesEnabled, payoutsEnabled }
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [notification, setNotification] = useState(null)

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  useEffect(() => {
    if (!restaurant?.id) return

    // Handle return from Stripe onboarding
    const connected = searchParams.get('connected')
    const refresh = searchParams.get('refresh')

    if (connected === '1') {
      showNotification('success', 'Stripe account connected successfully!')
    } else if (refresh === '1') {
      showNotification('error', 'Onboarding incomplete. Please try again to finish connecting your account.')
    }

    fetchStatus()
  }, [restaurant?.id])

  const fetchStatus = async () => {
    if (!restaurant?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/stripe-connect/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      })
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false, onboarded: false })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!restaurant?.id) return
    setConnecting(true)
    try {
      const res = await fetch('/api/stripe-connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: restaurant.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        showNotification('error', data.detail || data.error || 'Failed to start Stripe onboarding')
        setConnecting(false)
      }
    } catch {
      showNotification('error', 'Something went wrong. Please try again.')
      setConnecting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Back */}
      <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#6262bd] mb-6 transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Settings
      </Link>

      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Payments</h1>
      <p className="text-slate-500 dark:text-slate-400 mb-8">
        Connect your Stripe account to collect booking deposits from customers. Deposits go directly to your bank account.
      </p>

      {/* Notification */}
      {notification && (
        <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${
          notification.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {notification.type === 'success'
            ? <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            : <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          }
          <span>{notification.message}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-400">
          Checking connection status...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status card */}
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#635bff]/10 rounded-xl flex items-center justify-center">
                  {/* Stripe logo mark */}
                  <svg className="w-6 h-6 text-[#635bff]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.518-1.003 1.329-1.003 1.56 0 3.152.658 4.278 1.226l.627-3.85C16.032 3.667 14.386 3 12.071 3 9.332 3 7.164 4.596 7.164 7.253c0 2.462 1.714 3.59 4.197 4.455 1.714.574 2.287 1.072 2.287 1.784 0 .71-.621 1.128-1.717 1.128-1.514 0-3.41-.694-4.668-1.535l-.659 3.899C7.842 17.887 9.749 18.5 12.26 18.5c2.859 0 5.076-1.451 5.076-4.323-.003-2.691-1.759-3.74-3.857-4.294z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-200">Stripe Connect</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Powered by Stripe</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                status?.onboarded
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300'
                  : status?.connected
                  ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
              }`}>
                {status?.onboarded ? 'Connected' : status?.connected ? 'Incomplete' : 'Not connected'}
              </span>
            </div>

            {status?.onboarded ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <span>Payments enabled — deposits go directly to your bank</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  <span>Payouts {status.payoutsEnabled ? 'active' : 'pending — Stripe may need more info'}</span>
                </div>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="mt-2 text-sm text-[#6262bd] hover:underline disabled:opacity-50"
                >
                  {connecting ? 'Loading...' : 'Update account details →'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {status?.connected
                    ? 'Your Stripe account setup is incomplete. Click below to finish.'
                    : 'Connect your Stripe account to start collecting booking deposits. Your bank details are entered directly with Stripe — we never see them.'}
                </p>
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-[#635bff] text-white py-3 rounded-xl font-medium hover:bg-[#5851db] disabled:opacity-50 transition-colors"
                >
                  {connecting ? 'Redirecting to Stripe...' : status?.connected ? 'Complete Stripe setup' : 'Connect with Stripe'}
                </button>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">How booking deposits work</h3>
            <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-[#6262bd] text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
                <span>You mark a customer as requiring a deposit in the reservations dashboard (blacklist → fee required)</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-[#6262bd] text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
                <span>When that customer books, they're asked to pay the deposit before their booking is accepted</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-[#6262bd] text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
                <span>The customer is informed the deposit will be deducted from their bill and is non-refundable if they don't show up</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-5 h-5 bg-[#6262bd] text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
                <span>Funds land in your connected Stripe account and are paid out to your bank on Stripe's standard schedule</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
