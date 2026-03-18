'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { clearBrandingCache } from '@/lib/usePlatformBranding'

const DEFAULT_CATEGORIES = [
  { value: 'restaurant',    label: 'Restaurant / Café / Bar' },
  { value: 'beauty',        label: 'Beauty & Wellness' },
  { value: 'fitness',       label: 'Fitness & Sport' },
  { value: 'hotel',         label: 'Hotel & Accommodation' },
  { value: 'entertainment', label: 'Entertainment & Events' },
  { value: 'health',        label: 'Health & Medical' },
  { value: 'education',     label: 'Education & Tutoring' },
  { value: 'other',         label: 'Other' },
]

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [branding, setBranding] = useState({
    platform_name: 'Veno App',
    logo_url: null,
    theme_color: '#6262bd',
    background_color: '#ffffff'
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef(null)
  const [faviconPreview, setFaviconPreview] = useState(null)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const faviconInputRef = useRef(null)

  // Industry categories
  const [categories, setCategories] = useState([])
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [savingCategories, setSavingCategories] = useState(false)
  const [categoryMessage, setCategoryMessage] = useState(null)

  // SMS billing
  const [smsMonth, setSmsMonth] = useState(() => {
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
  })
  const [smsPreview, setSmsPreview] = useState(null)
  const [smsPreviewLoading, setSmsPreviewLoading] = useState(false)
  const [smsRunning, setSmsRunning] = useState(false)
  const [smsMessage, setSmsMessage] = useState(null)

  useEffect(() => {
    fetchBranding()
    fetchCategories()
  }, [])

  const fetchBranding = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'branding')
      .single()

    if (data?.value) {
      setBranding(prev => ({ ...prev, ...data.value }))
      if (data.value.logo_url) setLogoPreview(data.value.logo_url)
      if (data.value.favicon_url) setFaviconPreview(data.value.favicon_url)
    }
    setLoading(false)
  }

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'industry_categories')
      .single()

    setCategories(data?.value ?? DEFAULT_CATEGORIES)
  }

  const addCategory = () => {
    const label = newCategoryLabel.trim()
    if (!label) return
    // Generate a slug-style value from the label
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (categories.some(c => c.value === value)) return
    setCategories(prev => [...prev, { value, label }])
    setNewCategoryLabel('')
  }

  const removeCategory = (value) => {
    setCategories(prev => prev.filter(c => c.value !== value))
  }

  const saveCategories = async () => {
    setSavingCategories(true)
    setCategoryMessage(null)
    // Try update first; if no row matched, insert
    const { data: updated, error: updateError } = await supabase
      .from('platform_settings')
      .update({ value: categories })
      .eq('key', 'industry_categories')
      .select('key')

    let error = updateError
    if (!updateError && (!updated || updated.length === 0)) {
      const { error: insertError } = await supabase
        .from('platform_settings')
        .insert({ key: 'industry_categories', value: categories })
      error = insertError
    }

    setSavingCategories(false)
    setCategoryMessage(error
      ? { type: 'error', text: 'Failed to save categories.' }
      : { type: 'success', text: 'Categories saved.' }
    )
    setTimeout(() => setCategoryMessage(null), 3000)
  }

  const loadSmsPreview = async (month) => {
    setSmsPreviewLoading(true)
    setSmsPreview(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch(`/api/admin/sms-billing?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setSmsPreview(await res.json())
    } catch (e) {
      console.error('SMS preview error:', e)
    }
    setSmsPreviewLoading(false)
  }

  const runSmsBilling = async () => {
    if (!confirm(`Run SMS billing for ${smsMonth}? This will create Stripe invoice items for all opted-in venues.`)) return
    setSmsRunning(true)
    setSmsMessage(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/admin/sms-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ billingMonth: smsMonth })
      })
      const json = await res.json()
      if (res.ok) {
        setSmsMessage({ type: 'success', text: `Billing run complete. ${json.results?.length || 0} venue(s) billed.` })
        loadSmsPreview(smsMonth)
      } else {
        setSmsMessage({ type: 'error', text: json.error || 'Billing run failed.' })
      }
    } catch (e) {
      setSmsMessage({ type: 'error', text: 'Billing run failed.' })
    }
    setSmsRunning(false)
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

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Favicon must be less than 2MB' })
      return
    }

    setUploadingFavicon(true)
    setMessage(null)

    try {
      const reader = new FileReader()
      reader.onloadend = () => setFaviconPreview(reader.result)
      reader.readAsDataURL(file)

      const fileExt = file.name.split('.').pop()
      const filePath = `branding/platform-favicon.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('platform-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('platform-assets')
        .getPublicUrl(filePath)

      const faviconUrl = `${publicUrl}?t=${Date.now()}`
      setBranding(prev => ({ ...prev, favicon_url: faviconUrl }))
      setMessage({ type: 'success', text: 'Favicon uploaded successfully!' })
    } catch (error) {
      console.error('Favicon upload error:', error)
      setMessage({ type: 'error', text: 'Failed to upload favicon' })
    }

    setUploadingFavicon(false)
  }

  const removeFavicon = () => {
    setBranding(prev => ({ ...prev, favicon_url: null }))
    setFaviconPreview(null)
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
            placeholder="Veno App"
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

      {/* Favicon Upload */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">Favicon</h2>
        <p className="text-sm text-slate-500 mb-4">
          The small icon shown in browser tabs. Recommended: square PNG or ICO, at least 32×32 pixels.
        </p>

        <div className="flex items-start gap-6">
          {/* Preview */}
          <div className="flex-shrink-0">
            {faviconPreview ? (
              <div className="relative">
                <img
                  src={faviconPreview}
                  alt="Favicon preview"
                  className="w-16 h-16 object-contain rounded-xl border-2 border-slate-200 bg-slate-50"
                />
                <button
                  onClick={removeFavicon}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="w-16 h-16 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              onChange={handleFaviconUpload}
              className="hidden"
            />
            <button
              onClick={() => faviconInputRef.current?.click()}
              disabled={uploadingFavicon}
              className="px-6 py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {uploadingFavicon ? (
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
                  Upload Favicon
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 mt-2">
              Square PNG or ICO recommended. Max 2MB.
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

      {/* Industry Categories */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-1">Industry Categories</h2>
        <p className="text-sm text-slate-500 mb-5">
          These categories are assigned to venues and used to filter peer reviews. Add or remove as needed.
        </p>

        {categoryMessage && (
          <div className={`mb-4 p-3 rounded-xl border text-sm ${
            categoryMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {categoryMessage.text}
          </div>
        )}

        <div className="space-y-2 mb-4">
          {categories.map(cat => (
            <div key={cat.value} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-sm font-medium text-slate-700">{cat.label}</span>
              <button
                onClick={() => removeCategory(cat.value)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No categories yet.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryLabel}
            onChange={e => setNewCategoryLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="e.g. Photography Studio"
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#6262bd]"
          />
          <button
            onClick={addCategory}
            disabled={!newCategoryLabel.trim()}
            className="px-4 py-2.5 bg-[#6262bd] text-white rounded-xl text-sm font-medium hover:bg-[#5252a3] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        <button
          onClick={saveCategories}
          disabled={savingCategories}
          className="mt-4 w-full bg-slate-800 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {savingCategories ? 'Saving…' : 'Save Categories'}
        </button>
      </div>

      {/* SMS Billing */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-1">SMS Verification Billing</h2>
        <p className="text-sm text-slate-500 mb-5">
          Preview and run the monthly SMS billing charge for opted-in venues. Each opted-in venue will have a Stripe invoice item added to their next subscription renewal.
        </p>

        {smsMessage && (
          <div className={`mb-4 p-3 rounded-xl border text-sm ${
            smsMessage.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {smsMessage.text}
          </div>
        )}

        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Billing month</label>
          <input
            type="month"
            value={smsMonth}
            onChange={e => { setSmsMonth(e.target.value); setSmsPreview(null) }}
            className="px-3 py-2 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#6262bd]"
          />
          <button
            onClick={() => loadSmsPreview(smsMonth)}
            disabled={smsPreviewLoading}
            className="px-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:border-slate-300 disabled:opacity-50"
          >
            {smsPreviewLoading ? 'Loading…' : 'Preview'}
          </button>
        </div>

        {smsPreview && (
          <div className="mb-4">
            {smsPreview.lastRun && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3">
                Billing already run for this month on {new Date(smsPreview.lastRun.ran_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}. Running again will create duplicate charges.
              </p>
            )}
            {smsPreview.venues?.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No SMS usage recorded for this month.</p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-600">Venue</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-600">SMS sent</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Rate</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-slate-600">Amount</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {smsPreview.venues.map(v => (
                      <tr key={v.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2.5 font-medium text-slate-800">{v.name}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{v.sms_count}</td>
                        <td className="px-4 py-2.5 text-center text-slate-500">{v.rate_pence}p</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                          £{(v.amount_pence / 100).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {!v.billing_enabled ? (
                            <span className="text-xs text-slate-400">Opt-out</span>
                          ) : !v.has_stripe ? (
                            <span className="text-xs text-amber-600">No Stripe</span>
                          ) : (
                            <span className="text-xs text-green-600 font-medium">Will bill</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {smsPreview.venues?.some(v => v.billing_enabled && v.has_stripe) && (
              <button
                onClick={runSmsBilling}
                disabled={smsRunning}
                className="mt-4 w-full bg-slate-800 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {smsRunning ? 'Running billing…' : `Run billing for ${smsMonth}`}
              </button>
            )}
          </div>
        )}
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
