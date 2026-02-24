'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Force edge runtime for Cloudflare Pages
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default function InstallApp() {
  const params = useParams()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [platformLogo, setPlatformLogo] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch restaurant
      const { data: rest } = await supabase
        .from('restaurants')
        .select('name, logo_url, slug')
        .eq('slug', params.slug)
        .single()

      if (rest) {
        setRestaurant(rest)
      }

      // Fetch platform branding
      const { data: branding } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'branding')
        .single()

      if (branding?.value?.logo_url) {
        setPlatformLogo(branding.value.logo_url)
      }

      setLoading(false)
    }

    fetchData()

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))
    setIsAndroid(/android/.test(userAgent))

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [params.slug])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    )
  }

  const logoSrc = restaurant?.logo_url || platformLogo || null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={restaurant?.name || 'App'}
              className="w-24 h-24 object-contain rounded-2xl"
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] rounded-2xl flex items-center justify-center">
              <span className="text-white text-4xl font-bold">M</span>
            </div>
          )}
        </div>

        <h1 className="text-2xl font-bold text-slate-800 text-center mb-2">
          Install Staff App
        </h1>
        <p className="text-slate-500 text-center mb-8">
          {restaurant?.name || 'Menu Hub'}
        </p>

        {isInstalled ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            <h2 className="text-xl font-bold text-green-800 mb-2">App Installed!</h2>
            <p className="text-green-700">
              You can now find the app on your home screen. Open it to log in.
            </p>
            <a
              href={`/r/${params.slug}/auth/staff-login`}
              className="inline-block mt-4 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Go to Login
            </a>
          </div>
        ) : deferredPrompt ? (
          <div className="space-y-4">
            <button
              onClick={handleInstall}
              className="w-full bg-gradient-to-r from-[#6262bd] to-[#8b5cf6] text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Install App Now
            </button>
            <p className="text-sm text-slate-500 text-center">
              Tap the button above to install the app on your device
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {isIOS && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Install on iPhone/iPad
                </h3>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Tap the <strong>Share</strong> button <span className="inline-block w-5 h-5 bg-blue-200 rounded text-center align-middle text-xs leading-5">↑</span> at the bottom of Safari</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> in the top right corner</li>
                </ol>
              </div>
            )}

            {isAndroid && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
                <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.54-.22.83L6.4 9.48C3.3 11.25 1.28 14.44 1 18h22c-.28-3.56-2.3-6.75-5.4-8.52zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
                  </svg>
                  Install on Android
                </h3>
                <ol className="text-sm text-green-800 space-y-2 list-decimal list-inside">
                  <li>Tap the <strong>menu</strong> button <span className="inline-block px-1 bg-green-200 rounded text-xs">⋮</span> in Chrome</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                  <li>Tap <strong>"Install"</strong> to confirm</li>
                </ol>
              </div>
            )}

            {!isIOS && !isAndroid && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                  </svg>
                  Install on Desktop
                </h3>
                <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                  <li>Look for the <strong>install icon</strong> in your browser's address bar</li>
                  <li>Click <strong>"Install"</strong> when prompted</li>
                  <li>The app will open in its own window</li>
                </ol>
              </div>
            )}

            {/* Features */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-semibold text-slate-700 mb-4 text-center">Why Install?</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-sm text-slate-700">Works Offline</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  </svg>
                  <span className="text-sm text-slate-700">Faster Access</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  </svg>
                  <span className="text-sm text-slate-700">Push Alerts</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <svg className="w-5 h-5 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
                  </svg>
                  <span className="text-sm text-slate-700">Full Screen</span>
                </div>
              </div>
            </div>

            {/* Skip link */}
            <div className="text-center pt-4">
              <a
                href={`/r/${params.slug}/auth/staff-login`}
                className="text-sm text-slate-500 hover:text-[#6262bd] underline"
              >
                Skip and continue in browser
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
