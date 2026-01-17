'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'

export default function MenuCategories() {
  const t = useTranslations('menuCategories')
  const [categories, setCategories] = useState([])
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sort_order: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let restaurantData = null

    // Check if owner
    const { data: ownedRestaurant } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (ownedRestaurant) {
      restaurantData = ownedRestaurant
    } else {
      // Check if staff
      const { data: staffRecords } = await supabase
        .from('staff')
        .select('*, restaurants(*)')
        .or(`user_id.eq.${user.id},email.eq.${user.email}`)
        .eq('status', 'active')

      const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null

      if (staffRecord && staffRecord.restaurants) {
        restaurantData = staffRecord.restaurants
      }
    }

    if (!restaurantData) {
      setLoading(false)
      return
    }

    setRestaurant(restaurantData)

    // Fetch categories with menu item counts
    const { data: cats } = await supabase
      .from('menu_categories')
      .select(`
        *,
        menu_items(count)
      `)
      .eq('restaurant_id', restaurantData.id)
      .order('sort_order')

    setCategories(cats || [])
    setLoading(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        description: category.description || '',
        sort_order: category.sort_order || 0
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        description: '',
        sort_order: categories.length
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCategory(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const categoryData = {
      restaurant_id: restaurant.id,
      name: formData.name,
      description: formData.description || null,
      sort_order: parseInt(formData.sort_order) || 0
    }

    if (editingCategory) {
      await supabase
        .from('menu_categories')
        .update(categoryData)
        .eq('id', editingCategory.id)
    } else {
      await supabase
        .from('menu_categories')
        .insert(categoryData)
    }

    fetchData()
    closeModal()
  }

  const deleteCategory = async (id) => {
    // Check if category has menu items
    const category = categories.find(c => c.id === id)
    const itemCount = category?.menu_items?.[0]?.count || 0

    if (itemCount > 0) {
      if (!confirm(t('confirmDeleteWithItems').replace('{count}', itemCount))) {
        return
      }
    } else {
      if (!confirm(t('confirmDelete'))) {
        return
      }
    }

    await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id)

    fetchData()
  }

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400">{t('loading')}</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('title')}</h1>
          <p className="text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3] flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          {t('addCategory')}
        </button>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mb-4">{t('noCategories')}</p>
          <button
            onClick={() => openModal()}
            className="text-[#6262bd] font-medium hover:underline"
          >
            {t('createFirst')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {categories.map((category) => {
            const itemCount = category.menu_items?.[0]?.count || 0
            return (
              <div
                key={category.id}
                className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        {category.name}
                      </h3>
                      <span className="px-2 py-1 bg-[#6262bd]/10 text-[#6262bd] text-xs rounded-full font-medium">
                        {itemCount} {itemCount === 1 ? t('item') : t('items')}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">{category.description}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t('sortOrder').replace('{order}', category.sort_order)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(category)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteCategory(category.id)}
                      className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">
              {editingCategory ? t('editCategory') : t('addNewCategory')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('categoryName')}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  placeholder={t('categoryNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('description')}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 resize-none"
                  placeholder={t('descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('sortOrderLabel')}
                </label>
                <input
                  type="number"
                  name="sort_order"
                  value={formData.sort_order}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  placeholder={t('sortOrderPlaceholder')}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('sortOrderHint')}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                >
                  {editingCategory ? t('saveChanges') : t('addCategoryButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
