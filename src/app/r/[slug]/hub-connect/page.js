'use client'
export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'

/**
 * Hub Connect Landing Page
 * Opened when a staff member scans the hub QR code with their native camera.
 * Extracts the connection data from the URL and redirects to the dashboard
 * where the WebRTC connection will be established.
 */
export default function HubConnectPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = params.slug

  const [status, setStatus] = useState('loading') // 'loading' | 'redirecting' | 'error'
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    const data = searchParams.get('data')

    if (!data) {
      setStatus('error')
      setErrorMsg('No connection data found in the QR code. Please ask the hub manager to generate a new QR code.')
      return
    }

    try {
      // Validate that the data is valid base64 JSON
      const decoded = atob(data)
      const parsed = JSON.parse(decoded)

      if (!parsed.hubId || !parsed.offerId) {
        throw new Error('Invalid connection data structure')
      }

      // Store the connection data so HubConnectionStatus can pick it up
      sessionStorage.setItem('pending_hub_connection', data)

      setStatus('redirecting')

      // If already logged in, go straight to dashboard; otherwise to login
      const session = localStorage.getItem('staff_session')
      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace(`/r/${slug}/auth/staff-login`)
      }
    } catch (err) {
      console.error('[HubConnect] Failed to parse connection data:', err)
      setStatus('error')
      setErrorMsg('The QR code data appears to be corrupted. Please ask the hub manager to generate a new code.')
    }
  }, [searchParams, slug, router])

  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          {/* Spinner */}
          <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
          <h1 className="text-2xl font-bold">Connecting to Hub</h1>
          <p className="text-slate-400">
            {status === 'redirecting'
              ? 'Connection data found — taking you to the app…'
              : 'Reading connection data…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Connection Failed</h1>
        <p className="text-slate-400 text-sm">{errorMsg}</p>
        <button
          onClick={() => router.push(`/r/${slug}/auth/staff-login`)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-colors"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}
