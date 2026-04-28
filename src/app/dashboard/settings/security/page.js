'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRestaurant } from '@/lib/RestaurantContext'
import PWAInstallButton from '@/components/PWAInstallButton'
import QRCode from 'qrcode'
import ConnectedDevicesPanel from '@/components/ConnectedDevicesPanel'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'
import InfoTooltip from '@/components/InfoTooltip'
import OfflinePageGuard from '@/components/OfflinePageGuard'

export default function Security() {
  const t = useTranslations('security')
  const tg = useTranslations('guide')
  const tc = useTranslations('common')
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()
  const orderingEnabled = restaurantCtx?.enabledModules?.ordering !== false
  const reservationsEnabled = restaurantCtx?.enabledModules?.reservations !== false
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [staffLoginPassword, setStaffLoginPassword] = useState('')
  const [loginQrUrl, setLoginQrUrl] = useState('')
  const [installQrUrl, setInstallQrUrl] = useState('')
  const [copiedLogin, setCopiedLogin] = useState(false)
  const [copiedInstall, setCopiedInstall] = useState(false)
  const [copiedTakeaway, setCopiedTakeaway] = useState(false)
  const [copiedDineIn, setCopiedDineIn] = useState(false)
  const [copiedBooking, setCopiedBooking] = useState(false)
  const loginCanvasRef = useRef(null)
  const installCanvasRef = useRef(null)

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    const r = restaurantCtx.restaurant
    setRestaurant(r)
    setStaffLoginPassword(r.staff_login_password || '')
    setLoading(false)
  }, [restaurantCtx])

  // Generate QR codes for staff login and app install
  useEffect(() => {
    if (typeof window !== 'undefined' && restaurant) {
      const staffLoginUrl = `${window.location.origin}/r/${restaurant.slug}/auth/staff-login`
      const staffInstallUrl = `${window.location.origin}/r/${restaurant.slug}/install`
      setLoginQrUrl(staffLoginUrl)
      setInstallQrUrl(staffInstallUrl)

      // Generate login QR code
      if (loginCanvasRef.current) {
        QRCode.toCanvas(loginCanvasRef.current, staffLoginUrl, {
          width: 180,
          margin: 2,
          color: {
            dark: '#6262bd',
            light: '#ffffff'
          }
        }, (error) => {
          if (error) console.error('Login QR Code generation error:', error)
        })
      }

      // Generate install QR code
      if (installCanvasRef.current) {
        QRCode.toCanvas(installCanvasRef.current, staffInstallUrl, {
          width: 180,
          margin: 2,
          color: {
            dark: '#059669',
            light: '#ffffff'
          }
        }, (error) => {
          if (error) console.error('Install QR Code generation error:', error)
        })
      }
    }
  }, [restaurant])

  const copyLoginLink = () => {
    if (loginQrUrl) {
      navigator.clipboard.writeText(loginQrUrl)
      setCopiedLogin(true)
      setTimeout(() => setCopiedLogin(false), 2000)
    }
  }

  const copyInstallLink = () => {
    if (installQrUrl) {
      navigator.clipboard.writeText(installQrUrl)
      setCopiedInstall(true)
      setTimeout(() => setCopiedInstall(false), 2000)
    }
  }

  const getTakeawayMenuUrl = () => {
    if (typeof window === 'undefined' || !restaurant) return ''
    return `${window.location.origin}/${restaurant.slug}/takeaway`
  }

  const copyTakeawayLink = () => {
    const url = getTakeawayMenuUrl()
    if (url) {
      navigator.clipboard.writeText(url)
      setCopiedTakeaway(true)
      setTimeout(() => setCopiedTakeaway(false), 2000)
    }
  }

  const getDineInMenuUrl = () => {
    if (typeof window === 'undefined' || !restaurant) return ''
    return `${window.location.origin}/${restaurant.slug}/menu`
  }

  const copyDineInLink = () => {
    const url = getDineInMenuUrl()
    if (url) {
      navigator.clipboard.writeText(url)
      setCopiedDineIn(true)
      setTimeout(() => setCopiedDineIn(false), 2000)
    }
  }

  const getBookingUrl = () => {
    if (typeof window === 'undefined' || !restaurant) return ''
    return `${window.location.origin}/${restaurant.slug}/book`
  }

  const copyBookingLink = () => {
    const url = getBookingUrl()
    if (url) {
      navigator.clipboard.writeText(url)
      setCopiedBooking(true)
      setTimeout(() => setCopiedBooking(false), 2000)
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
        <div className="text-zinc-500 dark:text-zinc-400">{tc('loading') || 'Loading...'}</div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 text-red-600">
          {t('accessDenied') || 'Only restaurant owners can access settings.'}
        </div>
      </div>
    )
  }

  return (
    <OfflinePageGuard>
    <div>
      <PageTabs tabs={settingsTabs} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">{t('title') || 'Security & Authentication'}<InfoTooltip text={tg('security_desc')} /></h1>
        <p className="text-zinc-500 dark:text-zinc-400">{t('subtitle') || 'Manage staff login security and access control'}</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-sm border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-600'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Connected Devices Panel */}
      <ConnectedDevicesPanel restaurantId={restaurant.id} />

      {/* Staff Login Security Section */}
      {orderingEnabled && <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">{t('staffLoginSecurity') || 'Staff Login Security'}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t('staffLoginSecurityDesc') || 'Set a password that staff members must enter before using their PIN codes. This prevents unauthorized access to your staff login page.'}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-sm text-sm font-medium ml-4 shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>{t('secure') || 'Secure'}</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Staff Login URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('staffLoginUrl') || 'Staff Login URL'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 p-3 bg-zinc-50 dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <code className="text-[#6262bd] text-sm break-all">
                  {getStaffLoginUrl()}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(getStaffLoginUrl())}
                className="w-full sm:w-auto px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 rounded-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors shrink-0"
              >
                {tc('copy') || 'Copy'}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {t('staffLoginUrlDesc') || "Share this URL with your staff. They'll need the password below to access it."}
            </p>
          </div>

          {/* Staff Login Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              {t('staffLoginPassword') || 'Staff Login Password'}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={staffLoginPassword}
                  onChange={(e) => setStaffLoginPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder') || 'Enter password (min 6 characters)'}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] font-mono bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 dark:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400"
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
                className="w-full sm:w-auto px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 rounded-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
              >
                {t('generate') || 'Generate'}
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {t('passwordHint') || 'Staff must enter this password before they can use their PIN codes to log in.'}
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !staffLoginPassword || staffLoginPassword.length < 6}
              className="w-full bg-[#6262bd] text-white py-3 rounded-sm font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (tc('saving') || 'Saving...') : (t('savePassword') || 'Save Password')}
            </button>
          </div>
        </div>
      </div>}

      {/* Staff App Section */}
      {orderingEnabled && <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-1">{t('staffApp') || 'Staff App'}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('staffAppDesc') || 'Share with your team to install their app or open the login page'}</p>
        </div>

        {/* QR Codes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col items-center p-4 bg-zinc-50 dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-3 uppercase tracking-wide">{t('installApp') || 'Install App'}</p>
            <div className="bg-white dark:bg-zinc-900 p-2 rounded-sm shadow-sm mb-3">
              <canvas ref={installCanvasRef} />
            </div>
            <div className="flex gap-2 w-full">
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm px-2 py-1.5 font-mono text-xs break-all text-zinc-600 dark:text-zinc-400 overflow-hidden">
                {installQrUrl || '...'}
              </div>
              <button
                onClick={copyInstallLink}
                className="px-3 py-1.5 bg-[#6262bd] text-white rounded-sm hover:bg-[#5252a3] transition-colors text-xs font-medium shrink-0"
              >
                {copiedInstall ? (tc('copied') || 'Copied!') : (tc('copy') || 'Copy')}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center p-4 bg-zinc-50 dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-3 uppercase tracking-wide">{t('loginPage') || 'Login Page'}</p>
            <div className="bg-white dark:bg-zinc-900 p-2 rounded-sm shadow-sm mb-3">
              <canvas ref={loginCanvasRef} />
            </div>
            <div className="flex gap-2 w-full">
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm px-2 py-1.5 font-mono text-xs break-all text-zinc-600 dark:text-zinc-400 overflow-hidden">
                {loginQrUrl || '...'}
              </div>
              <button
                onClick={copyLoginLink}
                className="px-3 py-1.5 bg-[#6262bd] text-white rounded-sm hover:bg-[#5252a3] transition-colors text-xs font-medium shrink-0"
              >
                {copiedLogin ? (tc('copied') || 'Copied!') : (tc('copy') || 'Copy')}
              </button>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900 rounded-sm p-4 border border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">{t('howStaffLoginWorks') || 'How it works'}</p>
          <ol className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 list-decimal list-inside">
            <li>{t('loginSteps.step1') || 'Staff scan the Install App QR code to download the app'}</li>
            <li>{t('loginSteps.step2') || 'Or scan the Login Page QR code to use in browser'}</li>
            <li>{t('loginSteps.step3') || 'They enter the restaurant password (one-time per session)'}</li>
            <li>{t('loginSteps.step4') || 'They enter their personal 3-digit PIN code'}</li>
          </ol>
        </div>
      </div>}

      {/* Customer Links Section */}
      {(orderingEnabled || reservationsEnabled) && <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6 mb-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-1">{t('customerLinks') || 'Customer Links'}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('customerLinksDesc') || 'Share these links on your website, social media, or Google Business Profile.'}</p>
        </div>
        <div className="space-y-3">
          {[
            ...(orderingEnabled ? [
              {
                label: t('takeawayMenu') || 'Takeaway Menu',
                url: getTakeawayMenuUrl(),
                onCopy: copyTakeawayLink,
                copied: copiedTakeaway,
                badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
              },
              {
                label: t('dineInMenu') || 'Dine-In Menu',
                url: getDineInMenuUrl(),
                onCopy: copyDineInLink,
                copied: copiedDineIn,
                badge: 'bg-emerald-100 text-emerald-700',
              },
            ] : []),
            ...(reservationsEnabled ? [
              {
                label: t('bookingPage') || 'Reservations',
                url: getBookingUrl(),
                onCopy: copyBookingLink,
                copied: copiedBooking,
                badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
              },
            ] : []),
          ].map(({ label, url, onCopy, copied, badge }) => (
            <div key={label} className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 dark:bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-sm shrink-0 ${badge}`}>{label}</span>
              <code className="flex-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">{url || '...'}</code>
              <button
                onClick={onCopy}
                className="px-3 py-1.5 bg-white border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 rounded-sm text-xs font-medium text-zinc-700 dark:text-zinc-300 transition-colors shrink-0"
              >
                {copied ? (tc('copied') || 'Copied!') : (tc('copy') || 'Copy')}
              </button>
            </div>
          ))}
        </div>
      </div>}
    </div>
    </OfflinePageGuard>
  )
}
