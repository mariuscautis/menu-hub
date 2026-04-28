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

  const [copied, setCopied]     = useState(false)
  const [os, setOs]             = useState(null)
  const [activeTab, setActiveTab] = useState(null) // 'windows' | 'linux' | 'pi'
  const pollRef                 = useRef(null)

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
    if (/android/i.test(ua) || /samsung|SM-/i.test(ua)) setOs('android')
    else if (/win/i.test(ua))  setOs('windows')
    else if (/mac/i.test(ua))  setOs('mac')
    else if (/linux/i.test(ua)) setOs('linux')
    else setOs('other')
  }, [])

  // Auto-select the right tab based on detected OS
  useEffect(() => {
    if (!os || activeTab) return
    if (os === 'windows') setActiveTab('windows')
    else if (os === 'linux') setActiveTab('linux')
    else setActiveTab('windows') // default to Windows for unknown/mac/android
  }, [os, activeTab])

  // Poll bridge status every 4 s when connected
  useEffect(() => {
    if (!isConnected) { clearInterval(pollRef.current); return }
    requestStatus()
    pollRef.current = setInterval(requestStatus, 4000)
    return () => clearInterval(pollRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected])

  const tabBtn = (id, label) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
        activeTab === id
          ? 'bg-[#6262bd] text-white'
          : 'text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  )

  return (
    <OfflinePageGuard>
      <div className="overflow-x-hidden">
        {isOwnerOrAdmin && <PageTabs tabs={settingsTabs} />}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            Offline &amp; Local Hub
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">
            Install VenoApp Bridge on a dedicated always-on device at your venue for cross-device order sync and automatic receipt printing — even without internet.
          </p>
        </div>

        <div className="space-y-6">

          {/* Important: requires a dedicated device */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-sm flex gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Requires a dedicated always-on device</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                VenoApp Bridge must run on a Windows PC, Linux computer, or Raspberry Pi that stays powered on at the venue.
                Tablets and phones are not supported — they go to sleep and disconnect other devices.
                All staff tablets and phones connect to the Bridge automatically once it is running.
              </p>
            </div>
          </div>

          {/* Duplicate hub warning */}
          {duplicateHub && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Duplicate Bridge detected</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Another VenoApp Bridge was found on your network. Only one should run at a time.
                </p>
              </div>
            </div>
          )}

          {/* Main Bridge card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">VenoApp Bridge</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">
                  A lightweight background app that turns any Windows PC, Linux computer, or Raspberry Pi into a local hub for your venue.
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ${
                isConnected
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                {isConnected ? 'Bridge connected' : 'Not detected'}
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0', title: 'Cross-device sync', desc: 'Waiter tablets and kitchen screens stay in sync over local WiFi, no internet needed.' },
                { icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z', title: 'Auto receipt printing', desc: 'Prints automatically to your WiFi thermal printer when an order is marked as paid.' },
                { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', title: 'Offline queue sync', desc: 'Orders taken offline are queued and pushed to the cloud the moment internet returns.' },
              ].map((f, i) => (
                <div key={i} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-sm">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-sm flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{f.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Bridge Code — managers only */}
            {isOwnerOrAdmin && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 mb-5">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Your restaurant code</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-3">
                Enter this code in VenoApp Bridge during setup. It links the Bridge to your restaurant account.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm px-4 py-3">
                  {bridgeCode
                    ? <span className="font-mono text-2xl font-bold tracking-widest text-[#6262bd]">{bridgeCode}</span>
                    : <span className="text-zinc-400 dark:text-zinc-500 text-sm">Loading...</span>
                  }
                </div>
                <button
                  onClick={copyCode}
                  disabled={!bridgeCode}
                  className="flex items-center gap-2 px-4 py-3 bg-[#6262bd] text-white rounded-sm text-sm font-medium hover:bg-[#5252a3] disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {copied
                    ? <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copied!</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
                  }
                </button>
              </div>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mt-2">
                Unique to your venue — keep it private.
              </p>
            </div>
            )}

            {/* Download & Setup — managers only */}
            {isOwnerOrAdmin && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Download &amp; setup instructions</h3>

              {/* Tab bar */}
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-sm mb-5 w-full sm:w-fit overflow-x-auto">
                {tabBtn('windows', 'Windows')}
                {tabBtn('linux', 'Linux')}
              </div>

              {/* Trust certificate banner — shown when hub IP is known */}
              {restaurant?.bridge_hub_ip && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-sm flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">New device? Trust the certificate first</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">Each device needs to do this once before VenoApp Bridge will connect.</p>
                  </div>
                  <a
                    href={`https://${restaurant.bridge_hub_ip}:3355`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 px-4 py-2 bg-[#6262bd] text-white rounded-sm text-xs font-semibold hover:bg-[#5252a3] transition-colors whitespace-nowrap"
                  >
                    Trust certificate →
                  </a>
                </div>
              )}

              {/* Windows */}
              {activeTab === 'windows' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-sm text-xs text-blue-800 dark:text-blue-300">
                    Suitable for any Windows 10 or 11 PC or laptop that stays on at the venue — the till PC, a back-office computer, or a dedicated mini PC. No installation required.
                  </div>
                  <a
                    href="https://github.com/mariuscautis/venoapp-bridge/releases/latest/download/venoapp-bridge-windows-setup.exe"
                    className="flex items-center justify-center gap-2 w-full bg-[#6262bd] text-white py-2.5 rounded-sm text-sm font-medium hover:bg-[#5252a3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download for Windows (.exe)
                  </a>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 rounded-sm">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-3">Setup steps:</p>
                    <ol className="space-y-2">
                      {[
                        'Download the .exe file and double-click it. If SmartScreen appears, click "More info" then "Run anyway" — no installation needed.',
                        'A terminal window opens and your browser automatically loads the setup page at http://localhost:3355.',
                        'Enter your restaurant code and printer IP in the browser, then click Save & Start.',
                        'Keep the terminal window open — it must stay running for Bridge to work. Minimise it to the taskbar.',
                        'On any staff device on the same WiFi, open the VenoApp dashboard — the status above will turn green.',
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Linux */}
              {activeTab === 'linux' && (
                <div className="space-y-4">
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-sm text-xs text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                    Suitable for any Ubuntu, Debian, or Fedora PC or laptop. Also works on a mini PC running Linux.
                  </div>
                  <a
                    href="https://github.com/mariuscautis/venoapp-bridge/releases/latest/download/venoapp-bridge.AppImage"
                    className="flex items-center justify-center gap-2 w-full bg-[#6262bd] text-white py-2.5 rounded-sm text-sm font-medium hover:bg-[#5252a3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download for Linux (.AppImage)
                  </a>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 rounded-sm">
                    <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-3">Setup steps:</p>
                    <ol className="space-y-2">
                      {[
                        'Open a terminal and run: chmod +x venoapp-bridge.AppImage',
                        'Run it: ./venoapp-bridge.AppImage — the setup window will open.',
                        'Enter your restaurant code and printer IP, then click Save & Start.',
                        'To auto-start on boot, add it to your startup applications (Settings → Startup Applications on Ubuntu).',
                        'On any staff device on the same WiFi, open the VenoApp dashboard — the status above will turn green.',
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Raspberry Pi tab hidden for now */}
            </div>
            )}
          </div>

          {/* Connected devices */}
          {isConnected && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300">Connected devices</h2>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500">Updates every 4 s</span>
              </div>
              {connectedDevices.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 dark:text-zinc-500">No other devices connected to Bridge right now.</p>
              ) : (
                <div className="space-y-3">
                  {connectedDevices.map((device) => (
                    <div key={device.id} className="flex items-start gap-4 p-3 bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 rounded-sm">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">{device.ip}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 truncate mt-0.5">{device.user_agent}</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 dark:text-zinc-500 mt-0.5">Connected {new Date(device.connected_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Per-device offline mode */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-4 sm:p-6">
            <h2 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-1">Per-device offline mode</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mb-4">
              Even without VenoApp Bridge, every device handles internet outages independently.
            </p>
            <div className="space-y-4">
              {[
                { title: 'Orders saved locally', desc: 'When internet is unavailable, orders are saved on the device. Staff can continue taking orders without interruption.' },
                { title: 'Automatic sync on reconnect', desc: 'As soon as internet returns, all queued orders and payments push to the cloud automatically.' },
                { title: 'Each device syncs independently', desc: 'Every device maintains its own local queue and syncs when back online.' },
                { title: 'Cash payments queued too', desc: 'Cash and external terminal payments made offline are recorded once the connection is restored.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">{i + 1}</div>
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300 text-sm">{item.title}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-sm text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> Each device must be opened at least once while online for offline mode to activate. Make sure staff open the app before going to areas with no signal.
          </div>

        </div>
      </div>
    </OfflinePageGuard>
  )
}
