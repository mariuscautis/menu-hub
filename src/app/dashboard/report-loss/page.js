'use client'

import { useState, useEffect } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import InfoTooltip from '@/components/InfoTooltip'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'
import { useModuleGuard } from '@/hooks/useModuleGuard'
import OfflinePageGuard from '@/components/OfflinePageGuard'

export default function ReportLoss() {
  useModuleGuard('ordering')
  const t = useTranslations('reportLoss')
  const tg = useTranslations('guide')
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [stockProducts, setStockProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [staffDepartment, setStaffDepartment] = useState(null)

  // Tab: null | 'menu' | 'stock'
  const [lossType, setLossType] = useState(null)

  // Menu item combo box
  const [showMenuDropdown, setShowMenuDropdown] = useState(false)
  const [menuItemSearch, setMenuItemSearch] = useState('')
  const [menuForm, setMenuForm] = useState({ menu_item_id: '', quantity: 1, reason: '', notes: '' })

  // Stock item combo box
  const [showStockDropdown, setShowStockDropdown] = useState(false)
  const [stockSearch, setStockSearch] = useState('')
  const [stockForm, setStockForm] = useState({ stock_product_id: '', quantity: '', reason: '', notes: '' })

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

  useEffect(() => { fetchData() }, [restaurantCtx])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenuDropdown && !event.target.closest('.menu-dropdown-container')) setShowMenuDropdown(false)
      if (showStockDropdown && !event.target.closest('.stock-dropdown-container')) setShowStockDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenuDropdown, showStockDropdown])

  const fetchData = async () => {
    if (!restaurantCtx?.restaurant) return
    const restaurantData = restaurantCtx.restaurant
    const department = restaurantCtx.staffDepartment

    let userEmail = null, userName = 'Unknown', staffId = null
    const staffSessionData = localStorage.getItem('staff_session')
    if (staffSessionData) {
      try {
        const s = JSON.parse(staffSessionData)
        userEmail = s.email; userName = s.name; staffId = s.id
      } catch { localStorage.removeItem('staff_session') }
    }

    setRestaurant(restaurantData)
    setUserInfo({ email: userEmail, name: userName, id: staffId })
    setStaffDepartment(department)

    // Fetch menu items
    try {
      const params = new URLSearchParams({ restaurantId: restaurantData.id })
      if (department && department !== 'universal') params.append('department', department)
      const res = await fetch(`/api/menu-items?${params}`)
      const result = await res.json()
      setMenuItems(result.success ? (result.data || []) : [])
    } catch { setMenuItems([]) }

    // Fetch stock products
    try {
      const res = await fetch(`/api/stock/products?restaurantId=${restaurantData.id}`)
      const result = await res.json()
      setStockProducts(result.products || [])
    } catch { setStockProducts([]) }

    setLoading(false)
  }

  const handleMenuSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const selectedItem = menuItems.find(item => item.id === menuForm.menu_item_id)
      if (!selectedItem) { setMessage({ type: 'error', text: t('selectMenuItem') }); setSubmitting(false); return }
      const hasRecipe = selectedItem.menu_item_ingredients && selectedItem.menu_item_ingredients.length > 0
      const response = await fetch('/api/stock/log-loss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          menuItemId: menuForm.menu_item_id,
          quantity: parseInt(menuForm.quantity),
          reason: menuForm.reason,
          staffName: userInfo.name,
          staffEmail: userInfo.email,
          staffId: userInfo.id,
          notes: menuForm.notes || null
        })
      })
      const result = await response.json()
      if (result.success) {
        const successText = hasRecipe
          ? t('successWithRecipe').replace('{quantity}', menuForm.quantity).replace('{itemName}', selectedItem.name)
          : t('successWithoutRecipe').replace('{quantity}', menuForm.quantity).replace('{itemName}', selectedItem.name)
        setMessage({ type: 'success', text: successText })
        setMenuForm({ menu_item_id: '', quantity: 1, reason: '', notes: '' })
        setMenuItemSearch('')
      } else {
        setMessage({ type: 'error', text: result.error || t('errorGeneric') })
      }
    } catch { setMessage({ type: 'error', text: t('errorOccurred') }) }
    setSubmitting(false)
  }

  const handleStockSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const product = stockProducts.find(p => p.id === stockForm.stock_product_id)
      if (!product) { setMessage({ type: 'error', text: t('selectStockItem') }); setSubmitting(false); return }
      const qty = parseFloat(stockForm.quantity)
      if (isNaN(qty) || qty <= 0) { setMessage({ type: 'error', text: t('invalidQuantity') }); setSubmitting(false); return }

      const baseQtyToDeduct = qty * (product.units_to_base_multiplier || 1)
      const newStock = Math.max(0, (product.current_stock || 0) - baseQtyToDeduct)

      // Record in stock_product_losses (not stock_entries, to avoid purchase triggers)
      const { error: lossError } = await supabase.from('stock_product_losses').insert({
        restaurant_id: restaurant.id,
        product_id: product.id,
        quantity: qty,
        unit_used: product.input_unit_type,
        reason: stockForm.reason,
        notes: stockForm.notes || null,
        added_by_email: userInfo.email || 'unknown'
      })

      if (lossError) { setMessage({ type: 'error', text: lossError.message || t('errorGeneric') }); setSubmitting(false); return }

      // Deduct from current_stock only — cost_per_base_unit is untouched
      const { error } = await supabase.from('stock_products').update({
        current_stock: newStock
      }).eq('id', product.id)

      if (error) { setMessage({ type: 'error', text: error.message || t('errorGeneric') }); setSubmitting(false); return }

      setMessage({ type: 'success', text: t('stockLossSuccess').replace('{quantity}', qty).replace('{unit}', product.input_unit_type).replace('{name}', product.name) })
      setStockForm({ stock_product_id: '', quantity: '', reason: '', notes: '' })
      setStockSearch('')
      // Refresh stock product data
      fetchData()
    } catch { setMessage({ type: 'error', text: t('errorOccurred') }) }
    setSubmitting(false)
  }

  const selectedStock = stockProducts.find(p => p.id === stockForm.stock_product_id)

  if (loading) return <div className="text-zinc-500 dark:text-zinc-400">{t('loading')}</div>
  if (!restaurant) return <div className="text-red-600">{t('noRestaurant')}</div>

  return (
    <OfflinePageGuard>
    <div className="max-w-lg mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200 flex items-center justify-center gap-2">
          {t('title')}
          <InfoTooltip text={tg('report_loss_desc')} />
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">{t('subtitle')}</p>
        {staffDepartment && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mt-1">
            {t('department')}: <span className={`font-semibold ${
              staffDepartment === 'bar' ? 'text-orange-600' :
              staffDepartment === 'kitchen' ? 'text-green-600' : 'text-[#6262bd]'
            }`}>
              {staffDepartment === 'bar' ? `🍸 ${t('bar')}` :
               staffDepartment === 'kitchen' ? `🍳 ${t('kitchen')}` : `🌐 ${t('universal')}`}
            </span>
          </p>
        )}
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-sm border-2 ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Type selector tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => { setLossType('menu'); setMessage(null) }}
          className={`group flex flex-col items-center text-center gap-3 rounded-sm border-2 p-5 transition-all ${
            lossType === 'menu'
              ? 'bg-[#6262bd] border-[#6262bd] text-white shadow-lg shadow-[#6262bd]/20'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-md'
          }`}
        >
          <div className={`p-3 rounded-sm transition-transform group-hover:scale-110 ${lossType === 'menu' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
            <svg className={`w-7 h-7 ${lossType === 'menu' ? 'text-white' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div>
            <p className={`font-semibold text-sm ${lossType === 'menu' ? 'text-white' : 'text-zinc-800 dark:text-zinc-200 dark:text-zinc-200'}`}>{t('menuItemLossTitle')}</p>
            <p className={`text-xs mt-0.5 ${lossType === 'menu' ? 'text-white/75' : 'text-zinc-500 dark:text-zinc-400 dark:text-zinc-400'}`}>{t('menuItemLossDesc')}</p>
          </div>
        </button>

        <button
          onClick={() => { setLossType('stock'); setMessage(null) }}
          className={`group flex flex-col items-center text-center gap-3 rounded-sm border-2 p-5 transition-all ${
            lossType === 'stock'
              ? 'bg-[#6262bd] border-[#6262bd] text-white shadow-lg shadow-[#6262bd]/20'
              : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-[#6262bd] dark:hover:border-[#6262bd] hover:shadow-md'
          }`}
        >
          <div className={`p-3 rounded-sm transition-transform group-hover:scale-110 ${lossType === 'stock' ? 'bg-white/20' : 'bg-red-50 dark:bg-red-900/30'}`}>
            <svg className={`w-7 h-7 ${lossType === 'stock' ? 'text-white' : 'text-red-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className={`font-semibold text-sm ${lossType === 'stock' ? 'text-white' : 'text-zinc-800 dark:text-zinc-200 dark:text-zinc-200'}`}>{t('stockItemLossTitle')}</p>
            <p className={`text-xs mt-0.5 ${lossType === 'stock' ? 'text-white/75' : 'text-zinc-500 dark:text-zinc-400 dark:text-zinc-400'}`}>{t('stockItemLossDesc')}</p>
          </div>
        </button>
      </div>

      {lossType && <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-6">

        {/* ── MENU ITEM LOSS ── */}
        {lossType === 'menu' && (
          <form onSubmit={handleMenuSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">
                {t('menuItemLabel')} {t('menuItemRequired')}
              </label>
              <div className="relative menu-dropdown-container">
                <input
                  type="text"
                  value={showMenuDropdown
                    ? menuItemSearch
                    : (menuForm.menu_item_id
                        ? (() => {
                            const s = menuItems.find(i => i.id === menuForm.menu_item_id)
                            return s ? `${s.name} ${s.department === 'bar' ? '🍸' : '🍳'}` : ''
                          })()
                        : '')
                  }
                  onChange={(e) => { setMenuItemSearch(e.target.value); setShowMenuDropdown(true); if (menuForm.menu_item_id) setMenuForm({ ...menuForm, menu_item_id: '' }) }}
                  onFocus={() => setMenuItemSearch('')}
                  placeholder={t('menuItemPlaceholder')}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800"
                  required
                />
                {showMenuDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const filtered = menuItems.filter(i => !menuItemSearch || i.name.toLowerCase().includes(menuItemSearch.toLowerCase()))
                      return filtered.length > 0 ? filtered.map(item => {
                        const hasRecipe = item.menu_item_ingredients && item.menu_item_ingredients.length > 0
                        return (
                          <div key={item.id} onClick={() => { setMenuForm({ ...menuForm, menu_item_id: item.id }); setShowMenuDropdown(false); setMenuItemSearch('') }}
                            className="px-4 py-2 hover:bg-[#6262bd] hover:text-white cursor-pointer transition-colors flex justify-between items-center">
                            <span>{item.name} {item.department === 'bar' ? '🍸' : '🍳'}</span>
                            {!hasRecipe && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">{t('noRecipeBadge')}</span>}
                          </div>
                        )
                      }) : <div className="px-4 py-2 text-zinc-400 dark:text-zinc-500 text-sm">{t('noItemsFound')}</div>
                    })()}
                  </div>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">{t('helpTextRecipe')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">
                {t('quantityLabel')} {t('quantityRequired')}
              </label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMenuForm({ ...menuForm, quantity: Math.max(1, menuForm.quantity - 1) })}
                  className="w-12 h-12 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 rounded-sm hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 font-bold text-xl">−</button>
                <input type="number" value={menuForm.quantity} onChange={e => setMenuForm({ ...menuForm, quantity: parseInt(e.target.value) || 1 })} min="1"
                  className="w-24 px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 text-center font-semibold" />
                <button type="button" onClick={() => setMenuForm({ ...menuForm, quantity: menuForm.quantity + 1 })}
                  className="w-12 h-12 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 rounded-sm hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-all text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 font-bold text-xl">+</button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">{t('quantityHelp')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">
                {t('reasonLabel')} {t('reasonRequired')}
              </label>
              <select value={menuForm.reason} onChange={e => setMenuForm({ ...menuForm, reason: e.target.value })} required
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800">
                <option value="">{t('reasonPlaceholder')}</option>
                {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">{t('notesLabel')}</label>
              <textarea value={menuForm.notes} onChange={e => setMenuForm({ ...menuForm, notes: e.target.value })} rows={3}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 resize-none"
                placeholder={t('notesPlaceholder')} />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full bg-red-600 text-white py-3 rounded-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {submitting ? t('submitting') : t('submitButton')}
            </button>
          </form>
        )}

        {/* ── STOCK ITEM LOSS ── */}
        {lossType === 'stock' && (
          <form onSubmit={handleStockSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">
                {t('stockItemLabel')} {t('menuItemRequired')}
              </label>
              <div className="relative stock-dropdown-container">
                <input
                  type="text"
                  value={showStockDropdown
                    ? stockSearch
                    : (selectedStock ? `${selectedStock.name}${selectedStock.brand ? ' — ' + selectedStock.brand : ''}` : '')
                  }
                  onChange={e => { setStockSearch(e.target.value); setShowStockDropdown(true); if (stockForm.stock_product_id) setStockForm({ ...stockForm, stock_product_id: '' }) }}
                  onFocus={() => setStockSearch('')}
                  placeholder={t('stockItemPlaceholder')}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800"
                  required
                />
                {showStockDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm shadow-lg max-h-60 overflow-y-auto">
                    {(() => {
                      const filtered = stockProducts.filter(p => !stockSearch || p.name.toLowerCase().includes(stockSearch.toLowerCase()) || (p.brand || '').toLowerCase().includes(stockSearch.toLowerCase()))
                      return filtered.length > 0 ? filtered.map(p => (
                        <div key={p.id} onClick={() => { setStockForm({ ...stockForm, stock_product_id: p.id, quantity: '' }); setShowStockDropdown(false); setStockSearch('') }}
                          className="px-4 py-2 hover:bg-[#6262bd] hover:text-white cursor-pointer transition-colors flex justify-between items-center">
                          <span>{p.name}{p.brand ? <span className="opacity-60"> — {p.brand}</span> : ''}</span>
                          <span className="text-xs opacity-70 ml-2">{p.category} · {p.input_unit_type}</span>
                        </div>
                      )) : <div className="px-4 py-2 text-zinc-400 dark:text-zinc-500 text-sm">{t('noStockItemsFound')}</div>
                    })()}
                  </div>
                )}
              </div>
              {selectedStock && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-1">
                  {t('currentStock')}: <strong>{(selectedStock.current_stock / (selectedStock.units_to_base_multiplier || 1)).toFixed(2)} {selectedStock.input_unit_type}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">
                {t('quantityToRemove')} {t('menuItemRequired')}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={stockForm.quantity}
                  onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })}
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0"
                  className="w-full px-4 py-3 pr-20 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800"
                />
                {selectedStock && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 font-medium text-sm">
                    {selectedStock.input_unit_type}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">
                {t('reasonLabel')} {t('reasonRequired')}
              </label>
              <select value={stockForm.reason} onChange={e => setStockForm({ ...stockForm, reason: e.target.value })} required
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800">
                <option value="">{t('reasonPlaceholder')}</option>
                {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">{t('notesLabel')}</label>
              <textarea value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} rows={3}
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 resize-none"
                placeholder={t('notesPlaceholder')} />
            </div>

            <button type="submit" disabled={submitting}
              className="w-full bg-red-600 text-white py-3 rounded-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {submitting ? t('submitting') : t('submitStockButton')}
            </button>
          </form>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-sm p-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">{t('infoTitle')}</h3>
              {lossType === 'menu' ? (
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>{t('infoBullet1')}</li>
                  <li>{t('infoBullet2')}</li>
                  <li>{t('infoBullet3')}</li>
                  <li>{t('infoBullet4')}</li>
                  <li>{t('infoBullet5')}</li>
                </ul>
              ) : (
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                  <li>{t('stockInfoBullet1')}</li>
                  <li>{t('stockInfoBullet2')}</li>
                  <li>{t('stockInfoBullet3')}</li>
                  <li>{t('infoBullet4')}</li>
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>}
    </div>
    </OfflinePageGuard>
  )
}

