'use client'

import { useState, useEffect, useRef } from 'react'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useVenoBridge } from '@/hooks/useVenoBridge'

function formatBridgeCode(code) {
  if (!code) return null
  const clean = code.replace(/-/g, '')
  return clean.slice(0, 4) + '-' + clean.slice(4)
}

export default function OfflineHubSettings() {
  const restaurantCtx  = useRestaurant()
  const restaurant     = restaurantCtx?.restaurant
  const isOwnerOrAdmin = restaurantCtx?.userType === 'owner' || restaurantCtx?.userType === 'staff-admin'
  const { isConnected, bridgeStatus, requestStatus } = useVenoBridge(restaurant)

  const [copied, setCopied] = useState(false)
  const [os, setOs]         = useState(null)
  const pollRef             = useRef(null)

  const bridgeCode       = formatBridgeCode(restaurant?.bridge_code)
  const connectedDevices = bridgeStatus?.connected_devices || []
  const duplicateHub     = bridgeStatus?.duplicate_hub || false

  const copyCode = () => {
    if (!bridgeCode) return
    navigator.clipboard.writeText(bridgeCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    const ua = navigator.userAgent
    if (/android/i.test(ua))     setOs('android')
    else if (/linux/i.test(ua))  setOs('linux')
    else if (/mac/i.test(ua))    setOs('mac')
    else if (/win/i.test(ua))    setOs('windows')
    else                         setOs('other')
  }, [])

  // Poll bridge status every 4 s when connected
  useEffect(() => {
    if (!isConnected) {
      clearInterval(pollRef.current)
      return
    }
    requestStatus()
    pollRef.current = setInterval(requestStatus, 4000)
    return () => clearInterval(pollRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  return (
    <OfflinePageGuard>
      <div>
        {isOwnerOrAdmin && <PageTabs tabs={settingsTabs} />}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            Offline &amp; Local Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            VenoApp works without internet. Install VenoApp Bridge on your main device for cross-device order sync and automatic receipt printing.
          </p>
        </div>

        <div className="space-y-6">

          {/* One-hub-only warning banner */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Install Bridge on one device only</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Only the main venue device (till tablet, PC, or always-on Android) should run VenoApp Bridge.
                Running it on multiple devices causes order duplication and printing conflicts.
                All other devices connect to this Hub automatically.
              </p>
            </div>
          </div>

          {/* Duplicate hub warning */}
          {duplicateHub && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Duplicate Bridge detected</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Another VenoApp Bridge was found on your network. Please close it and leave only one running.
                </p>
              </div>
            </div>
          )}

          {/* VenoApp Bridge — main card */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">VenoApp Bridge</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  A lightweight background app for your main venue device. Enables instant order relay between devices on the same WiFi and automatic receipt printing — even without internet.
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                isConnected
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {isConnected ? 'Bridge connected' : 'Not detected'}
              </div>
            </div>

            {/* What Bridge does */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Cross-device sync</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Waiter tablets and kitchen screens stay in sync over local WiFi, no internet needed.</p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Auto receipt printing</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Prints automatically to your WiFi thermal printer when an order is marked as paid.</p>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Offline queue sync</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Orders taken offline are held in Bridge and pushed to the cloud the moment internet returns.</p>
              </div>
            </div>

            {/* Bridge Code */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mb-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Your restaurant code</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Enter this code in VenoApp Bridge during setup. It links the Bridge to your restaurant account.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between">
                  {bridgeCode ? (
                    <span className="font-mono text-2xl font-bold tracking-widest text-[#6262bd]">
                      {bridgeCode}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">Loading...</span>
                  )}
                </div>
                <button
                  onClick={copyCode}
                  disabled={!bridgeCode}
                  className="flex items-center gap-2 px-4 py-3 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a3] disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {copied ? (
                    <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copied!</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                This code is unique to your venue and never changes. Keep it private — anyone with this code could link their Bridge to your account.
              </p>
            </div>

            {/* Download section */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Install on your main device</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Install Bridge on the device that stays at the venue (till tablet or PC). It runs silently in the background and starts automatically on boot.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Android */}
                <div className={`border-2 rounded-xl p-4 ${os === 'android' ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.523 15.341l1.505-2.604a.75.75 0 00-1.3-.75l-1.527 2.641A9.013 9.013 0 0112 14c-1.37 0-2.666.306-3.82.847L6.653 12.2a.75.75 0 00-1.3.75l1.505 2.604A9 9 0 003 21h18a9 9 0 00-3.477-5.659zM12 2a3 3 0 100 6 3 3 0 000-6z"/>
                    </svg>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Android</span>
                    {os === 'android' && <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">This device</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Download the APK, open it to install, then launch once to set up.</p>
                  <a
                    href="https://github.com/mariuscautis/venoapp-bridge/releases/latest/download/venoapp-bridge.apk"
                    className="flex items-center justify-center gap-2 w-full bg-[#6262bd] text-white py-2 rounded-xl text-sm font-medium hover:bg-[#5252a3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download for Android
                  </a>
                </div>

                {/* Linux */}
                <div className={`border-2 rounded-xl p-4 ${os === 'linux' ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                    </svg>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Linux</span>
                    {os === 'linux' && <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">This device</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Download the AppImage, make it executable, and run it. No installation needed.</p>
                  <a
                    href="https://github.com/mariuscautis/venoapp-bridge/releases/latest/download/venoapp-bridge.AppImage"
                    className="flex items-center justify-center gap-2 w-full bg-[#6262bd] text-white py-2 rounded-xl text-sm font-medium hover:bg-[#5252a3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download for Linux
                  </a>
                </div>
              </div>

              {/* Setup steps */}
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">After installing:</p>
                <ol className="space-y-2">
                  {[
                    'Open VenoApp Bridge — it launches a small setup screen.',
                    "Enter your restaurant code (shown above) and your printer's IP address (found in your printer's network settings).",
                    'Tap Save & Start. Bridge minimises to the background and starts automatically from now on.',
                    'Refresh this page — the status above will turn green when Bridge is detected.',
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          {/* Connected devices — only shown when Bridge is connected */}
          {isConnected && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Connected devices</h2>
                <span className="text-xs text-slate-400 dark:text-slate-500">Updates every 4 s</span>
              </div>

              {connectedDevices.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">No other devices connected to Bridge right now.</p>
              ) : (
                <div className="space-y-3">
                  {connectedDevices.map((device) => (
                    <div key={device.id} className="flex items-start gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {device.ip}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {device.user_agent}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Connected {new Date(device.connected_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
                These are all VenoApp devices currently connected to Bridge on your local network.
              </p>
            </div>
          )}

          {/* Per-device offline mode */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">Per-device offline mode</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Even without VenoApp Bridge, every device handles internet outages independently.
            </p>
            <div className="space-y-4">
              {[
                { title: 'Orders saved locally', desc: 'When internet is unavailable, orders are saved directly on the device in a local queue. Staff can continue taking orders without interruption.' },
                { title: 'Automatic sync on reconnect', desc: 'As soon as internet returns, all queued orders and payments are pushed to the cloud automatically — no manual action needed.' },
                { title: 'Each device syncs independently', desc: 'Every device maintains its own local queue. When multiple devices come back online, each syncs its own orders without waiting for others.' },
                { title: 'Cash payments queued too', desc: 'Cash and external terminal payments made while offline are queued and recorded in the system once the connection is restored.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">{i + 1}</div>
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status indicators */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-3">Status indicators</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">Green dot</span> — connected to the internet, orders sync in real time.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">Red dot</span> — no internet. Orders are being saved locally on this device.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">Orange number</span> — orders pending sync. Will clear automatically once internet returns.</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> The app must have been opened on the device at least once while online for offline mode to be active. Make sure staff open the app before going to areas with no signal.
          </div>

        </div>
      </div>
    </OfflinePageGuard>
  )
}
