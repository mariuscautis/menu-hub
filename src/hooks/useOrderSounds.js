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

  // Initialize sound generator
  useEffect(() => {
    if (typeof window !== 'undefined') {
      soundGeneratorRef.current = getSoundGenerator()
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
        const { data, error } = await supabase
          .from('restaurants')
          .select('sound_settings')
          .eq('id', restaurantId)
          .single()

        if (!error && data?.sound_settings) {
          setSoundSettings({
            ...defaultSoundSettings,
            ...data.sound_settings
          })
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
    }
  }, [])

  // Play sound for a specific department/type
  const playSound = useCallback((type) => {
    if (!soundSettings.enabled) return

    // Prevent playing same sound too frequently (debounce 1 second)
    const now = Date.now()
    if (lastPlayedRef.current[type] && now - lastPlayedRef.current[type] < 1000) {
      return
    }
    lastPlayedRef.current[type] = now

    let soundKey
    switch (type) {
      case 'kitchen':
        soundKey = soundSettings.kitchenSound
        break
      case 'bar':
        soundKey = soundSettings.barSound
        break
      case 'takeaway':
        soundKey = soundSettings.takeawaySound
        break
      default:
        soundKey = soundSettings.kitchenSound
    }

    if (soundGeneratorRef.current) {
      soundGeneratorRef.current.play(soundKey, soundSettings.volume)
    }
  }, [soundSettings])

  // Play sound for new order based on order items
  const playNewOrderSound = useCallback((order, menuItems = []) => {
    if (!soundSettings.enabled || !order) return

    // Check if this is a takeaway order
    if (order.order_type === 'takeaway') {
      playSound('takeaway')
      return
    }

    // Check order items to determine which department(s) to notify
    const orderItems = order.order_items || []
    const departments = new Set()

    orderItems.forEach(item => {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id)
      if (menuItem?.department) {
        departments.add(menuItem.department)
      }
    })

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
      playSound('kitchen')
    }
  }, [soundSettings, playSound])

  // Test sound function for settings page
  const testSound = useCallback((soundKey, volume = 0.7) => {
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
