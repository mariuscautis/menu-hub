'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const defaultBranding = {
  platform_name: 'Veno App',
  logo_url: null,
  icon_192: null,
  theme_color: '#6262bd',
  background_color: '#ffffff'
}

let cachedBranding = null
let fetchPromise = null

export function usePlatformBranding() {
  const [branding, setBranding] = useState(cachedBranding || defaultBranding)
  const [loading, setLoading] = useState(!cachedBranding)

  useEffect(() => {
    const fetchBranding = async () => {
      // Return cached if available
      if (cachedBranding) {
        setBranding(cachedBranding)
        setLoading(false)
        return
      }

      // Avoid duplicate fetches
      if (fetchPromise) {
        const result = await fetchPromise
        setBranding(result)
        setLoading(false)
        return
      }

      fetchPromise = (async () => {
        try {
          const { data, error } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'branding')
            .single()

          if (error) {
            console.error('Error fetching branding:', error)
            return defaultBranding
          }

          const result = { ...defaultBranding, ...data?.value }
          cachedBranding = result
          return result
        } catch (error) {
          console.error('Error fetching branding:', error)
          return defaultBranding
        } finally {
          fetchPromise = null
        }
      })()

      const result = await fetchPromise
      setBranding(result)
      setLoading(false)
    }

    fetchBranding()
  }, [])

  return { branding, loading }
}

// Function to clear cache (useful when branding is updated)
export function clearBrandingCache() {
  cachedBranding = null
}
