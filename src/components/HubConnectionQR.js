'use client'

import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/**
 * Hub Connection QR Code Component
 * Displays a QR code that staff devices can scan to connect to the hub
 */
export default function HubConnectionQR({ offerData, onNewOffer, restaurantSlug }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const canvasRef = useRef(null)
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes in seconds
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!offerData) return

    // Generate QR code
    generateQRCode(offerData)

    // Start countdown timer
    const expiryTime = offerData.timestamp + 300000 // 5 minutes
    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, Math.floor((expiryTime - now) / 1000))
      setTimeRemaining(remaining)

      if (remaining === 0) {
        clearInterval(interval)
        // Auto-generate new offer
        if (onNewOffer) {
          onNewOffer()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [offerData, onNewOffer])

  const generateQRCode = async (data) => {
    try {
      // Create connection URL with offer data
      const connectionUrl = createConnectionUrl(data)

      // Generate QR code as data URL
      // Use high error correction and larger size for better scanning on small screens
      const dataUrl = await QRCode.toDataURL(connectionUrl, {
        width: 400,
        margin: 3,
        errorCorrectionLevel: 'H', // Highest error correction - works better on small/low-res screens
        color: {
          dark: '#000000', // Pure black for maximum contrast
          light: '#ffffff'  // Pure white for maximum contrast
        }
      })

      setQrDataUrl(dataUrl)
    } catch (error) {
      console.error('[HubConnectionQR] Failed to generate QR code:', error)
    }
  }

  const createConnectionUrl = (data) => {
    // Create an HTTPS URL so native phone cameras can open it directly
    const jsonStr = JSON.stringify(data)
    const base64 = btoa(jsonStr)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const slug = restaurantSlug || data.restaurantSlug || ''
    return `${origin}/r/${slug}/hub-connect?data=${base64}`
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRefresh = () => {
    if (onNewOffer) {
      onNewOffer()
    }
  }

  const handleCopyCode = async () => {
    if (!offerData) return
    const url = createConnectionUrl(offerData)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      console.error('[HubConnectionQR] Failed to copy:', error)
    }
  }

  if (!offerData || !qrDataUrl) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-400">Generating QR code...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* QR Code */}
      <div className="bg-white p-8 rounded-2xl shadow-lg mb-6">
        <img
          src={qrDataUrl}
          alt="Connection QR Code"
          className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Instructions */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold mb-2">Connect a Device</h3>
        <p className="text-slate-400 max-w-md">
          Open the Menu Hub app on a staff device and scan this QR code to connect to the local hub
        </p>
      </div>

      {/* Timer and Actions */}
      <div className="flex items-center gap-3 flex-wrap justify-center">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className={`font-mono ${timeRemaining < 60 ? 'text-orange-400' : 'text-slate-400'}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>

        {/* Copy connection code button */}
        <button
          onClick={handleCopyCode}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            copied
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Code
            </>
          )}
        </button>

        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          New Code
        </button>
      </div>

      {/* Connection Info (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg max-w-md overflow-auto">
          <div className="text-xs font-mono text-slate-400">
            <div>Hub ID: {offerData.hubId}</div>
            <div>Offer ID: {offerData.offerId}</div>
            <div>Restaurant: {offerData.restaurantId}</div>
          </div>
        </div>
      )}
    </div>
  )
}
