'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
export default function ProductTaxSettings() {
  const [restaurant, setRestaurant] = useState(null)
  const [taxCategories, setTaxCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [newCategory, setNewCategory] = useState({ name: '', rate: '' })
  const [menuSalesTaxRate, setMenuSalesTaxRate] = useState('20')
  const [menuSalesTaxName, setMenuSalesTaxName] = useState('VAT')
  useEffect(() => {
    fetchData()
  }, [])
  const fetchData = async () => {
    try {
      setLoading(true)
      // Get current user and restaurant
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth/login'
        return
      }
      // Get restaurant owned by user
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (!restaurantData) {
        setMessage({ type: 'error', text: 'Restaurant not found or you do not have permission' })
        return
      }
      setRestaurant(restaurantData)
      setMenuSalesTaxRate(String(restaurantData.menu_sales_tax_rate || 20))
      setMenuSalesTaxName(restaurantData.menu_sales_tax_name || 'VAT')
      // Fetch tax categories
      await fetchTaxCategories(restaurantData.id)
    } catch (error) {
      console.error('Error fetching data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }
  const fetchTaxCategories = async (restaurantId) => {
    const { data, error } = await supabase
      .from('product_tax_categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('name')
    if (error) {
      console.error('Error fetching tax categories:', error)
      setMessage({ type: 'error', text: 'Failed to load tax categories' })
    } else {
      setTaxCategories(data || [])
    }
  }
  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      showMessage('error', 'Category name is required')
      return
    }
    const rate = parseFloat(newCategory.rate)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showMessage('error', 'Tax rate must be between 0 and 100')
      return
    }
    // Check for duplicate name
    if (taxCategories.some(cat => cat.name.toLowerCase() === newCategory.name.trim().toLowerCase())) {
      showMessage('error', 'A category with this name already exists')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('product_tax_categories')
        .insert({
          restaurant_id: restaurant.id,
          name: newCategory.name.trim(),
          rate: rate
        })
      if (error) throw error
      showMessage('success', 'Tax category added successfully')
      setNewCategory({ name: '', rate: '' })
      await fetchTaxCategories(restaurant.id)
    } catch (error) {
      console.error('Error adding category:', error)
      showMessage('error', 'Failed to add category')
    } finally {
      setSaving(false)
    }
  }
  const handleUpdateCategory = async (id, name, rate) => {
    const parsedRate = parseFloat(rate)
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      showMessage('error', 'Tax rate must be between 0 and 100')
      return
    }
    if (!name.trim()) {
      showMessage('error', 'Category name is required')
      return
    }
    // Check for duplicate name (excluding current category)
    if (taxCategories.some(cat => cat.id !== id && cat.name.toLowerCase() === name.trim().toLowerCase())) {
      showMessage('error', 'A category with this name already exists')
      return
    }
    setSaving(true)
    try {
      await supabase
        .from('product_tax_categories')
        .update({
          name: name.trim(),
          rate: parsedRate,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      showMessage('success', 'Tax category updated successfully')
      setEditingId(null)
      await fetchTaxCategories(restaurant.id)
    } catch (error) {
      console.error('Error updating category:', error)
      showMessage('error', 'Failed to update category')
    } finally {
      setSaving(false)
    }
  }
  const handleDeleteCategory = async (id, name) => {
    // Check if category is in use
    const { data: productsUsingCategory, error: checkError } = await supabase
      .from('stock_products')
      .select('id')
      .eq('tax_category_id', id)
      .limit(1)
    if (checkError) {
      console.error('Error checking category usage:', checkError)
      showMessage('error', 'Failed to check if category is in use')
      return
    }
    if (productsUsingCategory && productsUsingCategory.length > 0) {
      showMessage('error', `Cannot delete "${name}" - it is assigned to one or more products`)
      return
    }
    if (!confirm(`Are you sure you want to delete the tax category "${name}"?`)) {
      return
    }
    // Soft delete
    try {
      const { error } = await supabase
        .from('product_tax_categories')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      showMessage('success', 'Tax category deleted successfully')
      await fetchTaxCategories(restaurant.id)
    } catch (error) {
      console.error('Error deleting category:', error)
      showMessage('error', 'Failed to delete category')
    }
  }
  const handleSaveSalesTaxRate = async () => {
    const rate = parseFloat(menuSalesTaxRate)
    const taxName = menuSalesTaxName.trim()
    console.log('Attempting to save sales tax:', { rate, taxName })
    console.log('Restaurant ID:', restaurant.id)
    console.log('Restaurant owner_id:', restaurant.owner_id)
    if (isNaN(rate) || rate < 0 || rate > 100) {
      showMessage('error', 'Sales tax rate must be between 0 and 100')
      return
    }
    if (!taxName) {
      showMessage('error', 'Tax name is required')
      return
    }
    setSaving(true)
    try {
      // Get current user to verify
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user ID:', user?.id)
      console.log('Owner match:', user?.id === restaurant.owner_id)
      const { data, error, status, statusText } = await supabase
        .from('restaurants')
        .update({
          menu_sales_tax_rate: rate,
          menu_sales_tax_name: taxName
        })
        .eq('id', restaurant.id)
        .select()
      console.log('Update response:', { data, error, status, statusText })
      if (error) {
        console.error('Error updating sales tax:', error)
        showMessage('error', `Failed to update: ${error.message}`)
      } else if (!data || data.length === 0) {
        console.error('Update returned no rows - RLS might be blocking')
        showMessage('error', 'Update failed - no rows affected. Check permissions.')
      } else {
        console.log('Successfully updated:', data)
        showMessage('success', 'Sales tax updated successfully')
        // Update local restaurant state
        setRestaurant({
          ...restaurant,
          menu_sales_tax_rate: rate,
          menu_sales_tax_name: taxName
        })
        setMenuSalesTaxRate(String(rate))
        setMenuSalesTaxName(taxName)
      }
    } catch (err) {
      console.error('Exception during update:', err)
      showMessage('error', `Exception: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }
  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </div>
    )
  }
  if (!restaurant) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-red-500">Access denied - Restaurant owners only</div>
        </div>
      </div>
    )
  }
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Product Tax Categories</h1>
          <p className="text-sm text-slate-500 mt-2">
            Create tax categories for your stock products. Tax will be applied when purchasing products.
          </p>
        </div>
        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border-2 ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}
        {/* Info Box */}
        <div className="mb-6 bg-blue-50 border-2 border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-800 font-medium">How Product Tax Works</p>
              <p className="text-sm text-blue-700 mt-1">
                <strong>Menu Sales Tax:</strong> Configure a single tax (VAT, GST, etc.) that applies to all menu items using tax-inclusive pricing.
                <br />
                <strong>Stock Product Tax:</strong> Assign different tax categories to stock products for purchase taxes (e.g., import duties, excise tax).
              </p>
            </div>
          </div>
        </div>
        {/* Menu Sales Tax */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-2">Menu Sales Tax</h2>
          <p className="text-sm text-slate-500 mb-2">
            Configure the tax applied to menu items with <strong>tax-inclusive pricing</strong>
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Important:</strong> Your menu prices already include tax. Customers pay exactly what's shown on the menu.
              Invoices will show the breakdown (net amount + tax) for accounting purposes.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Example: Menu price £5.00 with 21% VAT → Customer pays £5.00 → Invoice shows: Net £4.13 + VAT £0.87 = Total £5.00
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax Name
              </label>
              <input
                type="text"
                value={menuSalesTaxName}
                onChange={(e) => setMenuSalesTaxName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                placeholder="VAT"
              />
              <p className="text-xs text-slate-500 mt-1">e.g., VAT, GST, Sales Tax</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tax Rate (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={menuSalesTaxRate}
                  onChange={(e) => setMenuSalesTaxRate(e.target.value)}
                  step="0.01"
                  min="0"
                  max="100"
                  className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] text-slate-700"
                  placeholder="20.00"
                />
                <span className="text-slate-600 font-medium text-lg">%</span>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSaveSalesTaxRate}
                disabled={saving}
                className="w-full px-6 py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Tax Settings'}
              </button>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-sm text-slate-600">
              <strong>Current Settings:</strong> {restaurant?.menu_sales_tax_name || 'VAT'} at {restaurant?.menu_sales_tax_rate || 20}%
              <span className="ml-2 text-slate-500">
                (This rate will be applied to all menu items on invoices)
              </span>
            </p>
          </div>
        </div>
        {/* Stock Product Tax Categories */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-700 mb-2">Stock Product Tax Categories</h2>
          <p className="text-sm text-slate-500 mb-4">
            Create tax categories for stock products (applied when purchasing ingredients)
          </p>
          {/* Existing Categories */}
          {taxCategories.length > 0 ? (
            <div className="space-y-3 mb-6">
              {taxCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  {editingId === category.id ? (
                    <>
                      <input
                        type="text"
                        defaultValue={category.name}
                        id={`name-${category.id}`}
                        className="flex-1 px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
                        placeholder="Category name"
                      />
                      <input
                        type="number"
                        defaultValue={category.rate}
                        id={`rate-${category.id}`}
                        step="0.01"
                        min="0"
                        max="100"
                        className="w-24 px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-[#6262bd]"
                        placeholder="Rate"
                      />
                      <span className="text-slate-600 font-medium">%</span>
                      <button
                        onClick={() => {
                          const name = document.getElementById(`name-${category.id}`).value
                          const rate = document.getElementById(`rate-${category.id}`).value
                          handleUpdateCategory(category.id, name, rate)
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a3] disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{category.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#6262bd]">{category.rate}%</p>
                      </div>
                      <button
                        onClick={() => setEditingId(category.id)}
                        className="px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 mb-6">
              No tax categories yet. Add one below to get started.
            </div>
          )}
          {/* Add New Category */}
          <div className="border-t-2 border-slate-100 dark:border-slate-800 pt-6">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Add New Tax Category</h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="flex-1 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="e.g., Base Products, Alcohol, Sugary Products"
              />
              <input
                type="number"
                value={newCategory.rate}
                onChange={(e) => setNewCategory({ ...newCategory, rate: e.target.value })}
                step="0.01"
                min="0"
                max="100"
                className="w-32 px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="10.00"
              />
              <span className="text-slate-600 dark:text-slate-400 font-medium">%</span>
              <button
                onClick={handleAddCategory}
                disabled={saving || !newCategory.name || !newCategory.rate}
                className="px-6 py-3 bg-[#6262bd] text-white rounded-xl font-semibold hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Adding...' : 'Add Category'}
              </button>
            </div>
          </div>
        </div>
        {/* Examples */}
        <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Example Tax Categories</h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• <strong>Base Products:</strong> 10% (bread, vegetables, basic ingredients)</li>
            <li>• <strong>Sugary Products:</strong> 17% (desserts, sodas, candy)</li>
            <li>• <strong>Alcohol:</strong> 21% (wine, beer, spirits)</li>
            <li>• <strong>Luxury Items:</strong> 25% (premium ingredients, specialty items)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
