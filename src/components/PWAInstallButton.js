'use client'

import { useState, useEffect } from 'react'

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [showComponent, setShowComponent] = useState(false)

  useEffect(() => {
    // Show component after mount (client-side only)
    setShowComponent(true)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if PWA is supported
    setIsSupported('beforeinstallprompt' in window)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      console.log('PWA: beforeinstallprompt event fired')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      console.log('PWA: App installed')
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Don't render on server
  if (!showComponent) {
    return null
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
      setIsInstalled(true)
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
  }

  // If already installed, show success message
  if (isInstalled) {
    return (
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Install Veno App App</h2>
            <p className="text-sm text-slate-500">
              Access Veno App from your home screen for a faster, app-like experience
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Installed</span>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="font-semibold text-green-900 mb-1">Veno App is Installed!</h3>
            <p className="text-sm text-green-800">
              You can now access Veno App from your home screen, dock, or app drawer. It works offline and loads faster than the browser version.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Always show manual instructions if no install prompt (development mode or iOS)
  if (!deferredPrompt) {
    return (
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Install Veno App App</h2>
            <p className="text-sm text-slate-500">
              Access Veno App from your home screen for a faster, app-like experience
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>Manual</span>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <svg className="w-5 h-5 text-[#6262bd] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">Works Offline</h4>
              <p className="text-xs text-slate-500">Access even without internet</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <svg className="w-5 h-5 text-[#6262bd] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">Faster Loading</h4>
              <p className="text-xs text-slate-500">Instant access from home screen</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Installation Instructions</h3>
              <div className="text-sm text-blue-800 space-y-3">
                <div>
                  <p className="font-semibold mb-1">On iPhone/iPad (Safari):</p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Tap the Share button (square with arrow)</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add"</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold mb-1">On Android (Chrome):</p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Tap the three dots menu (⋮)</li>
                    <li>Tap "Install app" or "Add to Home screen"</li>
                    <li>Tap "Install"</li>
                  </ol>
                </div>
                <div>
                  <p className="font-semibold mb-1">On Desktop (Chrome/Edge):</p>
                  <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>Look for the install icon (⊕) in the address bar</li>
                    <li>Click "Install"</li>
                  </ol>
                </div>
              </div>
              <p className="text-xs text-blue-700 mt-3 italic">
                Note: In production (HTTPS), you'll see an automatic install button instead.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If install prompt is available
  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">Install Veno App App</h2>
          <p className="text-sm text-slate-500">
            Access Veno App from your home screen for a faster, app-like experience
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          <span>Available</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <svg className="w-5 h-5 text-[#6262bd] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">Works Offline</h4>
              <p className="text-xs text-slate-500">Access even without internet</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <svg className="w-5 h-5 text-[#6262bd] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">Faster Loading</h4>
              <p className="text-xs text-slate-500">Instant access from home screen</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <svg className="w-5 h-5 text-[#6262bd] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">No Browser UI</h4>
              <p className="text-xs text-slate-500">Full-screen app experience</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <svg className="w-5 h-5 text-[#6262bd] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <div>
              <h4 className="font-semibold text-slate-700 text-sm">Auto-Updates</h4>
              <p className="text-xs text-slate-500">Always the latest version</p>
            </div>
          </div>
        </div>

        {/* Install Button */}
        <button
          onClick={handleInstallClick}
          disabled={!deferredPrompt}
          className="w-full bg-gradient-to-r from-[#6262bd] to-[#8b5cf6] text-white py-4 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
          </svg>
          <span>Install Veno App App</span>
        </button>

        {/* Note */}
        <p className="text-xs text-slate-500 text-center">
          Veno App will be installed on your device. You can uninstall it anytime from your device settings.
        </p>
      </div>
    </div>
  )
}
