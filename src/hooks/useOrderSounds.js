'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getSoundGenerator } from '@/lib/soundGenerator'

// Default sound settings
const defaultSoundSettings = {
  enabled: false,
  kitchenSound: 'bell',
  barSound: 'chime',
  takeawaySound: 'ding',
  volume: 0.7
}

// Available sound options
export const soundOptions = [
  { value: 'bell', label: 'Bell' },
  { value: 'chime', label: 'Chime' },
  { value: 'ding', label: 'Ding' },
  { value: 'notification', label: 'Notification' },
  { value: 'alert', label: 'Alert' }
]

export function useOrderSounds(restaurantId) {
  const [soundSettings, setSoundSettings] = useState(defaultSoundSettings)
  const [loading, setLoading] = useState(true)
  const soundGeneratorRef = useRef(null)
  const lastPlayedRef = useRef({})
  const soundSettingsRef = useRef(soundSettings)

  // Keep ref in sync with state
  useEffect(() => {
    soundSettingsRef.current = soundSettings
    console.log('🔊 Sound settings updated:', soundSettings)
  }, [soundSettings])

  // Initialize sound generator
  useEffect(() => {
    if (typeof window !== 'undefined') {
      soundGeneratorRef.current = getSoundGenerator()
      console.log('🔊 Sound generator initialized')
    }
  }, [])

  // Fetch sound settings from restaurant
  useEffect(() => {
    const fetchSettings = async () => {
      if (!restaurantId) {
        setLoading(false)
        return
      }

      try {
        console.log('🔊 Fetching sound settings for restaurant:', restaurantId)
        const { data, error } = await supabase
          .from('restaurants')
          .select('sound_settings')
          .eq('id', restaurantId)
          .single()

        console.log('🔊 Fetched sound settings:', data?.sound_settings, 'Error:', error)

        if (!error && data?.sound_settings) {
          const newSettings = {
            ...defaultSoundSettings,
            ...data.sound_settings
          }
          setSoundSettings(newSettings)
          soundSettingsRef.current = newSettings
        }
      } catch (err) {
        console.error('Error fetching sound settings:', err)
      }

      setLoading(false)
    }

    fetchSettings()
  }, [restaurantId])

  // Resume audio context (needed after user interaction)
  const resumeAudio = useCallback(() => {
    if (soundGeneratorRef.current) {
      soundGeneratorRef.current.resume()
      console.log('🔊 Audio context resumed')
    }
  }, [])

  // Play sound for a specific department/type - uses ref for latest settings
  const playSound = useCallback((type) => {
    const settings = soundSettingsRef.current
    console.log('🔊 playSound called:', type, 'enabled:', settings.enabled)

    if (!settings.enabled) {
      console.log('🔊 Sound not enabled, skipping')
      return
    }

    // Prevent playing same sound too frequently (debounce 1 second)
    const now = Date.now()
    if (lastPlayedRef.current[type] && now - lastPlayedRef.current[type] < 1000) {
      console.log('🔊 Sound debounced, skipping')
      return
    }
    lastPlayedRef.current[type] = now

    let soundKey
    switch (type) {
      case 'kitchen':
        soundKey = settings.kitchenSound
        break
      case 'bar':
        soundKey = settings.barSound
        break
      case 'takeaway':
        soundKey = settings.takeawaySound
        break
      default:
        soundKey = settings.kitchenSound
    }

    console.log('🔊 Playing sound:', soundKey, 'volume:', settings.volume)

    if (soundGeneratorRef.current) {
      soundGeneratorRef.current.play(soundKey, settings.volume)
    } else {
      console.log('🔊 Sound generator not available')
    }
  }, [])

  // Play sound for new order based on order items - uses ref for latest settings
  const playNewOrderSound = useCallback((order, menuItems = []) => {
    const settings = soundSettingsRef.current
    console.log('🔊 playNewOrderSound called, enabled:', settings.enabled, 'order:', order?.id)

    if (!settings.enabled || !order) {
      console.log('🔊 Skipping - enabled:', settings.enabled, 'order:', !!order)
      return
    }

    // Check if this is a takeaway order
    if (order.order_type === 'takeaway') {
      console.log('🔊 Takeaway order detected')
      playSound('takeaway')
      return
    }

    // Check order items to determine which department(s) to notify
    const orderItems = order.order_items || []
    const departments = new Set()

    console.log('🔊 Order items:', orderItems.length, 'Menu items:', menuItems.length)

    orderItems.forEach(item => {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id)
      if (menuItem?.department) {
        departments.add(menuItem.department)
      }
    })

    console.log('🔊 Departments found:', [...departments])

    // Play sounds for each department (with slight delay between)
    let delay = 0
    if (departments.has('kitchen')) {
      setTimeout(() => playSound('kitchen'), delay)
      delay += 500
    }
    if (departments.has('bar')) {
      setTimeout(() => playSound('bar'), delay)
    }

    // If no specific department found, default to kitchen
    if (departments.size === 0) {
      console.log('🔊 No department found, defaulting to kitchen')
      playSound('kitchen')
    }
  }, [playSound])

  // Test sound function for settings page
  const testSound = useCallback((soundKey, volume = 0.7) => {
    console.log('🔊 Testing sound:', soundKey, 'volume:', volume)
    if (soundGeneratorRef.current) {
      soundGeneratorRef.current.play(soundKey, volume)
    }
  }, [])

  // Save sound settings to restaurant
  const saveSoundSettings = useCallback(async (newSettings) => {
    if (!restaurantId) return { error: 'No restaurant ID' }

    const { error } = await supabase
      .from('restaurants')
      .update({ sound_settings: newSettings })
      .eq('id', restaurantId)

    if (!error) {
      setSoundSettings(newSettings)
      soundSettingsRef.current = newSettings
    }

    return { error }
  }, [restaurantId])

  return {
    soundSettings,
    setSoundSettings,
    loading,
    playSound,
    playNewOrderSound,
    testSound,
    saveSoundSettings,
    resumeAudio,
    soundOptions
  }
}

export default useOrderSounds
