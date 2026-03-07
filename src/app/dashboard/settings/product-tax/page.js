'use client'

import { useState, useEffect } from 'react'
import { useRestaurant } from '@/lib/RestaurantContext'
import { useTranslations } from '@/lib/i18n/LanguageContext'
import { useCurrency } from '@/lib/CurrencyContext'
import { useAdminSupabase } from '@/hooks/useAdminSupabase'

export default function ProductTaxSettings() {
  const t = useTranslations('productTax')
  const tc = useTranslations('common')
  const { currencySymbol } = useCurrency()
  const restaurantCtx = useRestaurant()
  const supabase = useAdminSupabase()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [activeTab, setActiveTab] = useState('menu') // 'menu' | 'stock'

  // Menu sales tax categories
  const [menuSalesTaxCategories, setMenuSalesTaxCategories] = useState([])
  const [editingMenuTaxId, setEditingMenuTaxId] = useState(null)
  const [newMenuTaxCategory, setNewMenuTaxCategory] = useState({ name: '', rate: '', is_default: false })

  // Stock purchase tax categories
  const [taxCategories, setTaxCategories] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [newCategory, setNewCategory] = useState({ name: '', rate: '' })

  useEffect(() => {
    if (!restaurantCtx?.restaurant) return
    const r = restaurantCtx.restaurant
    setRestaurant(r)
    fetchMenuSalesTaxCategories(r.id)
    fetchTaxCategories(r.id)
    setLoading(false)
  }, [restaurantCtx])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // ── Menu sales tax ──────────────────────────────────────────────────────────
  const fetchMenuSalesTaxCategories = async (restaurantId) => {
    const { data, error } = await supabase
      .from('menu_sales_tax_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name')
    if (!error) setMenuSalesTaxCategories(data || [])
  }

  const handleAddMenuTaxCategory = async () => {
    if (!newMenuTaxCategory.name.trim()) {
      showMessage('error', 'Category name is required')
      return
    }
    const rate = parseFloat(newMenuTaxCategory.rate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showMessage('error', 'Tax rate must be between 0 and 100')
      return
    }
    if (menuSalesTaxCategories.some(c => c.name.toLowerCase() === newMenuTaxCategory.name.trim().toLowerCase())) {
      showMessage('error', 'A category with this name already exists')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('menu_sales_tax_categories')
        .insert({ restaurant_id: restaurant.id, name: newMenuTaxCategory.name.trim(), rate, is_default: newMenuTaxCategory.is_default })
      if (error) throw error
      showMessage('success', 'Tax category added successfully')
      setNewMenuTaxCategory({ name: '', rate: '', is_default: false })
      await fetchMenuSalesTaxCategories(restaurant.id)
    } catch {
      showMessage('error', 'Failed to add category')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateMenuTaxCategory = async (id, name, rate, is_default) => {
    const parsedRate = parseFloat(rate)
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      showMessage('error', 'Tax rate must be between 0 and 100')
      return
    }
    if (!name.trim()) { showMessage('error', 'Category name is required'); return }
    if (menuSalesTaxCategories.some(c => c.id !== id && c.name.toLowerCase() === name.trim().toLowerCase())) {
      showMessage('error', 'A category with this name already exists')
      return
    }
    setSaving(true)
    try {
      await supabase
        .from('menu_sales_tax_categories')
        .update({ name: name.trim(), rate: parsedRate, is_default, updated_at: new Date().toISOString() })
        .eq('id', id)
      showMessage('success', 'Tax category updated successfully')
      setEditingMenuTaxId(null)
      await fetchMenuSalesTaxCategories(restaurant.id)
    } catch {
      showMessage('error', 'Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMenuTaxCategory = async (id, name) => {
    const { data: itemsUsing } = await supabase
      .from('menu_items').select('id').eq('sales_tax_category_id', id).limit(1)
    if (itemsUsing?.length > 0) {
      showMessage('error', `Cannot delete "${name}" — it is assigned to one or more menu items`)
      return
    }
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      await supabase
        .from('menu_sales_tax_categories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      showMessage('success', 'Tax category deleted successfully')
      await fetchMenuSalesTaxCategories(restaurant.id)
    } catch {
      showMessage('error', 'Failed to delete category')
    }
  }

  // ── Stock purchase tax ──────────────────────────────────────────────────────
  const fetchTaxCategories = async (restaurantId) => {
    const { data, error } = await supabase
      .from('product_tax_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name')
    if (error) {
      showMessage('error', 'Failed to load tax categories')
    } else {
      setTaxCategories(data || [])
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) { showMessage('error', 'Category name is required'); return }
    const rate = parseFloat(newCategory.rate)
    if (isNaN(rate) || rate < 0 || rate > 100) { showMessage('error', 'Tax rate must be between 0 and 100'); return }
    if (taxCategories.some(c => c.name.toLowerCase() === newCategory.name.trim().toLowerCase())) {
      showMessage('error', 'A category with this name already exists')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('product_tax_categories')
        .insert({ restaurant_id: restaurant.id, name: newCategory.name.trim(), rate })
      if (error) throw error
      showMessage('success', 'Tax category added successfully')
      setNewCategory({ name: '', rate: '' })
      await fetchTaxCategories(restaurant.id)
    } catch {
      showMessage('error', 'Failed to add category')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateCategory = async (id, name, rate) => {
    const parsedRate = parseFloat(rate)
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) { showMessage('error', 'Tax rate must be between 0 and 100'); return }
    if (!name.trim()) { showMessage('error', 'Category name is required'); return }
    if (taxCategories.some(c => c.id !== id && c.name.toLowerCase() === name.trim().toLowerCase())) {
      showMessage('error', 'A category with this name already exists')
      return
    }
    setSaving(true)
    try {
      await supabase
        .from('product_tax_categories')
        .update({ name: name.trim(), rate: parsedRate, updated_at: new Date().toISOString() })
        .eq('id', id)
      showMessage('success', 'Tax category updated successfully')
      setEditingId(null)
      await fetchTaxCategories(restaurant.id)
    } catch {
      showMessage('error', 'Failed to update category')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCategory = async (id, name) => {
    const { data: inUse, error: checkError } = await supabase
      .from('stock_products').select('id').eq('tax_category_id', id).limit(1)
    if (checkError) { showMessage('error', 'Failed to check if category is in use'); return }
    if (inUse?.length > 0) {
      showMessage('error', `Cannot delete "${name}" — it is assigned to one or more products`)
      return
    }
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      const { error } = await supabase
        .from('product_tax_categories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      showMessage('success', 'Tax category deleted successfully')
      await fetchTaxCategories(restaurant.id)
    } catch {
      showMessage('error', 'Failed to delete category')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center text-slate-500 dark:text-slate-400">
          {tc('loading') || 'Loading...'}
        </div>
      </div>
    )
  }
  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto text-center text-red-500">
          {t('accessDenied') || 'Access denied - Restaurant owners only'}
        </div>
      </div>
    )
  }

  const tabs = [
    {
      id: 'menu',
      label: t('menuSalesTax') || 'Menu Sales Tax',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
      ),
      badge: menuSalesTaxCategories.length
    },
    {
      id: 'stock',
      label: t('stockProductTax') || 'Stock Purchase Tax',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4v2l8 5 8-5V4zm0 4.236l-8 5-8-5V20h16V8.236z"/>
        </svg>
      ),
      badge: taxCategories.length
    }
  ]

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('title') || 'Tax Categories'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('pageSubtitle') || 'Manage tax rates applied to your sales and stock purchases.'}
          </p>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
              : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-[#6262bd] shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                  activeTab === tab.id
                    ? 'bg-[#6262bd]/10 text-[#6262bd]'
                    : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: Menu Sales Tax ─────────────────────────────────────────────── */}
        {activeTab === 'menu' && (
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6">
            {/* Explanation */}
            <div className="flex items-start gap-3 mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl">
              <svg className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-1">
                  {t('menuSalesTax') || 'Menu Sales Tax'} — {t('whatIsThis') || 'What is this?'}
                </p>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  {t('menuSalesTaxFullDesc') || 'These are the tax rates applied to items when they are sold to customers. Each menu item can be assigned its own tax bracket (e.g. Beer at 21%, Soft Drinks at 17%, Food at 9%). Tax-inclusive pricing means customers pay the shown price — invoices then show the net + tax breakdown for accounting.'}
                </p>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2">
                  {t('example') || `Example: ${currencySymbol}5.00 menu price with 21% VAT → Customer pays ${currencySymbol}5.00 → Invoice: Net ${currencySymbol}4.13 + VAT ${currencySymbol}0.87`}
                </p>
              </div>
            </div>

            {/* Category list */}
            {menuSalesTaxCategories.length > 0 ? (
              <div className="space-y-3 mb-6">
                {menuSalesTaxCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                  >
                    {editingMenuTaxId === cat.id ? (
                      <>
                        <input
                          type="text"
                          defaultValue={cat.name}
                          id={`mst-name-${cat.id}`}
                          className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          placeholder="Category name"
                        />
                        <input
                          type="number"
                          defaultValue={cat.rate}
                          id={`mst-rate-${cat.id}`}
                          step="0.01" min="0" max="100"
                          className="w-24 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          placeholder="Rate"
                        />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
                        <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <input
                            type="checkbox"
                            defaultChecked={cat.is_default}
                            id={`mst-default-${cat.id}`}
                            className="w-4 h-4 rounded border-slate-300 text-[#6262bd]"
                          />
                          {t('setAsDefault') || 'Default'}
                        </label>
                        <button
                          onClick={() => {
                            const name = document.getElementById(`mst-name-${cat.id}`).value
                            const rate = document.getElementById(`mst-rate-${cat.id}`).value
                            const is_default = document.getElementById(`mst-default-${cat.id}`).checked
                            handleUpdateMenuTaxCategory(cat.id, name, rate, is_default)
                          }}
                          disabled={saving}
                          className="px-4 py-2 bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a3] disabled:opacity-50 text-sm"
                        >
                          {tc('save') || 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingMenuTaxId(null)}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 text-sm"
                        >
                          {tc('cancel') || 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{cat.name}</p>
                          {cat.is_default && (
                            <span className="text-xs text-[#6262bd] font-medium">{t('defaultCategory') || 'Default'}</span>
                          )}
                        </div>
                        <p className="text-lg font-bold text-[#6262bd]">{cat.rate}%</p>
                        <button
                          onClick={() => setEditingMenuTaxId(cat.id)}
                          className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
                        >
                          {tc('edit') || 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDeleteMenuTaxCategory(cat.id, cat.name)}
                          className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-600 text-red-700 dark:text-white rounded-lg hover:bg-red-200 dark:hover:bg-red-700"
                        >
                          {tc('delete') || 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 mb-6">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p className="text-sm">{t('noMenuTaxCategories') || 'No sales tax categories yet. Add one below.'}</p>
              </div>
            )}

            {/* Add new */}
            <div className="border-t-2 border-slate-100 dark:border-slate-700 pt-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {t('addNewMenuTaxCategory') || 'Add New Sales Tax Category'}
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  value={newMenuTaxCategory.name}
                  onChange={(e) => setNewMenuTaxCategory({ ...newMenuTaxCategory, name: e.target.value })}
                  className="flex-1 min-w-[160px] px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  placeholder={t('menuTaxCategoryPlaceholder') || 'e.g., Alcohol, Soft Drinks, Food'}
                />
                <input
                  type="number"
                  value={newMenuTaxCategory.rate}
                  onChange={(e) => setNewMenuTaxCategory({ ...newMenuTaxCategory, rate: e.target.value })}
                  step="0.01" min="0" max="100"
                  className="w-28 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  placeholder="21.00"
                />
                <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={newMenuTaxCategory.is_default}
                    onChange={(e) => setNewMenuTaxCategory({ ...newMenuTaxCategory, is_default: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-[#6262bd]"
                  />
                  {t('setAsDefault') || 'Set as default'}
                </label>
                <button
                  onClick={handleAddMenuTaxCategory}
                  disabled={saving || !newMenuTaxCategory.name || !newMenuTaxCategory.rate}
                  className="px-5 py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {saving ? (t('adding') || 'Adding...') : (t('addCategory') || 'Add Category')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Stock Purchase Tax ─────────────────────────────────────────── */}
        {activeTab === 'stock' && (
          <div className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-6">
            {/* Explanation */}
            <div className="flex items-start gap-3 mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
                  {t('stockProductTax') || 'Stock Purchase Tax'} — {t('whatIsThis') || 'What is this?'}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('stockProductTaxFullDesc') || 'These are the tax rates applied to stock items when you purchase them as ingredients or supplies. Each stock product can be assigned a different tax category (e.g. excise duty on alcohol, import tax on specialty items). This helps accurately track your purchasing costs.'}
                </p>
              </div>
            </div>

            {/* Category list */}
            {taxCategories.length > 0 ? (
              <div className="space-y-3 mb-6">
                {taxCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600"
                  >
                    {editingId === category.id ? (
                      <>
                        <input
                          type="text"
                          defaultValue={category.name}
                          id={`name-${category.id}`}
                          className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          placeholder="Category name"
                        />
                        <input
                          type="number"
                          defaultValue={category.rate}
                          id={`rate-${category.id}`}
                          step="0.01" min="0" max="100"
                          className="w-24 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                          placeholder="Rate"
                        />
                        <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
                        <button
                          onClick={() => {
                            const name = document.getElementById(`name-${category.id}`).value
                            const rate = document.getElementById(`rate-${category.id}`).value
                            handleUpdateCategory(category.id, name, rate)
                          }}
                          disabled={saving}
                          className="px-4 py-2 bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a3] disabled:opacity-50 text-sm"
                        >
                          {tc('save') || 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 text-sm"
                        >
                          {tc('cancel') || 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-medium text-slate-800 dark:text-slate-100">{category.name}</p>
                        </div>
                        <p className="text-lg font-bold text-[#6262bd]">{category.rate}%</p>
                        <button
                          onClick={() => setEditingId(category.id)}
                          className="px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-white rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500"
                        >
                          {tc('edit') || 'Edit'}
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-600 text-red-700 dark:text-white rounded-lg hover:bg-red-200 dark:hover:bg-red-700"
                        >
                          {tc('delete') || 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 mb-6">
                <svg className="w-10 h-10 mx-auto mb-2 opacity-40" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p className="text-sm">{t('noCategories') || 'No tax categories yet. Add one below to get started.'}</p>
              </div>
            )}

            {/* Add new */}
            <div className="border-t-2 border-slate-100 dark:border-slate-700 pt-5">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                {t('addNewCategory') || 'Add New Tax Category'}
              </h3>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="flex-1 min-w-[160px] px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  placeholder={t('categoryNamePlaceholder') || 'e.g., Base Products, Alcohol, Sugary Products'}
                />
                <input
                  type="number"
                  value={newCategory.rate}
                  onChange={(e) => setNewCategory({ ...newCategory, rate: e.target.value })}
                  step="0.01" min="0" max="100"
                  className="w-28 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                  placeholder="10.00"
                />
                <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
                <button
                  onClick={handleAddCategory}
                  disabled={saving || !newCategory.name || !newCategory.rate}
                  className="px-5 py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {saving ? (t('adding') || 'Adding...') : (t('addCategory') || 'Add Category')}
                </button>
              </div>
            </div>

            {/* Example hint */}
            <div className="mt-5 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t('exampleCategories') || 'Example categories'}:</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('exampleBase') || 'Base Products'} 10% · {t('exampleSugary') || 'Sugary Products'} 17% · {t('exampleAlcohol') || 'Alcohol'} 21% · {t('exampleLuxury') || 'Luxury Items'} 25%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
