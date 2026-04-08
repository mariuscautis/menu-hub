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
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        activeTab === id
          ? 'bg-[#6262bd] text-white'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  )

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
            Install VenoApp Bridge on a dedicated always-on device at your venue for cross-device order sync and automatic receipt printing — even without internet.
          </p>
        </div>

        <div className="space-y-6">

          {/* Important: requires a dedicated device */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
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
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3">
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
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">VenoApp Bridge</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  A lightweight background app that turns any Windows PC, Linux computer, or Raspberry Pi into a local hub for your venue.
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

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0', title: 'Cross-device sync', desc: 'Waiter tablets and kitchen screens stay in sync over local WiFi, no internet needed.' },
                { icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z', title: 'Auto receipt printing', desc: 'Prints automatically to your WiFi thermal printer when an order is marked as paid.' },
                { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', title: 'Offline queue sync', desc: 'Orders taken offline are queued and pushed to the cloud the moment internet returns.' },
              ].map((f, i) => (
                <div key={i} className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{f.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Bridge Code */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mb-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Your restaurant code</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Enter this code in VenoApp Bridge during setup. It links the Bridge to your restaurant account.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
                  {bridgeCode
                    ? <span className="font-mono text-2xl font-bold tracking-widest text-[#6262bd]">{bridgeCode}</span>
                    : <span className="text-slate-400 text-sm">Loading...</span>
                  }
                </div>
                <button
                  onClick={copyCode}
                  disabled={!bridgeCode}
                  className="flex items-center gap-2 px-4 py-3 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a3] disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  {copied
                    ? <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>Copied!</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
                  }
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Unique to your venue — keep it private.
              </p>
            </div>

            {/* Download & Setup — tabbed */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Download &amp; setup instructions</h3>

              {/* Tab bar */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-5 w-fit">
                {tabBtn('windows', 'Windows')}
                {tabBtn('linux', 'Linux')}
                {tabBtn('pi', 'Raspberry Pi')}
              </div>

              {/* Windows */}
              {activeTab === 'windows' && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                    Suitable for any Windows 10 or 11 PC or laptop that stays on at the venue — the till PC, a back-office computer, or a dedicated mini PC.
                  </div>
                  <a
                    href="https://github.com/mariuscautis/venoapp-bridge/releases/latest/download/venoapp-bridge.exe"
                    className="flex items-center justify-center gap-2 w-full bg-[#6262bd] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#5252a3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download for Windows (.exe)
                  </a>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Setup steps:</p>
                    <ol className="space-y-2">
                      {[
                        'Double-click the downloaded .exe to install. If Windows SmartScreen appears, click "More info" then "Run anyway".',
                        'VenoApp Bridge opens automatically after install. Enter your restaurant code and printer IP, then click Save & Start.',
                        'Bridge minimises to the system tray (bottom-right corner). It starts automatically every time Windows boots.',
                        'On any staff device on the same WiFi, open the VenoApp dashboard — the status above will turn green.',
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
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
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                    Suitable for any Ubuntu, Debian, or Fedora PC or laptop. Also works on a mini PC running Linux.
                  </div>
                  <a
                    href="https://github.com/mariuscautis/venoapp-bridge/releases/latest/download/venoapp-bridge.AppImage"
                    className="flex items-center justify-center gap-2 w-full bg-[#6262bd] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#5252a3] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    Download for Linux (.AppImage)
                  </a>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Setup steps:</p>
                    <ol className="space-y-2">
                      {[
                        'Open a terminal and run: chmod +x venoapp-bridge.AppImage',
                        'Run it: ./venoapp-bridge.AppImage — the setup window will open.',
                        'Enter your restaurant code and printer IP, then click Save & Start.',
                        'To auto-start on boot, add it to your startup applications (Settings → Startup Applications on Ubuntu).',
                        'On any staff device on the same WiFi, open the VenoApp dashboard — the status above will turn green.',
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Raspberry Pi */}
              {activeTab === 'pi' && (
                <div className="space-y-4">

                  {/* Which Pi */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">Which Raspberry Pi to buy</p>
                    <div className="space-y-2">
                      {[
                        { model: 'Raspberry Pi 5 (recommended)', desc: 'Fastest, handles everything. Best if you also connect a receipt printer directly.' },
                        { model: 'Raspberry Pi 4 (2GB)', desc: 'Great balance of price and performance. More than enough for Bridge.' },
                        { model: 'Raspberry Pi Zero 2 W (cheapest)', desc: 'Smallest and cheapest. Perfect if you only need order sync — no direct printer.' },
                      ].map((p, i) => (
                        <div key={i} className="flex gap-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${i === 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                            {i === 0 ? '★ Best' : i === 1 ? 'Good' : 'Budget'}
                          </span>
                          <div>
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{p.model}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{p.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-400 mt-3">
                      Buy from <strong>raspberrypi.com</strong> or resellers like Pimoroni (UK) or The Pi Hut. You also need: a microSD card (16GB+), a USB-C power supply, and optionally a small case.
                    </p>
                  </div>

                  {/* Setup steps */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-3">Setup steps:</p>
                    <ol className="space-y-2">
                      {[
                        'Download Raspberry Pi Imager from raspberrypi.com/software on your PC or Mac.',
                        'Insert the microSD card, open Imager, choose "Raspberry Pi OS Lite (64-bit)", select your card, and click Write. When prompted, set a hostname, enable SSH, and enter your WiFi name and password.',
                        'Insert the SD card into the Pi and power it on. Wait 2 minutes for first boot.',
                        'From your PC, open a terminal (or PuTTY on Windows) and connect: ssh pi@raspberrypi.local',
                        'Download and run the Bridge: wget https://github.com/mariuscautis/venoapp-bridge/releases/latest/download/venoapp-bridge.AppImage && chmod +x venoapp-bridge.AppImage',
                        'For initial setup, connect the Pi to a monitor and keyboard. Open VenoApp Bridge, enter your restaurant code and printer IP, then click Save & Start. Once configured you can run it headlessly — disconnect the monitor.',
                        'To auto-start on boot: sudo nano /etc/rc.local and add the AppImage path before "exit 0".',
                      ].map((step, i) => (
                        <li key={i} className="flex gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                    <strong>Note:</strong> The Raspberry Pi headless setup (step 6) is coming soon. For now, connect a monitor and keyboard to the Pi for initial setup, or use a Pi 4/5 with Raspberry Pi OS Desktop.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connected devices */}
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
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{device.ip}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{device.user_agent}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Connected {new Date(device.connected_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Per-device offline mode */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Per-device offline mode</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
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
                    <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> Each device must be opened at least once while online for offline mode to activate. Make sure staff open the app before going to areas with no signal.
          </div>

        </div>
      </div>
    </OfflinePageGuard>
  )
}
