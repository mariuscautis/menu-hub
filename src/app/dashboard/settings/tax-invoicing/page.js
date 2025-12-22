'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TemplateSelector from '@/components/invoices/TemplateSelector'

export default function TaxInvoicing() {
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  // Invoice settings state
  const [invoiceSettings, setInvoiceSettings] = useState({
    enabled: false,
    template: 'classic',
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
        // Initialize invoice settings
        if (ownedRestaurant.invoice_settings) {
          setInvoiceSettings({
            enabled: ownedRestaurant.invoice_settings.enabled || false,
            template: ownedRestaurant.invoice_settings.template || 'classic',
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
        <h1 className="text-2xl font-bold text-slate-800">Tax & Invoicing</h1>
        <p className="text-slate-500">Configure invoice generation for corporate clients and tax purposes</p>
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
            {/* Template Selector */}
            <TemplateSelector
              selectedTemplate={invoiceSettings.template}
              onSelectTemplate={(templateId) => setInvoiceSettings({ ...invoiceSettings, template: templateId })}
            />

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
    </div>
  )
}
