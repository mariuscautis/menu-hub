'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function ReportLoss() {
  const t = useTranslations('reportLoss')
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [staffDepartment, setStaffDepartment] = useState(null)
  // Combo box states
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [menuItemSearch, setMenuItemSearch] = useState('')
  const [formData, setFormData] = useState({
    menu_item_id: '',
    quantity: 1,
    reason: '',
    notes: ''
  })
  const reasons = [
    { value: 'expired', label: t('reasonExpired') },
    { value: 'spoiled', label: t('reasonSpoiled') },
    { value: 'cross_contamination', label: t('reasonCrossContamination') },
    { value: 'damaged_delivery', label: t('reasonDamagedDelivery') },
    { value: 'burned_overcooked', label: t('reasonBurnedOvercooked') },
    { value: 'dropped_fallen', label: t('reasonDroppedFallen') },
    { value: 'quality_failure', label: t('reasonQualityFailure') },
    { value: 'customer_complaint', label: t('reasonCustomerComplaint') }
  ]
  useEffect(() => {
    fetchData()
  }, [])
  // Click outside to close menu item dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenuDropdown && !event.target.closest('.menu-dropdown-container')) {
        setShowMenuDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenuDropdown])
  const fetchData = async () => {
    let restaurantData = null
    let userEmail = null
    let userName = 'Unknown'
    let staffId = null
    let department = null
    // Check for staff session FIRST (PIN-based authentication)
    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData)
        const { data: freshRestaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', staffSession.restaurant_id)
          .single()
        restaurantData = freshRestaurant
        userEmail = staffSession.email
        userName = staffSession.name
        staffId = staffSession.id
        department = staffSession.department
      } catch (err) {
        localStorage.removeItem('staff_session')
      }
    }
    // If no staff session, check for regular Supabase auth user
    if (!restaurantData) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userEmail = user.email
        const { data: ownedRestaurant } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (ownedRestaurant) {
          restaurantData = ownedRestaurant
          userName = user.email.split('@')[0]
        } else {
          const { data: staffRecords } = await supabase
            .from('staff')
            .select('*, restaurants(*)')
            .or(`user_id.eq.${user.id},email.eq.${user.email}`)
            .eq('status', 'active')
          const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null
          if (staffRecord?.restaurants) {
            restaurantData = staffRecord.restaurants
            userName = staffRecord.name
            userEmail = staffRecord.email
            staffId = staffRecord.id
            department = staffRecord.department
          }
        }
      }
    }
    if (restaurantData) {
      setRestaurant(restaurantData)
      setUserInfo({ email: userEmail, name: userName, id: staffId })
      setStaffDepartment(department)
      // Fetch menu items with recipes via API (using admin client)
      try {
        const params = new URLSearchParams({
          restaurantId: restaurantData.id
        })
        // Add department filter if staff has specific department
        if (department && department !== 'universal') {
          params.append('department', department)
        }
        const response = await fetch(`/api/menu-items?${params}`)
        const result = await response.json()
        if (result.success) {
          setMenuItems(result.data || [])
        } else {
          console.error('Error fetching menu items:', result.error)
          setMenuItems([])
        }
      } catch (error) {
        console.error('Error fetching menu items:', error)
        setMenuItems([])
      }
    }
    setLoading(false)
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const selectedItem = menuItems.find(item => item.id === formData.menu_item_id)
      if (!selectedItem) {
        setMessage({ type: 'error', text: t('selectMenuItem') })
        setSubmitting(false)
        return
      }
      const hasRecipe = selectedItem.menu_item_ingredients && selectedItem.menu_item_ingredients.length > 0
      const response = await fetch('/api/stock/log-loss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          menuItemId: formData.menu_item_id,
          quantity: parseInt(formData.quantity),
          reason: formData.reason,
          staffName: userInfo.name,
          staffEmail: userInfo.email,
          staffId: userInfo.id,
          notes: formData.notes || null
        })
      })
      const result = await response.json()
      if (result.success) {
        const successText = hasRecipe
          ? t('successWithRecipe').replace('{quantity}', formData.quantity).replace('{itemName}', selectedItem.name)
          : t('successWithoutRecipe').replace('{quantity}', formData.quantity).replace('{itemName}', selectedItem.name)
        setMessage({
          type: 'success',
          text: successText
        })
        // Reset form
        setFormData({
          menu_item_id: '',
          quantity: 1,
          reason: '',
          notes: ''
        })
      } else {
        setMessage({ type: 'error', text: result.error || t('errorGeneric') })
      }
    } catch (error) {
      console.error('Error submitting loss:', error)
      setMessage({ type: 'error', text: t('errorOccurred') })
    }
    setSubmitting(false)
  }
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }
  if (loading) {
    return <div className="text-slate-500">{t('loading')}</div>
  }
  if (!restaurant) {
    return <div className="text-red-600">{t('noRestaurant')}</div>
  }
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
        <p className="text-slate-500">{t('subtitle')}</p>
        {staffDepartment && (
          <p className="text-sm text-slate-600 mt-1">
            {t('department')}: <span className={`font-semibold ${
              staffDepartment === 'bar' ? 'text-orange-600' :
              staffDepartment === 'kitchen' ? 'text-green-600' :
              'text-[#6262bd]'
            }`}>
              {staffDepartment === 'bar' ? `🍸 ${t('bar')}` :
               staffDepartment === 'kitchen' ? `🍳 ${t('kitchen')}` :
               `🌐 ${t('universal')}`}
            </span>
          </p>
        )}
      </div>
      {message && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Menu Item Selection - Searchable Combo Box */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('menuItemLabel')} {t('menuItemRequired')}
            </label>
            <div className="relative menu-dropdown-container">
              {/* Combo Bar Input */}
              <input
                type="text"
                value={showMenuDropdown
                  ? menuItemSearch
                  : (formData.menu_item_id
                      ? (() => {
                          const selectedItem = menuItems.find(item => item.id === formData.menu_item_id)
                          return selectedItem
                            ? `${selectedItem.name} ${selectedItem.department === 'bar' ? '🍸' : '🍳'}`
                            : ''
                        })()
                      : ''
                    )
                }
                onChange={(e) => {
                  setMenuItemSearch(e.target.value)
                  setShowMenuDropdown(true)
                  // Clear selection when typing
                  if (formData.menu_item_id) {
                    setFormData({ ...formData, menu_item_id: '' })
                  }
                }}
                onFocus={() => {
                  setMenuItemSearch('')
                }}
                placeholder={t('menuItemPlaceholder')}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                required
              />
              {/* Dropdown List */}
              {showMenuDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {(() => {
                    const filteredItems = menuItems.filter(item => {
                      if (!menuItemSearch) return true
                      const query = menuItemSearch.toLowerCase()
                      return item.name.toLowerCase().includes(query)
                    })
                    return filteredItems.length > 0 ? (
                      filteredItems.map((item) => {
                        const hasRecipe = item.menu_item_ingredients && item.menu_item_ingredients.length > 0
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setFormData({ ...formData, menu_item_id: item.id })
                              setShowMenuDropdown(false)
                              setMenuItemSearch('')
                            }}
                            className="px-4 py-2 hover:bg-[#6262bd] hover:text-white cursor-pointer transition-colors flex justify-between items-center"
                          >
                            <span>
                              {item.name} {item.department === 'bar' ? '🍸' : '🍳'}
                            </span>
                            {!hasRecipe && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                                {t('noRecipeBadge')}
                              </span>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-4 py-2 text-slate-400 text-sm">
                        {t('noItemsFound')}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t('helpTextRecipe')}
            </p>
          </div>
          {/* Quantity with +/- Buttons */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('quantityLabel')} {t('quantityRequired')}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: Math.max(1, formData.quantity - 1) })}
                className="w-12 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-slate-700 font-bold text-xl"
              >
                −
              </button>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                min="1"
                className="w-24 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 text-center font-semibold"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, quantity: formData.quantity + 1 })}
                className="w-12 h-12 flex items-center justify-center border-2 border-slate-200 rounded-xl hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-slate-700 font-bold text-xl"
              >
                +
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t('quantityHelp')}
            </p>
          </div>
          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('reasonLabel')} {t('reasonRequired')}
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
            >
              <option value="">{t('reasonPlaceholder')}</option>
              {reasons.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {t('notesLabel')}
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700 resize-none"
              placeholder={t('notesPlaceholder')}
            />
          </div>
          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? t('submitting') : t('submitButton')}
          </button>
        </form>
        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-100 rounded-2xl p-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 mb-2">{t('infoTitle')}</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>{t('infoBullet1')}</li>
              <li>{t('infoBullet2')}</li>
              <li>{t('infoBullet3')}</li>
              <li>{t('infoBullet4')}</li>
              <li>{t('infoBullet5')}</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-blue-900 font-medium">{t('tipTitle')}</p>
              <p className="text-xs text-blue-800 mt-1">
                {t('tipText')}
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
