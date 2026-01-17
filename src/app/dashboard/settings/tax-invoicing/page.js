'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TemplateSelector from '@/components/invoices/TemplateSelector'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function TaxInvoicing() {
  const t = useTranslations('taxInvoicing')
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
      setMessage({ type: 'error', text: t('errorMessage') })
    } else {
      setMessage({ type: 'success', text: t('successMessage') })
      setRestaurant({ ...restaurant, invoice_settings: invoiceSettings })
    }
    setSavingInvoiceSettings(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-slate-500">{t('loading')}</div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
          {t('accessError')}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t('pageTitle')}</h1>
        <p className="text-slate-500">{t('pageSubtitle')}</p>
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
              <h2 className="text-lg font-bold text-slate-700 mb-2">{t('sectionTitle')}</h2>
              <p className="text-sm text-slate-500">
                {t('sectionDescription')}
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
                {invoiceSettings.enabled ? t('enabled') : t('disabled')}
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
                  {t('vatNumber')}
                </label>
                <input
                  type="text"
                  value={invoiceSettings.vat_number}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, vat_number: e.target.value })}
                  placeholder={t('vatNumberPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('taxId')}
                </label>
                <input
                  type="text"
                  value={invoiceSettings.tax_id}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, tax_id: e.target.value })}
                  placeholder={t('taxIdPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('companyRegistration')}
                </label>
                <input
                  type="text"
                  value={invoiceSettings.company_registration}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, company_registration: e.target.value })}
                  placeholder={t('companyRegistrationPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
            </div>

            {/* Invoice Number Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoicePrefix')}
                </label>
                <input
                  type="text"
                  value={invoiceSettings.invoice_prefix}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_prefix: e.target.value })}
                  placeholder={t('invoicePrefixPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('invoiceFormat')}
                </label>
                <input
                  type="text"
                  value={invoiceSettings.invoice_format}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, invoice_format: e.target.value })}
                  placeholder={t('invoiceFormatPlaceholder')}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {t('invoiceFormatHelp')}
                </p>
              </div>
            </div>

            {/* Currency and Locale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('currency')}
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
                  {t('locale')}
                </label>
                <select
                  value={invoiceSettings.locale}
                  onChange={(e) => setInvoiceSettings({ ...invoiceSettings, locale: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                >
                  <option value="en-GB">English (DD/MM/YYYY)</option>
                  <option value="en-US">English US (MM/DD/YYYY)</option>
                  <option value="ro-RO">Română (DD.MM.YYYY)</option>
                  <option value="es-ES">Español (DD/MM/YYYY)</option>
                  <option value="fr-FR">Français (DD/MM/YYYY)</option>
                  <option value="it-IT">Italiano (DD/MM/YYYY)</option>
                </select>
              </div>
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {t('footerText')}
              </label>
              <textarea
                value={invoiceSettings.footer_text}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footer_text: e.target.value })}
                placeholder={t('footerTextPlaceholder')}
                rows={3}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
              />
              <p className="text-xs text-slate-500 mt-1">
                {t('footerTextHelp')}
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
                  <div className="text-sm font-medium text-slate-700">{t('resetYearlyTitle')}</div>
                  <div className="text-xs text-slate-500">{t('resetYearlyDescription')}</div>
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
                  <div className="text-sm font-medium text-slate-700">{t('requireSequentialTitle')}</div>
                  <div className="text-xs text-slate-500">{t('requireSequentialDescription')}</div>
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
                  <div className="text-sm font-medium text-slate-700">{t('requireCustomerVatTitle')}</div>
                  <div className="text-xs text-slate-500">{t('requireCustomerVatDescription')}</div>
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
                {savingInvoiceSettings ? t('saving') : t('saveButton')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
