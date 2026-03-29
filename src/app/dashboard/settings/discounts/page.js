'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useCurrency } from '@/lib/CurrencyContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
]

const EMPTY_DISCOUNT = {
  name: '',
  type: 'percentage',
  value: '',
  description: '',
  is_promotion: false,
  product_id: '',
  promo_start_date: '',
  promo_end_date: '',
  promo_days: [],
}

export default function DiscountsSettings() {
  useModuleGuard('ordering')
  const t = useTranslations('discounts')
  const tc = useTranslations('common')
  const { currencySymbol } = useCurrency()
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()

  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const [discounts, setDiscounts] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editState, setEditState] = useState({})

  const [newDiscount, setNewDiscount] = useState(EMPTY_DISCOUNT)

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    const r = restaurantCtx.restaurant
    setRestaurant(r)
    Promise.all([
      fetchDiscounts(r.id),
      fetchMenuItems(r.id),
    ]).finally(() => setLoading(false))
  }, [restaurantCtx])

  const fetchDiscounts = async (restaurantId) => {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('active', true)
      .order('name')

    if (error) {
      console.error('Error fetching discounts:', error)
      setMessage({ type: 'error', text: 'Failed to load discounts' })
    } else {
      setDiscounts(data || [])
    }
  }

  const fetchMenuItems = async (restaurantId) => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, price, available')
      .eq('restaurant_id', restaurantId)
      .eq('available', true)
      .order('name')

    if (!error) setMenuItems(data || [])
  }

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const validateDiscount = (discount, currentId = null) => {
    if (!discount.name.trim()) {
      showMessage('error', t('validation.nameRequired') || 'Discount name is required')
      return false
    }

    const value = parseFloat(discount.value)
    if (isNaN(value) || value <= 0) {
      showMessage('error', t('validation.invalidValue') || 'Please enter a valid discount value')
      return false
    }

    if (discount.type === 'percentage' && value > 100) {
      showMessage('error', t('validation.percentageMax') || 'Percentage cannot exceed 100%')
      return false
    }

    if (discounts.some(d => d.id !== currentId && d.name.toLowerCase() === discount.name.trim().toLowerCase())) {
      showMessage('error', t('validation.duplicateName') || 'A discount with this name already exists')
      return false
    }

    if (discount.is_promotion) {
      if (!discount.product_id) {
        showMessage('error', t('validation.productRequired') || 'Please select a product for this promotion')
        return false
      }
      if (!discount.promo_start_date || !discount.promo_end_date) {
        showMessage('error', t('validation.datesRequired') || 'Please set a start and end date for this promotion')
        return false
      }
      if (new Date(discount.promo_start_date) > new Date(discount.promo_end_date)) {
        showMessage('error', t('validation.dateOrder') || 'Start date must be before end date')
        return false
      }
    }

    return true
  }

  const buildPayload = (discount, restaurantId) => ({
    restaurant_id: restaurantId,
    name: discount.name.trim(),
    type: discount.type,
    value: parseFloat(discount.value),
    description: discount.description.trim() || null,
    is_promotion: discount.is_promotion,
    product_id: discount.is_promotion && discount.product_id ? discount.product_id : null,
    promo_start_date: discount.is_promotion && discount.promo_start_date ? discount.promo_start_date : null,
    promo_end_date: discount.is_promotion && discount.promo_end_date ? discount.promo_end_date : null,
    promo_days: discount.is_promotion && discount.promo_days.length > 0 ? discount.promo_days : null,
  })

  const handleAddDiscount = async () => {
    if (!validateDiscount(newDiscount)) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('discounts')
        .insert(buildPayload(newDiscount, restaurant.id))

      if (error) throw error

      showMessage('success', t('messages.discountAdded') || 'Discount added successfully')
      setNewDiscount(EMPTY_DISCOUNT)
      await fetchDiscounts(restaurant.id)
    } catch (error) {
      console.error('Error adding discount:', error)
      showMessage('error', t('messages.addFailed') || 'Failed to add discount')
    } finally {
      setSaving(false)
    }
  }

  const startEditing = (discount) => {
    setEditingId(discount.id)
    setEditState({
      name: discount.name,
      type: discount.type,
      value: String(discount.value),
      description: discount.description || '',
      is_promotion: discount.is_promotion || false,
      product_id: discount.product_id || '',
      promo_start_date: discount.promo_start_date || '',
      promo_end_date: discount.promo_end_date || '',
      promo_days: discount.promo_days || [],
    })
  }

  const handleUpdateDiscount = async () => {
    if (!validateDiscount(editState, editingId)) return

    setSaving(true)
    try {
      const payload = buildPayload(editState, restaurant.id)
      delete payload.restaurant_id

      const { error } = await supabase
        .from('discounts')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId)

      if (error) throw error

      showMessage('success', t('messages.discountUpdated') || 'Discount updated successfully')
      setEditingId(null)
      await fetchDiscounts(restaurant.id)
    } catch (error) {
      console.error('Error updating discount:', error)
      showMessage('error', t('messages.updateFailed') || 'Failed to update discount')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteDiscount = async (id, name) => {
    const { data: usageCheck } = await supabase
      .from('order_discounts')
      .select('id')
      .eq('discount_id', id)
      .limit(1)

    const hasBeenUsed = usageCheck && usageCheck.length > 0
    const confirmMessage = hasBeenUsed
      ? `This discount "${name}" has been used on previous orders. Are you sure you want to deactivate it? Historical data will be preserved.`
      : `Are you sure you want to delete the discount "${name}"?`

    if (!confirm(confirmMessage)) return

    try {
      const { error } = await supabase
        .from('discounts')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      showMessage('success', t('messages.discountDeleted') || 'Discount deactivated successfully')
      await fetchDiscounts(restaurant.id)
    } catch (error) {
      console.error('Error deleting discount:', error)
      showMessage('error', t('messages.deleteFailed') || 'Failed to delete discount')
    }
  }

  const formatDiscountValue = (discount) => {
    if (discount.type === 'percentage') return `${discount.value}%`
    return `${currencySymbol}${discount.value.toFixed(2)}`
  }

  const formatPromoDays = (days) => {
    if (!days || days.length === 0) return 'Every day'
    return days.sort((a, b) => a - b).map(d => DAYS_OF_WEEK[d].label).join(', ')
  }

  const isPromoActive = (discount) => {
    if (!discount.is_promotion) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = discount.promo_start_date ? new Date(discount.promo_start_date) : null
    const end = discount.promo_end_date ? new Date(discount.promo_end_date) : null
    if (start && today < start) return 'upcoming'
    if (end && today > end) return 'expired'
    if (discount.promo_days && discount.promo_days.length > 0) {
      const todayDay = today.getDay()
      if (!discount.promo_days.includes(todayDay)) return 'off-day'
    }
    return 'active'
  }

  const toggleDay = (days, setFn, day) => {
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    setFn(next)
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-slate-500 dark:text-slate-400">
            {tc('loading') || 'Loading...'}
          </div>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-red-500">
            {t('accessDenied') || 'Access denied - Restaurant owners and admins only'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <PageTabs tabs={settingsTabs} />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('title') || 'Discount Templates'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {t('description') || 'Create discount templates that can be applied to orders at payment time.'}
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                {t('infoTitle') || 'How Discounts Work'}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {t('infoText') || `Create discount templates here, then apply them to orders during the payment process. Enable "Promotion" to tie a discount to a specific product with a date range and optional day restrictions.`}
              </p>
            </div>
          </div>
        </div>

        {/* Existing Discounts */}
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">
            {t('existingDiscounts') || 'Existing Discounts'}
          </h2>

          {discounts.length > 0 ? (
            <div className="space-y-3">
              {discounts.map((discount) => {
                const promoStatus = isPromoActive(discount)
                return (
                  <div
                    key={discount.id}
                    className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                  >
                    {editingId === discount.id ? (
                      <DiscountForm
                        state={editState}
                        setState={setEditState}
                        menuItems={menuItems}
                        currencySymbol={currencySymbol}
                        onSave={handleUpdateDiscount}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                        t={t}
                        tc={tc}
                        toggleDay={(day) => {
                          const next = editState.promo_days.includes(day)
                            ? editState.promo_days.filter(d => d !== day)
                            : [...editState.promo_days, day]
                          setEditState(s => ({ ...s, promo_days: next }))
                        }}
                      />
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-800 dark:text-slate-100">{discount.name}</p>
                            {discount.is_promotion && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                promoStatus === 'active'
                                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                  : promoStatus === 'upcoming'
                                  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                                  : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                              }`}>
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {promoStatus === 'active' ? 'Promo Active' : promoStatus === 'upcoming' ? 'Upcoming' : promoStatus === 'expired' ? 'Expired' : 'Not Today'}
                              </span>
                            )}
                          </div>
                          {discount.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{discount.description}</p>
                          )}
                          {discount.is_promotion && (
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              {discount.product_id && (() => {
                                const item = menuItems.find(m => m.id === discount.product_id)
                                return item ? (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                    </svg>
                                    {item.name}
                                  </span>
                                ) : null
                              })()}
                              {discount.promo_start_date && (
                                <span>{discount.promo_start_date} – {discount.promo_end_date}</span>
                              )}
                              <span>{formatPromoDays(discount.promo_days)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                            discount.type === 'percentage'
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          }`}>
                            {formatDiscountValue(discount)}
                          </span>
                          <button
                            onClick={() => startEditing(discount)}
                            className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
                          >
                            {tc('edit') || 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDeleteDiscount(discount.id, discount.name)}
                            className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50"
                          >
                            {tc('delete') || 'Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {t('noDiscounts') || 'No discount templates yet. Create one below to get started.'}
            </div>
          )}
        </div>

        {/* Add New Discount */}
        <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">
            {t('addNew') || 'Add New Discount'}
          </h2>
          <DiscountForm
            state={newDiscount}
            setState={setNewDiscount}
            menuItems={menuItems}
            currencySymbol={currencySymbol}
            onSave={handleAddDiscount}
            saving={saving}
            isNew
            t={t}
            tc={tc}
            toggleDay={(day) => {
              const next = newDiscount.promo_days.includes(day)
                ? newDiscount.promo_days.filter(d => d !== day)
                : [...newDiscount.promo_days, day]
              setNewDiscount(s => ({ ...s, promo_days: next }))
            }}
          />
        </div>

        {/* Examples */}
        <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('examples.title') || 'Example Discount Templates'}
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• <strong>{t('examples.staff') || 'Staff Discount'}:</strong> 15% {t('examples.staffDesc') || 'for employee meals'}</li>
            <li>• <strong>{t('examples.loyalty') || 'Loyalty 10%'}:</strong> 10% {t('examples.loyaltyDesc') || 'for repeat customers'}</li>
            <li>• <strong>{t('examples.happyHour') || 'Happy Hour'}:</strong> 20% {t('examples.happyHourDesc') || 'for drinks during 4-6pm'}</li>
            <li>• <strong>{t('examples.promo') || 'Launch Promo'}:</strong> {currencySymbol}5 {t('examples.promoDesc') || `off orders over ${currencySymbol}30`}</li>
            <li>• <strong>Burger Tuesday:</strong> 10% off the Classic Burger — every Tuesday in March</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reusable form used for both "Add" and "Edit"
// ---------------------------------------------------------------------------
function DiscountForm({ state, setState, menuItems, currencySymbol, onSave, onCancel, saving, isNew, t, tc, toggleDay }) {
  const set = (key, val) => setState(s => ({ ...s, [key]: val }))
  const [productSearch, setProductSearch] = React.useState('')
  const [productDropdownOpen, setProductDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef(null)

  React.useEffect(() => {
    if (!productDropdownOpen) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProductDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [productDropdownOpen])

  const filteredItems = productSearch.trim()
    ? menuItems.filter(i => i.name.toLowerCase().includes(productSearch.toLowerCase()))
    : menuItems

  const selectedItemName = menuItems.find(i => i.id === state.product_id)?.name || ''

  return (
    <div className="space-y-4">
      {/* Name + Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('form.name') || 'Discount Name'}
          </label>
          <input
            type="text"
            value={state.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            placeholder={t('form.namePlaceholder') || 'e.g., Staff Discount, Loyalty 10%, Happy Hour'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('form.type') || 'Type'}
          </label>
          <select
            value={state.type}
            onChange={(e) => set('type', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="percentage">{t('form.percentage') || 'Percentage (%)'}</option>
            <option value="fixed">{t('form.fixed') || 'Fixed Amount'}</option>
          </select>
        </div>
      </div>

      {/* Value + Description */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('form.value') || 'Value'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={state.value}
              onChange={(e) => set('value', e.target.value)}
              step="0.01"
              min="0"
              max={state.type === 'percentage' ? 100 : undefined}
              className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              placeholder={state.type === 'percentage' ? '10' : '5.00'}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
              {state.type === 'percentage' ? '%' : currencySymbol}
            </span>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('form.description') || 'Description'} <span className="text-slate-400">({tc('optional') || 'optional'})</span>
          </label>
          <input
            type="text"
            value={state.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            placeholder={t('form.descriptionPlaceholder') || 'e.g., For loyalty program members'}
          />
        </div>
      </div>

      {/* Promotion Toggle */}
      <div className={`rounded-xl border-2 transition-colors ${
        state.is_promotion
          ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10'
          : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30'
      } p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100 text-sm">
              {t('form.isPromotion') || 'Timed Promotion'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('form.isPromotionDesc') || 'Tie this discount to a specific product and activate it only within a date range or on certain days'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => set('is_promotion', !state.is_promotion)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              state.is_promotion ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              state.is_promotion ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {state.is_promotion && (
          <div className="mt-4 space-y-4">
            {/* Product selector with search */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('form.product') || 'Apply to Product'}
              </label>
              {/* Trigger button */}
              <button
                type="button"
                onClick={() => {
                  setProductDropdownOpen(o => !o)
                  setProductSearch('')
                }}
                className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-orange-400 bg-white dark:bg-slate-800 text-left flex items-center justify-between"
              >
                <span className={selectedItemName ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}>
                  {selectedItemName || (t('form.selectProduct') || '— Select a product —')}
                </span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${productDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {productDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden">
                  {/* Search input */}
                  <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        autoFocus
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-orange-400 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  {/* Options list */}
                  <ul className="max-h-48 overflow-y-auto">
                    <li>
                      <button
                        type="button"
                        onClick={() => { set('product_id', ''); setProductDropdownOpen(false) }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        {t('form.selectProduct') || '— Select a product —'}
                      </button>
                    </li>
                    {filteredItems.length > 0 ? filteredItems.map(item => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => { set('product_id', item.id); setProductDropdownOpen(false); setProductSearch('') }}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                            state.product_id === item.id
                              ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 font-medium'
                              : 'text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          {item.name}
                        </button>
                      </li>
                    )) : (
                      <li className="px-4 py-3 text-sm text-slate-400 text-center">No products found</li>
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('form.startDate') || 'Start Date'}
                </label>
                <input
                  type="date"
                  value={state.promo_start_date}
                  onChange={(e) => set('promo_start_date', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-orange-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('form.endDate') || 'End Date'}
                </label>
                <input
                  type="date"
                  value={state.promo_end_date}
                  onChange={(e) => set('promo_end_date', e.target.value)}
                  min={state.promo_start_date || undefined}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-orange-400 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Days of week */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                {t('form.promoDays') || 'Active Days'} <span className="text-slate-400 font-normal">({t('form.promoDaysHint') || 'leave empty for every day'})</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleDay(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      state.promo_days.includes(value)
                        ? 'bg-orange-500 text-white'
                        : 'bg-white dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-orange-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2.5 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-500"
          >
            {tc('cancel') || 'Cancel'}
          </button>
        )}
        <button
          onClick={onSave}
          disabled={saving || !state.name || !state.value}
          className="px-6 py-2.5 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {!isNew ? null : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          )}
          {saving
            ? (tc('saving') || 'Saving...')
            : isNew
            ? (t('form.addButton') || 'Add Discount')
            : (tc('save') || 'Save')}
        </button>
      </div>
    </div>
  )
}
