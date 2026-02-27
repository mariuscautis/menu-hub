'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'

/**
 * Discounts Settings Page
 *
 * This page allows restaurant owners/admins to manage discount templates.
 * Discounts can be:
 * - Percentage-based (e.g., 10% off)
 * - Fixed amount (e.g., £5 off)
 *
 * These discount templates can then be applied to orders at payment time.
 * The actual discount application happens in the payment flow using the
 * apply_order_discount RPC function.
 */
export default function DiscountsSettings() {
  const t = useTranslations('discounts')
  const tc = useTranslations('common')

  // State for restaurant and loading
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Discounts state
  const [discounts, setDiscounts] = useState([])
  const [editingId, setEditingId] = useState(null)

  // New discount form state
  const [newDiscount, setNewDiscount] = useState({
    name: '',
    type: 'percentage', // 'percentage' or 'fixed'
    value: '',
    description: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  /**
   * Fetch restaurant data and existing discounts
   */
  const fetchData = async () => {
    try {
      setLoading(true)

      // Check for staff session first (admin staff can manage discounts)
      const staffSessionData = localStorage.getItem('staff_session')
      let restaurantData = null

      if (staffSessionData) {
        try {
          const staffSession = JSON.parse(staffSessionData)
          // Only admin staff can manage discounts
          if (staffSession.role === 'admin') {
            restaurantData = staffSession.restaurant
          } else {
            setMessage({ type: 'error', text: 'Only restaurant owners and admins can manage discounts' })
            setLoading(false)
            return
          }
        } catch (err) {
          localStorage.removeItem('staff_session')
        }
      }

      // If not staff session, check for owner auth
      if (!restaurantData) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/auth/login'
          return
        }

        // Get restaurant owned by user
        const { data: ownedRestaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle()

        if (!ownedRestaurant) {
          setMessage({ type: 'error', text: 'Restaurant not found or you do not have permission' })
          setLoading(false)
          return
        }

        restaurantData = ownedRestaurant
      }

      setRestaurant(restaurantData)

      // Fetch existing discounts
      await fetchDiscounts(restaurantData.id)
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Fetch all active discounts for the restaurant
   */
  const fetchDiscounts = async (restaurantId) => {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching discounts:', error)
      setMessage({ type: 'error', text: 'Failed to load discounts' })
    } else {
      setDiscounts(data || [])
    }
  }

  /**
   * Display a temporary message
   */
  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  /**
   * Add a new discount template
   */
  const handleAddDiscount = async () => {
    // Validate name
    if (!newDiscount.name.trim()) {
      showMessage('error', t('validation.nameRequired') || 'Discount name is required')
      return
    }

    // Validate value
    const value = parseFloat(newDiscount.value)
    if (isNaN(value) || value <= 0) {
      showMessage('error', t('validation.invalidValue') || 'Please enter a valid discount value')
      return
    }

    // For percentage, max is 100
    if (newDiscount.type === 'percentage' && value > 100) {
      showMessage('error', t('validation.percentageMax') || 'Percentage cannot exceed 100%')
      return
    }

    // Check for duplicate name
    if (discounts.some(d => d.name.toLowerCase() === newDiscount.name.trim().toLowerCase())) {
      showMessage('error', t('validation.duplicateName') || 'A discount with this name already exists')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('discounts')
        .insert({
          restaurant_id: restaurant.id,
          name: newDiscount.name.trim(),
          type: newDiscount.type,
          value: value,
          description: newDiscount.description.trim() || null
        })

      if (error) throw error

      showMessage('success', t('messages.discountAdded') || 'Discount added successfully')
      setNewDiscount({ name: '', type: 'percentage', value: '', description: '' })
      await fetchDiscounts(restaurant.id)
    } catch (error) {
      console.error('Error adding discount:', error)
      showMessage('error', t('messages.addFailed') || 'Failed to add discount')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Update an existing discount
   */
  const handleUpdateDiscount = async (id, name, type, value, description) => {
    const parsedValue = parseFloat(value)

    // Validate
    if (!name.trim()) {
      showMessage('error', t('validation.nameRequired') || 'Discount name is required')
      return
    }

    if (isNaN(parsedValue) || parsedValue <= 0) {
      showMessage('error', t('validation.invalidValue') || 'Please enter a valid discount value')
      return
    }

    if (type === 'percentage' && parsedValue > 100) {
      showMessage('error', t('validation.percentageMax') || 'Percentage cannot exceed 100%')
      return
    }

    // Check for duplicate name (excluding current)
    if (discounts.some(d => d.id !== id && d.name.toLowerCase() === name.trim().toLowerCase())) {
      showMessage('error', t('validation.duplicateName') || 'A discount with this name already exists')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('discounts')
        .update({
          name: name.trim(),
          type: type,
          value: parsedValue,
          description: description?.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

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

  /**
   * Delete (soft delete) a discount
   */
  const handleDeleteDiscount = async (id, name) => {
    // Check if discount has been used on any orders
    const { data: usageCheck, error: checkError } = await supabase
      .from('order_discounts')
      .select('id')
      .eq('discount_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking discount usage:', checkError)
      showMessage('error', 'Failed to check if discount is in use')
      return
    }

    // If discount has been used, warn user but still allow deletion (soft delete)
    const hasBeenUsed = usageCheck && usageCheck.length > 0
    const confirmMessage = hasBeenUsed
      ? `This discount "${name}" has been used on previous orders. Are you sure you want to deactivate it? Historical data will be preserved.`
      : `Are you sure you want to delete the discount "${name}"?`

    if (!confirm(confirmMessage)) {
      return
    }

    // Soft delete - just mark as inactive
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      showMessage('success', t('messages.discountDeleted') || 'Discount deactivated successfully')
      await fetchDiscounts(restaurant.id)
    } catch (error) {
      console.error('Error deleting discount:', error)
      showMessage('error', t('messages.deleteFailed') || 'Failed to delete discount')
    }
  }

  /**
   * Format the discount value for display
   */
  const formatDiscountValue = (discount) => {
    if (discount.type === 'percentage') {
      return `${discount.value}%`
    } else {
      // Get currency from restaurant settings or default to £
      const currency = restaurant?.currency || '£'
      return `${currency}${discount.value.toFixed(2)}`
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-slate-500 dark:text-slate-400">
            {tc('loading') || 'Loading...'}
          </div>
        </div>
      </div>
    )
  }

  // Access denied state
  if (!restaurant) {
    return (
      <div className="p-8">
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
          <div
            className={`mb-6 p-4 rounded-xl border-2 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Info Box */}
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                {t('infoTitle') || 'How Discounts Work'}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {t('infoText') || 'Create discount templates here, then apply them to orders during the payment process. Discounts can be percentage-based (e.g., 10% off for loyalty members) or fixed amounts (e.g., £5 off promotion). All applied discounts are tracked in reports.'}
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
              {discounts.map((discount) => (
                <div
                  key={discount.id}
                  className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600"
                >
                  {editingId === discount.id ? (
                    // Edit mode
                    <>
                      <input
                        type="text"
                        defaultValue={discount.name}
                        id={`name-${discount.id}`}
                        className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        placeholder={t('form.namePlaceholder') || 'Discount name'}
                      />
                      <select
                        defaultValue={discount.type}
                        id={`type-${discount.id}`}
                        className="px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                      >
                        <option value="percentage">{t('form.percentage') || 'Percentage (%)'}</option>
                        <option value="fixed">{t('form.fixed') || 'Fixed Amount'}</option>
                      </select>
                      <input
                        type="number"
                        defaultValue={discount.value}
                        id={`value-${discount.id}`}
                        step="0.01"
                        min="0"
                        className="w-24 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        placeholder="Value"
                      />
                      <button
                        onClick={() => {
                          const name = document.getElementById(`name-${discount.id}`).value
                          const type = document.getElementById(`type-${discount.id}`).value
                          const value = document.getElementById(`value-${discount.id}`).value
                          handleUpdateDiscount(discount.id, name, type, value, discount.description)
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a3] disabled:opacity-50"
                      >
                        {tc('save') || 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
                      >
                        {tc('cancel') || 'Cancel'}
                      </button>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800 dark:text-slate-100">{discount.name}</p>
                        {discount.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">{discount.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          discount.type === 'percentage'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {formatDiscountValue(discount)}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingId(discount.id)}
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
                    </>
                  )}
                </div>
              ))}
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

          <div className="space-y-4">
            {/* Name and Type row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('form.name') || 'Discount Name'}
                </label>
                <input
                  type="text"
                  value={newDiscount.name}
                  onChange={(e) => setNewDiscount({ ...newDiscount, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  placeholder={t('form.namePlaceholder') || 'e.g., Staff Discount, Loyalty 10%, Happy Hour'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('form.type') || 'Type'}
                </label>
                <select
                  value={newDiscount.type}
                  onChange={(e) => setNewDiscount({ ...newDiscount, type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                >
                  <option value="percentage">{t('form.percentage') || 'Percentage (%)'}</option>
                  <option value="fixed">{t('form.fixed') || 'Fixed Amount'}</option>
                </select>
              </div>
            </div>

            {/* Value and Description row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('form.value') || 'Value'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newDiscount.value}
                    onChange={(e) => setNewDiscount({ ...newDiscount, value: e.target.value })}
                    step="0.01"
                    min="0"
                    max={newDiscount.type === 'percentage' ? 100 : undefined}
                    className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    placeholder={newDiscount.type === 'percentage' ? '10' : '5.00'}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    {newDiscount.type === 'percentage' ? '%' : restaurant?.currency || '£'}
                  </span>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('form.description') || 'Description'} <span className="text-slate-400">({tc('optional') || 'optional'})</span>
                </label>
                <input
                  type="text"
                  value={newDiscount.description}
                  onChange={(e) => setNewDiscount({ ...newDiscount, description: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  placeholder={t('form.descriptionPlaceholder') || 'e.g., For loyalty program members'}
                />
              </div>
            </div>

            {/* Add Button */}
            <div className="flex justify-end">
              <button
                onClick={handleAddDiscount}
                disabled={saving || !newDiscount.name || !newDiscount.value}
                className="px-6 py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                {saving ? (tc('saving') || 'Saving...') : (t('form.addButton') || 'Add Discount')}
              </button>
            </div>
          </div>
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
            <li>• <strong>{t('examples.promo') || 'Launch Promo'}:</strong> £5 {t('examples.promoDesc') || 'off orders over £30'}</li>
            <li>• <strong>{t('examples.senior') || 'Senior Discount'}:</strong> 10% {t('examples.seniorDesc') || 'for customers 65+'}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
