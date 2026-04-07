'use client'

import { useState, useEffect } from 'react'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'
import { isHubDevice, getHubIp, setHubMode, setHubIp, pingHub } from '@/lib/localHub'
import { useRestaurant } from '@/lib/RestaurantContext'

/**
 * Detect this device's local LAN IP addresses using WebRTC.
 * Returns an array of IPv4 addresses on the local network (e.g. ["192.168.1.5"]).
 * Works without any server — the browser exposes local IPs via ICE candidates.
 */
function getLocalIPs() {
  return new Promise((resolve) => {
    const ips = new Set()
    let done = false

    const finish = () => {
      if (done) return
      done = true
      // Filter to private LAN ranges only (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const lan = [...ips].filter(ip =>
        /^192\.168\./.test(ip) ||
        /^10\./.test(ip) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
      )
      resolve(lan.length > 0 ? lan : [...ips].filter(ip => !ip.includes(':')))
    }

    try {
      const pc = new RTCPeerConnection({ iceServers: [] })
      pc.createDataChannel('')
      pc.createOffer().then(offer => pc.setLocalDescription(offer))
      pc.onicecandidate = (e) => {
        if (!e.candidate) { pc.close(); finish(); return }
        const match = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate)
        if (match) ips.add(match[1])
      }
      // Resolve after 2 seconds regardless
      setTimeout(() => { try { pc.close() } catch {} finish() }, 2000)
    } catch {
      resolve([])
    }
  })
}

export default function OfflineHubSettings() {
  const restaurantCtx = useRestaurant()
  const isOwnerOrAdmin = restaurantCtx?.userType === 'owner' || restaurantCtx?.userType === 'staff-admin'

  const [message, setMessage] = useState(null)

  // Hub settings state (localStorage — device-local, no server save needed)
  const [hubMode, setHubModeState] = useState(false)
  const [hubIpInput, setHubIpInput] = useState('')
  const [hubPingStatus, setHubPingStatus] = useState(null) // null | 'pinging' | 'ok' | 'fail'
  const [confirmHubEnable, setConfirmHubEnable] = useState(false) // show confirm dialog
  const [detectingIp, setDetectingIp] = useState(false)
  const [detectedIps, setDetectedIps] = useState([]) // list of candidate LAN IPs

  // Load from localStorage on mount
  useEffect(() => {
    setHubModeState(isHubDevice())
    setHubIpInput(getHubIp() || '')
  }, [])

  const handleHubModeToggle = (enabled) => {
    if (enabled) {
      // Ask for confirmation before enabling — prevents accidental activation
      setConfirmHubEnable(true)
      return
    }
    // Disabling is immediate
    setHubMode(false)
    setHubModeState(false)
    setHubPingStatus(null)
  }

  const handleConfirmHubEnable = () => {
    setHubMode(true)
    setHubModeState(true)
    setHubIpInput('')
    setHubPingStatus(null)
    setConfirmHubEnable(false)
  }

  const handleHubIpSave = () => {
    setHubIp(hubIpInput)
    setHubModeState(false)
    setHubPingStatus(null)
    setMessage({ type: 'success', text: 'Hub IP saved on this device.' })
    setTimeout(() => setMessage(null), 4000)
  }

  const handleHubIpClear = () => {
    setHubIp('')
    setHubIpInput('')
    setHubPingStatus(null)
  }

  const handlePingHub = async () => {
    setHubPingStatus('pinging')
    const ok = await pingHub()
    setHubPingStatus(ok ? 'ok' : 'fail')
  }

  // Detect this device's local LAN IP using WebRTC (no server needed)
  const handleDetectIp = async () => {
    setDetectingIp(true)
    setDetectedIps([])
    try {
      const ips = await getLocalIPs()
      setDetectedIps(ips)
    } catch {
      setDetectedIps([])
    }
    setDetectingIp(false)
  }

  const handleUseIp = (ip) => {
    setHubIpInput(ip)
    setDetectedIps([])
    setHubPingStatus(null)
  }

  return (
    <OfflinePageGuard>
      <div>
        <PageTabs tabs={settingsTabs} />
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            Offline Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Allow devices on the same WiFi to relay orders through a central hub when internet is unavailable.
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        {/* Confirm hub-enable dialog */}
        {confirmHubEnable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 max-w-sm w-full border-2 border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Enable Hub mode?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Only <strong>one device per venue</strong> should be set as the Hub.
                If another device is already configured as the Hub, disable it there first.
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                Enabling this will clear any hub IP saved on this device — it will become the hub, not a spoke.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmHubEnable(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmHubEnable}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors"
                >
                  Enable Hub
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Hub Mode toggle */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
                  This device is the Hub
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Enable this on the device that will receive and queue orders from other staff devices on the same WiFi network.
                  This device must stay online periodically to sync orders to the cloud.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={hubMode}
                  onChange={(e) => handleHubModeToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                  {hubMode ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
            {hubMode && (
              <div className="mt-4 space-y-3">
                {/* Detect IP section */}
                <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl px-4 py-3">
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-2">
                    Share this device&apos;s local IP address with spoke devices so they can connect to this hub.
                  </p>
                  <button
                    onClick={handleDetectIp}
                    disabled={detectingIp}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors disabled:opacity-50"
                  >
                    {detectingIp ? (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                      </svg>
                    )}
                    {detectingIp ? 'Detecting…' : 'Detect my IP'}
                  </button>
                  {detectedIps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {detectedIps.map(ip => (
                        <button
                          key={ip}
                          onClick={() => {
                            // Copy to clipboard
                            navigator.clipboard?.writeText(ip).catch(() => {})
                            setMessage({ type: 'success', text: `IP address ${ip} copied to clipboard.` })
                            setTimeout(() => setMessage(null), 4000)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-mono font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition-colors"
                          title="Tap to copy"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {ip}
                        </button>
                      ))}
                    </div>
                  )}
                  {!detectingIp && detectedIps.length === 0 && (
                    <p className="mt-1.5 text-xs text-indigo-500 dark:text-indigo-400">
                      Tap &quot;Detect my IP&quot; to find your local IP address automatically.
                    </p>
                  )}
                </div>
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                  </svg>
                  Only one device per venue should be the Hub. Make sure no other device has hub mode enabled.
                </div>
              </div>
            )}
          </div>

          {/* Spoke: configure hub IP */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">
              Connect to a Hub
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Enter the local IP address of the hub device on your WiFi network. Leave blank to queue orders locally on this device instead.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={hubIpInput}
                onChange={(e) => { setHubIpInput(e.target.value); setHubPingStatus(null) }}
                placeholder="e.g. 192.168.1.5"
                disabled={hubMode}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-200 text-sm disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-slate-800"
              />
              <button
                onClick={handleHubIpSave}
                disabled={hubMode || !hubIpInput.trim()}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
              {hubIpInput && !hubMode && (
                <button
                  onClick={handleHubIpClear}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Ping / test connection */}
            {hubIpInput && !hubMode && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handlePingHub}
                  disabled={hubPingStatus === 'pinging'}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {hubPingStatus === 'pinging' ? (
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  )}
                  Test connection
                </button>
                {hubPingStatus === 'ok' && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    Hub reachable
                  </span>
                )}
                {hubPingStatus === 'fail' && (
                  <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                    Hub not reachable
                  </span>
                )}
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">How it works</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Designate a Hub device</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pick one device (e.g. manager&apos;s tablet) and enable &quot;This device is the Hub&quot; on it. Find its local WiFi IP in the device&apos;s network settings.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Configure spoke devices</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">On every other staff device, enter the hub&apos;s local IP address here and tap Save. Use &quot;Test connection&quot; to verify.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Orders relay automatically</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">When internet drops, spoke devices send orders to the hub over WiFi. The hub queues them and syncs to the cloud as soon as internet returns.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400 font-bold text-sm">!</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Automatic fallback</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">If the hub is also unreachable, orders are saved locally on that device and synced when internet is restored. No orders are ever lost.</p>
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              <strong>Note:</strong> These settings are saved on this device only and do not affect other devices or the database.
              All devices on the network must have the app open at least once for the service worker to be active.
            </div>
          </div>
        </div>
      </div>
    </OfflinePageGuard>
  )
}
