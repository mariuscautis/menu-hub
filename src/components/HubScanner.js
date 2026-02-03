'use client'

import { useState, useRef, useEffect } from 'react'

/**
 * Hub Scanner Component
 * Allows staff devices to connect to the hub via QR code scan or manual input
 */
export default function HubScanner({ onConnect, onCancel }) {
  const [scanMode, setScanMode] = useState('manual') // 'camera' or 'manual'
  const [connectionCode, setConnectionCode] = useState('')
  const [error, setError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

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

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setScanMode('camera')

      // Start scanning for QR codes
      // Note: In production, you'd use a library like jsQR or @zxing/library
      // For now, we'll provide manual input as fallback
    } catch (error) {
      console.error('[HubScanner] Camera error:', error)
      setError('Failed to access camera. Please use manual input.')
      setScanMode('manual')
    }
  }

  const stopCamera = () => {
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

          <p className="text-slate-500 text-xs text-center mt-2">
            Note: QR scanning requires a QR code library. For now, use manual input.
          </p>
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
            The code starts with "menuhub://connect?data="
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
          onClick={onCancel}
          className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
          disabled={isConnecting}
        >
          Cancel
        </button>
        <button
          onClick={handleManualConnect}
          className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          disabled={isConnecting || (scanMode === 'manual' && !connectionCode.trim())}
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
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-slate-900/50 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-2">How to connect:</h3>
        <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
          <li>Ask the manager to open the hub dashboard</li>
          <li>Click "Connect Device" on the hub</li>
          <li>Either scan the QR code or copy the connection code</li>
          <li>Paste the code here and click Connect</li>
        </ol>
      </div>
    </div>
  )
}
