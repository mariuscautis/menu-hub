'use client'

import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      // Show the install prompt after a delay
      setTimeout(() => {
        setShowPrompt(true)
      }, 3000) // Show after 3 seconds
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

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
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for 7 days
    localStorage.setItem('pwa-install-dismissed', new Date().getTime())
  }

  // Check if user dismissed recently
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const now = new Date().getTime()
      const sevenDays = 7 * 24 * 60 * 60 * 1000

      if (now - dismissedTime < sevenDays) {
        setShowPrompt(false)
        return
      }
    }
  }, [])

  if (!showPrompt || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-[#6262bd] to-[#8b5cf6] rounded-2xl shadow-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white/20 rounded-xl p-3 flex-shrink-0">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
              <circle cx="12" cy="14" r="2"/>
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">Install Menu Hub</h3>
            <p className="text-sm text-white/90 mb-4">
              Install this app on your device for a better experience. Works offline and loads faster!
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-white text-[#6262bd] px-4 py-2.5 rounded-xl font-semibold hover:bg-white/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 rounded-xl font-medium hover:bg-white/10 transition-colors"
              >
                Later
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
