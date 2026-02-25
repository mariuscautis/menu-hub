'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrderSounds, soundOptions } from '@/hooks/useOrderSounds'

export default function OtherOptionsSettings() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Sound settings state
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [kitchenSound, setKitchenSound] = useState('bell')
  const [barSound, setBarSound] = useState('chime')
  const [takeawaySound, setTakeawaySound] = useState('ding')
  const [reservationSound, setReservationSound] = useState('doorbell')
  const [volume, setVolume] = useState(0.7)

  const { testSound, resumeAudio } = useOrderSounds(restaurant?.id)

  useEffect(() => {
    const fetchRestaurant = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get restaurant (owners only)
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (ownedRestaurant) {
        setRestaurant(ownedRestaurant)

        // Initialize sound settings
        if (ownedRestaurant.sound_settings) {
          setSoundEnabled(ownedRestaurant.sound_settings.enabled || false)
          setKitchenSound(ownedRestaurant.sound_settings.kitchenSound || 'bell')
          setBarSound(ownedRestaurant.sound_settings.barSound || 'chime')
          setTakeawaySound(ownedRestaurant.sound_settings.takeawaySound || 'ding')
          setReservationSound(ownedRestaurant.sound_settings.reservationSound || 'doorbell')
          setVolume(ownedRestaurant.sound_settings.volume || 0.7)
        }
      }

      setLoading(false)
    }

    fetchRestaurant()
  }, [])

  const handleSaveSoundSettings = async () => {
    if (!restaurant) return

    setSaving(true)
    setMessage(null)

    const soundSettingsData = {
      enabled: soundEnabled,
      kitchenSound,
      barSound,
      takeawaySound,
      reservationSound,
      volume
    }

    console.log('Saving sound settings:', soundSettingsData)
    console.log('Restaurant ID:', restaurant.id)

    const { data, error } = await supabase
      .from('restaurants')
      .update({ sound_settings: soundSettingsData })
      .eq('id', restaurant.id)
      .select()

    console.log('Save response - data:', data)
    console.log('Save response - error:', error)

    if (error) {
      console.error('Supabase error:', error)
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` })
    } else if (!data || data.length === 0) {
      setMessage({ type: 'error', text: 'No rows updated. Check database permissions.' })
    } else {
      setMessage({ type: 'success', text: 'Sound settings saved successfully!' })
      setRestaurant({ ...restaurant, sound_settings: soundSettingsData })
    }

    setSaving(false)
    setTimeout(() => setMessage(null), 5000)
  }

  const handleTestSound = (soundKey) => {
    // Resume audio context on user interaction
    resumeAudio()
    testSound(soundKey, volume)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          Only restaurant owners can access settings.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Other Options</h1>
        <p className="text-slate-500">Configure additional restaurant features and notifications</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-600'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Order Sound Notifications Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-700 mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 text-[#6262bd]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                Order Sound Notifications
              </h2>
              <p className="text-sm text-slate-500">
                Play distinct sounds when new orders arrive for kitchen, bar, or takeaway.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => setSoundEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#6262bd]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6262bd]"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">
                {soundEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        {soundEnabled && (
          <div className="space-y-6 border-t border-slate-100 pt-6">
            {/* Volume Control */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Volume
              </label>
              <div className="flex items-center gap-4">
                <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3z"/>
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#6262bd]"
                />
                <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <span className="text-sm text-slate-500 w-12 text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>

            {/* Kitchen Sound */}
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍳</span>
                  <div>
                    <h3 className="font-semibold text-green-800">Kitchen Orders</h3>
                    <p className="text-xs text-green-600">Sound for food/kitchen items</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTestSound(kitchenSound)}
                  disabled={kitchenSound === 'silent'}
                  className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Test
                </button>
              </div>
              <select
                value={kitchenSound}
                onChange={(e) => setKitchenSound(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:border-green-400 text-slate-700 bg-white"
              >
                {soundOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Bar Sound */}
            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍸</span>
                  <div>
                    <h3 className="font-semibold text-orange-800">Bar Orders</h3>
                    <p className="text-xs text-orange-600">Sound for drink/bar items</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTestSound(barSound)}
                  disabled={barSound === 'silent'}
                  className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Test
                </button>
              </div>
              <select
                value={barSound}
                onChange={(e) => setBarSound(e.target.value)}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-400 text-slate-700 bg-white"
              >
                {soundOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Takeaway Sound */}
            <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🥡</span>
                  <div>
                    <h3 className="font-semibold text-cyan-800">Takeaway Orders</h3>
                    <p className="text-xs text-cyan-600">Sound for takeaway/pickup orders</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTestSound(takeawaySound)}
                  disabled={takeawaySound === 'silent'}
                  className="px-3 py-1.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Test
                </button>
              </div>
              <select
                value={takeawaySound}
                onChange={(e) => setTakeawaySound(e.target.value)}
                className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:outline-none focus:border-cyan-400 text-slate-700 bg-white"
              >
                {soundOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Reservation Sound */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <div>
                    <h3 className="font-semibold text-purple-800">Reservations</h3>
                    <p className="text-xs text-purple-600">Sound for new reservations</p>
                  </div>
                </div>
                <button
                  onClick={() => handleTestSound(reservationSound)}
                  disabled={reservationSound === 'silent'}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Test
                </button>
              </div>
              <select
                value={reservationSound}
                onChange={(e) => setReservationSound(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 text-slate-700 bg-white"
              >
                {soundOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How it works</p>
                  <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                    <li>Sounds play when new orders arrive on the Orders page</li>
                    <li>Reservation sounds play on the Reservations page</li>
                    <li>Different sounds help staff identify event types quickly</li>
                    <li>Set any sound to &quot;Silent&quot; to disable it individually</li>
                    <li>Kitchen, bar, takeaway, and reservations can each have unique sounds</li>
                    <li>Make sure your device volume is turned up</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSaveSoundSettings}
                disabled={saving}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? 'Saving...' : 'Save Sound Settings'}
              </button>
            </div>
          </div>
        )}

        {!soundEnabled && (
          <div className="text-center py-8 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
            <p>Enable sound notifications to configure alerts for new orders</p>
          </div>
        )}
      </div>

      {/* Future Options Placeholder */}
      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
        </svg>
        <p className="text-slate-400 font-medium">More options coming soon</p>
        <p className="text-sm text-slate-300 mt-1">Additional features will be added here</p>
      </div>
    </div>
  )
}
