'use client'

import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'

/**
 * Hub Scanner Component
 * Allows staff devices to connect to the hub via QR code scan or manual input
 */
export default function HubScanner({ onConnect, onCancel }) {
  const [scanMode, setScanMode] = useState('manual') // 'camera' or 'manual'
  const [connectionCode, setConnectionCode] = useState('')
  const [error, setError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported on this device')
        return
      }

      // Switch to camera mode FIRST so the video element renders
      setScanMode('camera')

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      streamRef.current = stream

      // Wait a tick for the video element to mount after setScanMode
      await new Promise(resolve => setTimeout(resolve, 50))

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Wait for video to be ready before playing
        await new Promise((resolve, reject) => {
          const video = videoRef.current
          if (!video) {
            reject(new Error('Video element not found'))
            return
          }

          // If metadata is already loaded, play immediately
          if (video.readyState >= 1) {
            video.play().then(resolve).catch(reject)
            return
          }

          video.onloadedmetadata = () => {
            video.play()
              .then(resolve)
              .catch(reject)
          }
          // Timeout if metadata never loads
          setTimeout(() => reject(new Error('Video load timeout')), 5000)
        })

        setIsScanning(true)
        // Start QR code scanning
        scanQRCode()
      } else {
        throw new Error('Video element not available')
      }
    } catch (error) {
      console.error('[HubScanner] Camera error:', error)

      // Stop any stream that was started
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Provide specific error messages
      let errorMessage = 'Failed to access camera. Please use manual input.'
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.'
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device. Please use manual input.'
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another app. Please close other apps and try again.'
      } else if (error.message === 'Video load timeout') {
        errorMessage = 'Camera failed to initialize. Please try again or use manual input.'
      }

      setError(errorMessage)
      setScanMode('manual')
    }
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return
    if (scanningRef.current) return // Already scanning

    scanningRef.current = true

    const scan = () => {
      if (!scanningRef.current) return
      if (!videoRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current

      // Set canvas dimensions to match video
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        // Try multiple inversion attempts for better scanning on various screen types
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth' // Try both normal and inverted for better detection
        })

        if (code && code.data) {
          console.log('[HubScanner] QR code detected:', code.data)

          // Accept both HTTPS hub-connect URLs and the legacy custom scheme
          const isHubConnect =
            code.data.includes('/hub-connect?data=') ||
            code.data.startsWith('menuhub://connect')

          if (isHubConnect) {
            setConnectionCode(code.data)
            stopCamera()
            setIsScanning(false)

            // Auto-connect with the scanned code
            handleConnect(code.data)
          } else {
            setError('Invalid QR code. Please scan the hub connection QR code.')
          }
        }
      }

      // Continue scanning
      requestAnimationFrame(scan)
    }

    scan()
  }

  const handleConnect = async (code) => {
    setIsConnecting(true)
    setError(null)

    try {
      await onConnect(code)
    } catch (error) {
      setError(error.message || 'Failed to connect to hub')
      setIsConnecting(false)
    }
  }

  const stopCamera = () => {
    scanningRef.current = false
    setIsScanning(false)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const handleManualConnect = async () => {
    if (!connectionCode.trim()) {
      setError('Please enter a connection code')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      await onConnect(connectionCode.trim())
    } catch (error) {
      setError(error.message || 'Failed to connect to hub')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSwitchToCamera = () => {
    if (scanMode === 'camera') {
      stopCamera()
      setScanMode('manual')
    } else {
      startCamera()
    }
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 max-w-md w-full">
      <h2 className="text-2xl font-bold mb-4 text-white">Connect to Hub</h2>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            stopCamera()
            setScanMode('manual')
          }}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            scanMode === 'manual'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Manual Input
        </button>
        <button
          onClick={handleSwitchToCamera}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            scanMode === 'camera'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Scan QR Code
        </button>
      </div>

      {/* Camera View */}
      {scanMode === 'camera' && (
        <div className="mb-6">
          <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-blue-500 rounded-lg">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
              </div>
            </div>
          </div>

          <p className="text-slate-400 text-sm text-center mt-3">
            Point your camera at the QR code on the hub device
          </p>

          {isScanning && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-400 text-xs">Scanning...</span>
            </div>
          )}
        </div>
      )}

      {/* Manual Input */}
      {scanMode === 'manual' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Connection Code
          </label>
          <textarea
            value={connectionCode}
            onChange={(e) => setConnectionCode(e.target.value)}
            placeholder="Paste the connection code from the hub device..."
            className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
            rows={4}
            disabled={isConnecting}
          />
          <p className="text-slate-400 text-xs mt-2">
            The code is an HTTPS link containing "/hub-connect?data="
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            stopCamera()
            onCancel()
          }}
          className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
          disabled={isConnecting}
        >
          Cancel
        </button>
        {scanMode === 'manual' && (
          <button
            onClick={() => handleConnect(connectionCode.trim())}
            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={isConnecting || !connectionCode.trim()}
          >
            {isConnecting ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        )}
        {scanMode === 'camera' && isConnecting && (
          <div className="flex-1 py-3 px-4 bg-green-600/50 rounded-lg font-medium text-white flex items-center justify-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting...
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-slate-900/50 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-2">How to connect:</h3>
        <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
          <li>Ask the manager to open the hub dashboard</li>
          <li>Tap "Connect Device" on the hub screen</li>
          <li><strong className="text-slate-300">Scan QR:</strong> point camera at the QR code — auto-connects</li>
          <li><strong className="text-slate-300">Manual:</strong> copy connection code from hub and paste here</li>
        </ol>
      </div>
    </div>
  )
}
