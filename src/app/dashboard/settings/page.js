'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [staffLoginPassword, setStaffLoginPassword] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [restaurantPhone, setRestaurantPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  // Invoice settings state
  const [invoiceSettings, setInvoiceSettings] = useState({
    enabled: false,
    tax_system: 'VAT',
    tax_rates: [{ name: 'Standard', rate: 20, is_default: true }],
    vat_number: '',
    tax_id: '',
    company_registration: '',
    invoice_prefix: 'INV',
    invoice_format: '{PREFIX}-{YEAR}-{NUMBER}',
    next_invoice_number: 1,
    reset_yearly: true,
    currency: 'EUR',
    locale: 'en-GB',
    footer_text: '',
    require_customer_vat: false,
    require_sequential: true
  })
  const [savingInvoiceSettings, setSavingInvoiceSettings] = useState(false)

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
        setStaffLoginPassword(ownedRestaurant.staff_login_password || '')
        setLogoPreview(ownedRestaurant.logo_url || null)
        setRestaurantPhone(ownedRestaurant.phone || '')

        // Initialize invoice settings
        if (ownedRestaurant.invoice_settings) {
          setInvoiceSettings({
            enabled: ownedRestaurant.invoice_settings.enabled || false,
            tax_system: ownedRestaurant.invoice_settings.tax_system || 'VAT',
            tax_rates: ownedRestaurant.invoice_settings.tax_rates || [{ name: 'Standard', rate: 20, is_default: true }],
            vat_number: ownedRestaurant.invoice_settings.vat_number || '',
            tax_id: ownedRestaurant.invoice_settings.tax_id || '',
            company_registration: ownedRestaurant.invoice_settings.company_registration || '',
            invoice_prefix: ownedRestaurant.invoice_settings.invoice_prefix || 'INV',
            invoice_format: ownedRestaurant.invoice_settings.invoice_format || '{PREFIX}-{YEAR}-{NUMBER}',
            next_invoice_number: ownedRestaurant.invoice_settings.next_invoice_number || 1,
            reset_yearly: ownedRestaurant.invoice_settings.reset_yearly !== undefined ? ownedRestaurant.invoice_settings.reset_yearly : true,
            currency: ownedRestaurant.invoice_settings.currency || 'EUR',
            locale: ownedRestaurant.invoice_settings.locale || 'en-GB',
            footer_text: ownedRestaurant.invoice_settings.footer_text || '',
            require_customer_vat: ownedRestaurant.invoice_settings.require_customer_vat || false,
            require_sequential: ownedRestaurant.invoice_settings.require_sequential !== undefined ? ownedRestaurant.invoice_settings.require_sequential : true
          })
        }
      }

      setLoading(false)
    }

    fetchRestaurant()
  }, [])

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setStaffLoginPassword(password)
    setShowPassword(true)
  }

  const handleSave = async () => {
    if (!staffLoginPassword || staffLoginPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('restaurants')
      .update({ staff_login_password: staffLoginPassword })
      .eq('id', restaurant.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update password' })
    } else {
      setMessage({ type: 'success', text: 'Staff login password updated successfully!' })
      setRestaurant({ ...restaurant, staff_login_password: staffLoginPassword })
    }

    setSaving(false)
  }

  const getStaffLoginUrl = () => {
    if (typeof window === 'undefined' || !restaurant) return ''
    return `${window.location.origin}/r/${restaurant.slug}/auth/staff-login`
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: 'success', text: 'Copied to clipboard!' })
    setTimeout(() => setMessage(null), 2000)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoUpload = async () => {
    if (!logoFile) return

    setUploadingLogo(true)
    setMessage(null)

    try {
      // Upload new logo
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `${restaurant.id}/logo.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(fileName, logoFile, { upsert: true })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        if (uploadError.message.includes('not found')) {
          setMessage({ type: 'error', text: 'Storage bucket not found. Please create the "restaurant-logos" bucket in Supabase Storage first.' })
        } else if (uploadError.message.includes('policy')) {
          setMessage({ type: 'error', text: 'Permission denied. Please set up storage policies.' })
        } else {
          setMessage({ type: 'error', text: `Failed to upload logo: ${uploadError.message}` })
        }
        setUploadingLogo(false)
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(fileName)

      // Update restaurant record
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: publicUrl })
        .eq('id', restaurant.id)

      if (updateError) {
        setMessage({ type: 'error', text: 'Failed to update logo' })
      } else {
        setMessage({ type: 'success', text: 'Logo updated successfully!' })
        setRestaurant({ ...restaurant, logo_url: publicUrl })
        setLogoFile(null)
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      setMessage({ type: 'error', text: 'Failed to upload logo' })
    }

    setUploadingLogo(false)
  }

  const handleRemoveLogo = async () => {
    if (!confirm('Are you sure you want to remove the logo?')) return

    setUploadingLogo(true)
    setMessage(null)

    // Update restaurant record to remove logo
    const { error } = await supabase
      .from('restaurants')
      .update({ logo_url: null })
      .eq('id', restaurant.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to remove logo' })
    } else {
      setMessage({ type: 'success', text: 'Logo removed successfully!' })
      setRestaurant({ ...restaurant, logo_url: null })
      setLogoPreview(null)
      setLogoFile(null)
    }

    setUploadingLogo(false)
  }

  const handleSavePhone = async () => {
    setSavingPhone(true)
    setMessage(null)

    const { error } = await supabase
      .from('restaurants')
      .update({ phone: restaurantPhone || null })
      .eq('id', restaurant.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update phone number' })
    } else {
      setMessage({ type: 'success', text: 'Phone number updated successfully!' })
      setRestaurant({ ...restaurant, phone: restaurantPhone })
    }

    setSavingPhone(false)
  }

  const handleSaveInvoiceSettings = async () => {
    setSavingInvoiceSettings(true)
    setMessage(null)

    const { error } = await supabase
      .from('restaurants')
      .update({ invoice_settings: invoiceSettings })
      .eq('id', restaurant.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update invoice settings' })
    } else {
      setMessage({ type: 'success', text: 'Invoice settings updated successfully!' })
      setRestaurant({ ...restaurant, invoice_settings: invoiceSettings })
    }

    setSavingInvoiceSettings(false)
  }

  const addTaxRate = () => {
    setInvoiceSettings({
      ...invoiceSettings,
      tax_rates: [...invoiceSettings.tax_rates, { name: '', rate: 0, is_default: false }]
    })
  }

  const updateTaxRate = (index, field, value) => {
    const newTaxRates = [...invoiceSettings.tax_rates]
    if (field === 'is_default' && value) {
      // Only one tax rate can be default
      newTaxRates.forEach((rate, i) => {
        rate.is_default = i === index
      })
    } else {
      newTaxRates[index][field] = field === 'rate' ? parseFloat(value) || 0 : value
    }
    setInvoiceSettings({ ...invoiceSettings, tax_rates: newTaxRates })
  }

  const removeTaxRate = (index) => {
    if (invoiceSettings.tax_rates.length === 1) {
      setMessage({ type: 'error', text: 'You must have at least one tax rate' })
      setTimeout(() => setMessage(null), 3000)
      return
    }
    const newTaxRates = invoiceSettings.tax_rates.filter((_, i) => i !== index)
    // If removed rate was default, make first rate default
    if (invoiceSettings.tax_rates[index].is_default && newTaxRates.length > 0) {
      newTaxRates[0].is_default = true
    }
    setInvoiceSettings({ ...invoiceSettings, tax_rates: newTaxRates })
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
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500">Manage your restaurant settings and security</p>
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

      {/* Restaurant Information Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-2">Restaurant Information</h2>
          <p className="text-sm text-slate-500">
            Contact information for your restaurant. This will be used in customer communications.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurant.name}
              disabled
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500 mt-2">
              Restaurant name cannot be changed from settings.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Restaurant Phone Number
            </label>
            <input
              type="tel"
              value={restaurantPhone}
              onChange={(e) => setRestaurantPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            />
            <p className="text-xs text-slate-500 mt-2">
              This phone number will be included in cancellation emails so customers can contact you if there's an error.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              onClick={handleSavePhone}
              disabled={savingPhone}
              className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {savingPhone ? 'Saving...' : 'Save Restaurant Information'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Settings Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-700 mb-2">Invoice Settings</h2>
              <p className="text-sm text-slate-500">
                Configure invoice generation for corporate clients and tax purposes.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.enabled}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#6262bd]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6262bd]"></div>
              <span className="ml-3 text-sm font-medium text-slate-700">
                {invoiceSettings.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        {invoiceSettings.enabled && (
          <div className="space-y-6 border-t border-slate-100 pt-6">
            {/* Tax System */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax System
              </label>
              <select
                value={invoiceSettings.tax_system}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, tax_system: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              >
                <option value="VAT">VAT (Value Added Tax)</option>
                <option value="GST">GST (Goods and Services Tax)</option>
                <option value="Sales Tax">Sales Tax</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Tax Rates */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">
                  Tax Rates
                </label>
                <button
                  onClick={addTaxRate}
                  className="text-sm text-[#6262bd] hover:text-[#5252a3] font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Rate
                </button>
              </div>
              <div className="space-y-3">
                {invoiceSettings.tax_rates.map((rate, index) => (
                  <div key={index} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={rate.name}
                        onChange={(e) => updateTaxRate(index, 'name', e.target.value)}
                        placeholder="Rate name (e.g., Standard)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd] text-sm"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={rate.rate}
                        onChange={(e) => updateTaxRate(index, 'rate', e.target.value)}
                        placeholder="20"
                        step="0.01"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd] text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rate.is_default}
                          onChange={(e) => updateTaxRate(index, 'is_default', e.target.checked)}
                          className="rounded border-slate-300 text-[#6262bd] focus:ring-[#6262bd]"
                        />
                        Default
                      </label>
                      <button
                        onClick={() => removeTaxRate(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Tax Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  VAT Number
                </label>
                <input
                  type="text"
                  value={invoiceSettings.vat_number}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, vat_number: e.target.value })}
                  placeholder="GB123456789"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  value={invoiceSettings.tax_id}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, tax_id: e.target.value })}
                  placeholder="123-45-6789"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Registration
                </label>
                <input
                  type="text"
                  value={invoiceSettings.company_registration}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, company_registration: e.target.value })}
                  placeholder="12345678"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
            </div>

            {/* Invoice Number Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invoice Prefix
                </label>
                <input
                  type="text"
                  value={invoiceSettings.invoice_prefix}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_prefix: e.target.value })}
                  placeholder="INV"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Invoice Format
                </label>
                <input
                  type="text"
                  value={invoiceSettings.invoice_format}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_format: e.target.value })}
                  placeholder="{PREFIX}-{YEAR}-{NUMBER}"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {'{PREFIX}'}, {'{YEAR}'}, {'{NUMBER}'} as placeholders
                </p>
              </div>
            </div>

            {/* Currency and Locale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Currency
                </label>
                <select
                  value={invoiceSettings.currency}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, currency: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="RON">RON (lei)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Locale (Date Format)
                </label>
                <select
                  value={invoiceSettings.locale}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, locale: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  <option value="en-GB">en-GB (DD/MM/YYYY)</option>
                  <option value="en-US">en-US (MM/DD/YYYY)</option>
                  <option value="de-DE">de-DE (DD.MM.YYYY)</option>
                  <option value="fr-FR">fr-FR (DD/MM/YYYY)</option>
                  <option value="ro-RO">ro-RO (DD.MM.YYYY)</option>
                </select>
              </div>
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Invoice Footer Text
              </label>
              <textarea
                value={invoiceSettings.footer_text}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footer_text: e.target.value })}
                placeholder="Thank you for your business! Payment terms: Net 30 days."
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              />
              <p className="text-xs text-slate-500 mt-1">
                This text will appear at the bottom of every invoice
              </p>
            </div>

            {/* Additional Options */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoiceSettings.reset_yearly}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, reset_yearly: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-[#6262bd] focus:ring-[#6262bd]"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Reset invoice numbers yearly</div>
                  <div className="text-xs text-slate-500">Start numbering from 1 each year</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoiceSettings.require_sequential}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, require_sequential: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-[#6262bd] focus:ring-[#6262bd]"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Require sequential numbering</div>
                  <div className="text-xs text-slate-500">Ensure invoices are numbered in order</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoiceSettings.require_customer_vat}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, require_customer_vat: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-[#6262bd] focus:ring-[#6262bd]"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700">Require customer VAT number</div>
                  <div className="text-xs text-slate-500">Make VAT number mandatory for invoices</div>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-4">
              <button
                onClick={handleSaveInvoiceSettings}
                disabled={savingInvoiceSettings}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {savingInvoiceSettings ? 'Saving...' : 'Save Invoice Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Restaurant Logo Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-2">Restaurant Logo</h2>
          <p className="text-sm text-slate-500">
            Upload your restaurant logo to personalize your dashboard. This logo will be visible to you and all your staff members.
          </p>
        </div>

        <div className="space-y-4">
          {/* Logo Preview */}
          {logoPreview && (
            <div className="flex items-center gap-4">
              <div className="w-32 h-32 bg-slate-100 rounded-xl border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                <img
                  src={logoPreview}
                  alt="Restaurant Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 mb-2">Current Logo</p>
                <button
                  onClick={handleRemoveLogo}
                  disabled={uploadingLogo}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Remove Logo
                </button>
              </div>
            </div>
          )}

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {logoPreview ? 'Change Logo' : 'Upload Logo'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              disabled={uploadingLogo}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#6262bd] file:text-white hover:file:bg-[#5252a3] file:cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-slate-500 mt-2">
              Recommended: Square image, at least 200x200px. PNG or JPG format.
            </p>
          </div>

          {/* Upload Button */}
          {logoFile && (
            <div className="pt-2">
              <button
                onClick={handleLogoUpload}
                disabled={uploadingLogo}
                className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Staff Login Security Section */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-2">Staff Login Security</h2>
            <p className="text-sm text-slate-500">
              Set a password that staff members must enter before using their PIN codes.
              This prevents unauthorized access to your staff login page.
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
            </svg>
            <span>Secure</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Staff Login URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Staff Login URL
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <code className="text-[#6262bd] text-sm break-all">
                  {getStaffLoginUrl()}
                </code>
              </div>
              <button
                onClick={() => copyToClipboard(getStaffLoginUrl())}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Share this URL with your staff. They'll need the password below to access it.
            </p>
          </div>

          {/* Staff Login Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Staff Login Password
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={staffLoginPassword}
                  onChange={(e) => setStaffLoginPassword(e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  )}
                </button>
              </div>
              <button
                onClick={generatePassword}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium text-slate-700 transition-colors whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Staff must enter this password before they can use their PIN codes to log in.
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !staffLoginPassword || staffLoginPassword.length < 6}
              className="w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving ? 'Saving...' : 'Save Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
        <div className="flex gap-3">
          <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <div>
            <h3 className="font-bold text-blue-900 mb-2">How Staff Login Works</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Staff navigate to your restaurant's login URL</li>
              <li>They enter the restaurant password (one-time per session)</li>
              <li>They enter their personal 3-digit PIN code</li>
              <li>They access their dashboard</li>
            </ol>
            <p className="text-sm text-blue-800 mt-3">
              <strong>Security tip:</strong> Change this password regularly and only share it with trusted staff members.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
