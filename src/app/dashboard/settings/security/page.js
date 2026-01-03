'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import PWAInstallButton from '@/components/PWAInstallButton'
import QRCode from 'qrcode'

export default function Security() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [staffLoginPassword, setStaffLoginPassword] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get restaurant (owners only)
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (ownedRestaurant) {
        setRestaurant(ownedRestaurant)
        setStaffLoginPassword(ownedRestaurant.staff_login_password || '')
      }
      setLoading(false)
    }
    fetchRestaurant()
  }, [])

  // Generate QR code for staff login
  useEffect(() => {
    if (typeof window !== 'undefined' && canvasRef.current) {
      const staffLoginUrl = `${window.location.origin}/staff-login`
      setQrCodeUrl(staffLoginUrl)

      QRCode.toCanvas(canvasRef.current, staffLoginUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#6262bd',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR Code generation error:', error)
      })
    }
  }, [])

  const copyStaffLink = () => {
    if (qrCodeUrl) {
      navigator.clipboard.writeText(qrCodeUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setStaffLoginPassword(password)
    setShowPassword(true)
  }

  const handleSave = async () => {
    if (!staffLoginPassword || staffLoginPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('restaurants')
      .update({ staff_login_password: staffLoginPassword })
      .eq('id', restaurant.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update password' })
    } else {
      setMessage({ type: 'success', text: 'Staff login password updated successfully!' })
      setRestaurant({ ...restaurant, staff_login_password: staffLoginPassword })
    }
    setSaving(false)
  }

  const getStaffLoginUrl = () => {
    if (typeof window === 'undefined' || !restaurant) return ''
    return `${window.location.origin}/r/${restaurant.slug}/auth/staff-login`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          Only restaurant owners can access settings.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Security & Authentication</h1>
        <p className="text-slate-500">Manage staff login security and access control</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-600'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Staff Login Security Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Staff Login Security</h2>
            <p className="text-sm text-slate-500">
              Set a password that staff members must enter before using their PIN codes.
              This prevents unauthorized access to your staff login page.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>Secure</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Staff Login URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Staff Login URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-[#6262bd] text-sm break-all">
                  {getStaffLoginUrl()}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(getStaffLoginUrl())}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Share this URL with your staff. They'll need the password below to access it.
            </p>
          </div>

          {/* Staff Login Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Staff Login Password
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={staffLoginPassword}
                  onChange={(e) => setStaffLoginPassword(e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] font-mono bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  )}
                </button>
              </div>
              <button
                onClick={generatePassword}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Staff must enter this password before they can use their PIN codes to log in.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !staffLoginPassword || staffLoginPassword.length < 6}
              className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </div>
      </div>

      {/* PWA Install Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Manager/Owner App */}
        <div>
          <div className="bg-gradient-to-r from-[#6262bd] to-[#8b5cf6] text-white rounded-t-2xl p-4">
            <h3 className="font-bold text-lg">Manager App</h3>
            <p className="text-sm opacity-90">Full dashboard access for restaurant management</p>
          </div>
          <PWAInstallButton />
        </div>

        {/* Staff App */}
        <div>
          <div className="bg-gradient-to-r from-[#8b5cf6] to-[#a78bfa] text-white rounded-t-2xl p-4">
            <h3 className="font-bold text-lg">Staff App</h3>
            <p className="text-sm opacity-90">Share with your team to install their app</p>
          </div>
          <div className="bg-white border-2 border-slate-100 border-t-0 rounded-b-2xl p-6">
            <div className="space-y-4">
              {/* QR Code Section */}
              <div className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl">
                <p className="text-sm font-semibold text-slate-700 mb-3">Scan to Install Staff App</p>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <canvas ref={canvasRef} />
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">Staff can scan this QR code to access the login page</p>
              </div>

              {/* Link Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 mb-2">Or Share This Link</h4>
                    <div className="flex gap-2">
                      <div className="flex-1 bg-white border border-blue-300 rounded-lg p-3 font-mono text-xs break-all">
                        {qrCodeUrl || 'Loading...'}
                      </div>
                      <button
                        onClick={copyStaffLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-sm font-medium"
                      >
                        {copied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-blue-700 mt-3">
                      Staff will login with the password you set above, then install the app.
                    </p>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl text-center">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>
                  </svg>
                  <div>
                    <h5 className="font-semibold text-slate-700 text-xs">View Rota</h5>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl text-center">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
                  </svg>
                  <div>
                    <h5 className="font-semibold text-slate-700 text-xs">Time Off</h5>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 bg-slate-50 rounded-xl text-center">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <div>
                    <h5 className="font-semibold text-slate-700 text-xs">Availability</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6 mt-6">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <div>
            <h3 className="font-bold text-blue-900 mb-2">How Staff Login Works</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Staff navigate to your restaurant's login URL</li>
              <li>They enter the restaurant password (one-time per session)</li>
              <li>They enter their personal 3-digit PIN code</li>
              <li>They access their dashboard</li>
            </ol>
            <p className="text-sm text-blue-800 mt-3">
              <strong>Security tip:</strong> Change this password regularly and only share it with trusted staff members.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
