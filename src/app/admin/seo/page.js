'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const PAGES = [
  {
    group: 'Public',
    items: [
      { key: 'home', label: 'Home', path: '/' },
      { key: 'pricing', label: 'Pricing', path: '/pricing' },
      { key: 'about', label: 'About', path: '/about' },
      { key: 'contact', label: 'Contact', path: '/contact' },
      { key: 'login', label: 'Login', path: '/auth/login' },
    ]
  },
  {
    group: 'Services',
    items: [
      { key: 'services_qr_menu', label: 'QR Menu', path: '/services/qr-menu' },
      { key: 'services_reservations', label: 'Reservations', path: '/services/reservations' },
      { key: 'services_table_ordering', label: 'Table Ordering', path: '/services/table-ordering' },
      { key: 'services_staff_management', label: 'Staff Management', path: '/services/staff-management' },
      { key: 'services_analytics', label: 'Analytics', path: '/services/analytics' },
      { key: 'services_branded_app', label: 'Branded App', path: '/services/branded-app' },
      { key: 'services_dashboard', label: 'Dashboard', path: '/services/dashboard' },
      { key: 'services_inventory', label: 'Inventory', path: '/services/inventory' },
    ]
  },
  {
    group: 'Legal',
    items: [
      { key: 'privacy', label: 'Privacy Policy', path: '/privacy' },
      { key: 'terms', label: 'Terms of Service', path: '/terms' },
      { key: 'cookies', label: 'Cookie Policy', path: '/cookies' },
    ]
  },
]

const DEFAULTS = {
  home:                      { title: 'Veno App — Restaurant Management Platform', description: 'Run your restaurant smarter with Veno App. Digital menus, table ordering, staff management, reservations, and real-time analytics — all in one platform.' },
  pricing:                   { title: 'Pricing — Veno App', description: 'Simple, transparent pricing for restaurants of every size. Choose the Veno App modules that fit your venue and scale as you grow.' },
  about:                     { title: 'About Us — Veno App', description: 'Learn about the team behind Veno App and our mission to simplify restaurant management for independent venues everywhere.' },
  contact:                   { title: 'Contact Us — Veno App', description: "Get in touch with the Veno App team. We'd love to hear from you — whether it's a question, feedback, or a partnership enquiry." },
  login:                     { title: 'Log In — Veno App', description: 'Sign in to your Veno App restaurant dashboard to manage orders, menus, staff, and reports.' },
  services_qr_menu:          { title: 'QR Code Menus That Customers Love — Veno App', description: 'Create stunning digital QR menus your customers can access instantly on any smartphone. No app download needed. Always up to date.' },
  services_reservations:     { title: 'Smart Reservations. Zero Missed Bookings. — Veno App', description: "Manage table bookings effortlessly with Veno App's smart reservation system. Reduce no-shows, optimise capacity, and delight every guest." },
  services_table_ordering:   { title: 'Let Customers Order Directly From Their Table — Veno App', description: "Boost revenue and speed up service with Veno App's table ordering. Customers scan a QR code, browse the menu, and place orders without waiting for staff." },
  services_staff_management: { title: 'Staff Management Made Simple — Veno App', description: 'Schedule shifts, track work history, manage time-off requests, and keep your team organised — all from one easy-to-use dashboard.' },
  services_analytics:        { title: 'Data-Driven Decisions for Your Restaurant — Veno App', description: 'Unlock powerful sales reports, tax breakdowns, stock movement tracking, and real-time analytics to help your restaurant thrive.' },
  services_branded_app:      { title: 'Your Restaurant, Your App — Veno App', description: 'Launch a fully branded PWA for your restaurant in minutes. Your logo, your colours, your experience — no app store needed.' },
  services_dashboard:        { title: 'Command Central for Your Team — Veno App', description: 'The Veno App management dashboard gives owners and managers full visibility over orders, staff, reports, and settings — all in one place.' },
  services_inventory:        { title: 'Inventory Management — Veno App', description: 'Track stock levels in real-time, get automatic low-stock alerts, and never run out of ingredients during service again.' },
  privacy:                   { title: 'Privacy Policy — Veno App', description: 'How Veno App collects, uses, and protects your personal data.' },
  terms:                     { title: 'Terms of Service — Veno App', description: 'The terms and conditions governing your use of Veno App.' },
  cookies:                   { title: 'Cookie Policy — Veno App', description: 'How Veno App uses cookies and similar technologies.' },
}

export default function SeoPage() {
  const [seoData, setSeoData] = useState({})
  const [selectedKey, setSelectedKey] = useState('home')
  const [formValues, setFormValues] = useState({ title: '', description: '', ogImage: null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [message, setMessage] = useState(null)
  const imageInputRef = useRef(null)

  useEffect(() => { fetchSeo() }, [])

  useEffect(() => {
    const saved = seoData[selectedKey] || {}
    const defaults = DEFAULTS[selectedKey] || {}
    setFormValues({
      title: saved.title ?? defaults.title ?? '',
      description: saved.description ?? defaults.description ?? '',
      ogImage: saved.ogImage ?? null,
    })
  }, [selectedKey, seoData])

  const fetchSeo = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'seo')
      .single()
    setSeoData(data?.value || {})
    setLoading(false)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file.' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be under 5 MB.' })
      return
    }

    setUploadingImage(true)
    setMessage(null)

    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `seo/og-${selectedKey}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('platform-assets')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('platform-assets')
        .getPublicUrl(filePath)

      const imageUrl = `${publicUrl}?t=${Date.now()}`
      setFormValues(v => ({ ...v, ogImage: imageUrl }))
      setMessage({ type: 'success', text: 'Image uploaded. Click Save Changes to apply.' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Upload failed. Check your storage bucket configuration.' })
    }

    setUploadingImage(false)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  const handleRemoveImage = () => {
    setFormValues(v => ({ ...v, ogImage: null }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const updated = { ...seoData, [selectedKey]: formValues }

    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key: 'seo', value: updated, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save. Please try again.' })
    } else {
      setSeoData(updated)
      setMessage({ type: 'success', text: 'SEO settings saved.' })
      setTimeout(() => setMessage(null), 3000)
    }

    setSaving(false)
  }

  const handleReset = () => {
    const defaults = DEFAULTS[selectedKey] || {}
    setFormValues({ title: defaults.title || '', description: defaults.description || '', ogImage: null })
  }

  const isCustomised = (key) => !!seoData[key]

  const selectedPage = PAGES.flatMap(g => g.items).find(p => p.key === selectedKey)
  const titleLength = formValues.title.length
  const descLength = formValues.description.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 text-sm">Loading SEO settings...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">SEO Settings</h1>
        <p className="text-slate-500 mt-1">Manage the page title, meta description, and social share image for each public-facing page.</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Page selector */}
        <div className="w-64 shrink-0">
          <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
            {PAGES.map((group) => (
              <div key={group.group}>
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{group.group}</span>
                </div>
                {group.items.map((page) => (
                  <button
                    key={page.key}
                    onClick={() => setSelectedKey(page.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors border-b border-slate-50 last:border-0 ${
                      selectedKey === page.key
                        ? 'bg-[#6262bd]/10 text-[#6262bd] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{page.label}</span>
                    {isCustomised(page.key) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6262bd] shrink-0" title="Customised" />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">

            {/* Page header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selectedPage?.label}</h2>
                <a
                  href={selectedPage?.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-400 hover:text-[#6262bd] transition-colors"
                >
                  {selectedPage?.path} ↗
                </a>
              </div>
              {isCustomised(selectedKey) && (
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
                >
                  Reset to default
                </button>
              )}
            </div>

            {/* Title field */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Page Title</label>
                <span className={`text-xs font-medium ${titleLength > 60 ? 'text-amber-500' : titleLength > 50 ? 'text-yellow-500' : 'text-slate-400'}`}>
                  {titleLength} / 60 chars
                </span>
              </div>
              <input
                type="text"
                value={formValues.title}
                onChange={e => setFormValues(v => ({ ...v, title: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#6262bd] transition-colors"
                placeholder="e.g. Your Page Title — Veno App"
              />
              <p className="text-xs text-slate-400 mt-1.5">Displayed in browser tabs and search results. Keep it under 60 characters.</p>
            </div>

            {/* Description field */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Meta Description</label>
                <span className={`text-xs font-medium ${descLength > 160 ? 'text-amber-500' : descLength > 140 ? 'text-yellow-500' : 'text-slate-400'}`}>
                  {descLength} / 160 chars
                </span>
              </div>
              <textarea
                value={formValues.description}
                onChange={e => setFormValues(v => ({ ...v, description: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-[#6262bd] transition-colors resize-none"
                placeholder="A brief description of this page for search engines…"
              />
              <p className="text-xs text-slate-400 mt-1.5">Shown in Google search previews. Keep it under 160 characters.</p>
            </div>

            {/* OG Image field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Social Share Image</label>
              <p className="text-xs text-slate-400 mb-3">
                This image appears when the URL is shared on WhatsApp, Slack, X, iMessage, etc. Recommended size: <strong>1200 × 630 px</strong>.
              </p>

              {formValues.ogImage ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50">
                  <img
                    src={formValues.ogImage}
                    alt="Social share preview"
                    className="w-full max-h-64 object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold rounded-lg shadow hover:bg-white transition-colors"
                    >
                      Replace
                    </button>
                    <button
                      onClick={handleRemoveImage}
                      className="px-3 py-1.5 bg-white/90 backdrop-blur-sm text-red-600 text-xs font-semibold rounded-lg shadow hover:bg-white transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full flex flex-col items-center justify-center gap-2 px-6 py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-[#6262bd] hover:text-[#6262bd] transition-colors"
                >
                  {uploadingImage ? (
                    <>
                      <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      <span className="text-sm font-medium">Uploading…</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 19.5h18M3 4.5h18" />
                      </svg>
                      <div className="text-center">
                        <span className="text-sm font-semibold">Click to upload image</span>
                        <p className="text-xs mt-0.5">PNG, JPG, WebP up to 5 MB</p>
                      </div>
                    </>
                  )}
                </button>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* Social preview */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Previews</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Google search preview */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-2">Google Search</p>
                  <p className="text-xs text-slate-400 mb-0.5 truncate">venoapp.com{selectedPage?.path}</p>
                  <p className="text-[#1a0dab] text-base font-medium leading-snug line-clamp-1">
                    {formValues.title || <span className="italic text-slate-300">No title set</span>}
                  </p>
                  <p className="text-slate-600 text-sm mt-0.5 line-clamp-2">
                    {formValues.description || <span className="italic text-slate-300">No description set</span>}
                  </p>
                </div>

                {/* Social card preview */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-medium mb-2">Social Share Card</p>
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                    {formValues.ogImage ? (
                      <img src={formValues.ogImage} alt="" className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-slate-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
                        </svg>
                      </div>
                    )}
                    <div className="p-2.5 border-t border-slate-100">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">venoapp.com</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 line-clamp-1">
                        {formValues.title || <span className="italic text-slate-300">No title</span>}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {formValues.description || <span className="italic text-slate-300">No description</span>}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || uploadingImage}
                className="px-6 py-2.5 bg-[#6262bd] text-white rounded-xl font-semibold text-sm hover:bg-[#5252a3] transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {message && (
                <span className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {message.text}
                </span>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
