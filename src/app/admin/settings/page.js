'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { clearBrandingCache } from '@/lib/usePlatformBranding'

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [branding, setBranding] = useState({
    platform_name: 'Menu Hub',
    logo_url: null,
    theme_color: '#6262bd',
    background_color: '#ffffff'
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef(null)

  useEffect(() => {
    fetchBranding()
  }, [])

  const fetchBranding = async () => {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'branding')
      .single()

    if (data?.value) {
      setBranding(prev => ({ ...prev, ...data.value }))
      if (data.value.logo_url) setLogoPreview(data.value.logo_url)
    }
    setLoading(false)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File size must be less than 5MB' })
      return
    }

    setUploadingLogo(true)
    setMessage(null)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => setLogoPreview(reader.result)
      reader.readAsDataURL(file)

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `platform-logo.${fileExt}`
      const filePath = `branding/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('platform-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // Try creating the bucket if it doesn't exist
        if (uploadError.message.includes('not found')) {
          setMessage({ type: 'error', text: 'Storage bucket not configured. Please run the migration first.' })
          setUploadingLogo(false)
          return
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('platform-assets')
        .getPublicUrl(filePath)

      // Add cache buster
      const logoUrl = `${publicUrl}?t=${Date.now()}`
      setBranding(prev => ({ ...prev, logo_url: logoUrl }))
      setMessage({ type: 'success', text: 'Logo uploaded successfully!' })
    } catch (error) {
      console.error('Logo upload error:', error)
      setMessage({ type: 'error', text: 'Failed to upload logo' })
    }

    setUploadingLogo(false)
  }

  const removeLogo = () => {
    setBranding(prev => ({ ...prev, logo_url: null }))
    setLogoPreview(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'branding',
          value: branding,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })

      if (error) throw error

      // Clear the branding cache so changes take effect immediately
      clearBrandingCache()

      setMessage({ type: 'success', text: 'Branding settings saved successfully! Refresh the page to see changes across the site.' })
    } catch (error) {
      console.error('Save error:', error)
      setMessage({ type: 'error', text: 'Failed to save settings' })
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Platform Settings</h1>
        <p className="text-slate-500">Configure branding and appearance for the entire platform</p>
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

      {/* Platform Name */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">Platform Name</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Name displayed across the platform
          </label>
          <input
            type="text"
            value={branding.platform_name}
            onChange={(e) => setBranding(prev => ({ ...prev, platform_name: e.target.value }))}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            placeholder="Menu Hub"
          />
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">Platform Logo</h2>
        <p className="text-sm text-slate-500 mb-4">
          This logo appears on the website header, login pages, and emails.
        </p>

        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-32 h-32 object-contain rounded-2xl border-2 border-slate-200 bg-slate-50"
                />
                <button
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 bg-gradient-to-br from-[#6262bd] to-[#8b5cf6] rounded-2xl flex items-center justify-center">
                <span className="text-white text-4xl font-bold">M</span>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-6 py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {uploadingLogo ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                  </svg>
                  Upload Logo
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Recommended: Square image, at least 256x256 pixels. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* App Icon Info */}
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
          </svg>
          Staff App Icon (PWA)
        </h2>
        <p className="text-sm text-green-700">
          The staff app icon is automatically set to each restaurant's logo for a personalized experience.
          When staff install the app, it will show their restaurant's logo on their home screen.
          If a restaurant doesn't have a logo, the platform logo above will be used instead.
        </p>
      </div>

      {/* Theme Colors */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">Theme Colors</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Primary Color (Theme)
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={branding.theme_color}
                onChange={(e) => setBranding(prev => ({ ...prev, theme_color: e.target.value }))}
                className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={branding.theme_color}
                onChange={(e) => setBranding(prev => ({ ...prev, theme_color: e.target.value }))}
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] font-mono text-slate-700"
                placeholder="#6262bd"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Used for the browser toolbar and PWA theme.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Background Color
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={branding.background_color}
                onChange={(e) => setBranding(prev => ({ ...prev, background_color: e.target.value }))}
                className="w-12 h-12 rounded-xl border-2 border-slate-200 cursor-pointer"
              />
              <input
                type="text"
                value={branding.background_color}
                onChange={(e) => setBranding(prev => ({ ...prev, background_color: e.target.value }))}
                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] font-mono text-slate-700"
                placeholder="#ffffff"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Used for the PWA splash screen background.
            </p>
          </div>
        </div>
      </div>

      {/* PWA Update Info */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-blue-800 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          How PWA Updates Work
        </h2>
        <ul className="text-sm text-blue-700 space-y-2">
          <li><strong>Website changes:</strong> Take effect immediately after saving. Refresh the browser to see changes.</li>
          <li><strong>Installed app (PWA) updates:</strong> The app automatically checks for updates in the background. Users will see the new logo and name the next time they open the app after closing it completely.</li>
          <li><strong>App icon on home screen:</strong> The icon shown on the home screen is cached by the device. For a new icon to appear, users need to uninstall and reinstall the app.</li>
        </ul>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#6262bd] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Saving...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
            </svg>
            Save Branding Settings
          </>
        )}
      </button>
    </div>
  )
}
