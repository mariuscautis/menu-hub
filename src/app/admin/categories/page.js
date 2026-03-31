'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const DEFAULT_CATEGORIES = [
  { value: 'restaurant',    label: 'Restaurant / Café / Bar' },
  { value: 'beauty',        label: 'Beauty & Wellness' },
  { value: 'fitness',       label: 'Fitness & Sport' },
  { value: 'hotel',         label: 'Hotel & Accommodation' },
  { value: 'entertainment', label: 'Entertainment & Events' },
  { value: 'health',        label: 'Health & Medical' },
  { value: 'education',     label: 'Education & Tutoring' },
  { value: 'other',         label: 'Other' },
]

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [newCategoryLabel, setNewCategoryLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'industry_categories')
      .single()

    setCategories(data?.value ?? DEFAULT_CATEGORIES)
    setLoading(false)
  }

  const addCategory = () => {
    const label = newCategoryLabel.trim()
    if (!label) return
    const value = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    if (categories.some(c => c.value === value)) return
    setCategories(prev => [...prev, { value, label, hidden_from_registration: false }])
    setNewCategoryLabel('')
  }

  const toggleHidden = (value) => {
    setCategories(prev => prev.map(c =>
      c.value === value ? { ...c, hidden_from_registration: !c.hidden_from_registration } : c
    ))
  }

  const removeCategory = (value) => {
    setCategories(prev => prev.filter(c => c.value !== value))
  }

  const saveCategories = async () => {
    setSaving(true)
    setMessage(null)
    const { data: updated, error: updateError } = await supabase
      .from('platform_settings')
      .update({ value: categories })
      .eq('key', 'industry_categories')
      .select('key')

    let error = updateError
    if (!updateError && (!updated || updated.length === 0)) {
      const { error: insertError } = await supabase
        .from('platform_settings')
        .insert({ key: 'industry_categories', value: categories })
      error = insertError
    }

    setSaving(false)
    setMessage(error
      ? { type: 'error', text: 'Failed to save categories.' }
      : { type: 'success', text: 'Categories saved.' }
    )
    setTimeout(() => setMessage(null), 3000)
  }

  if (loading) return <div className="text-slate-500">Loading categories...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Industry Categories</h1>
          <p className="text-slate-500">Manage categories assigned to venues during registration and used to filter peer reviews.</p>
        </div>
        <button
          onClick={saveCategories}
          disabled={saving}
          className="px-5 py-2.5 bg-[#6262bd] text-white rounded-xl font-semibold text-sm hover:bg-[#5252a3] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border text-sm ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden">
        {categories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No categories yet. Add one below.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3 uppercase tracking-wide">Category</th>
                <th className="text-left text-xs font-semibold text-slate-500 px-6 py-3 uppercase tracking-wide">Slug</th>
                <th className="text-center text-xs font-semibold text-slate-500 px-6 py-3 uppercase tracking-wide">Hide from signup</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(cat => (
                <tr key={cat.value} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-800 text-sm">{cat.label}</span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{cat.value}</code>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={!!cat.hidden_from_registration}
                      onChange={() => toggleHidden(cat.value)}
                      className="w-4 h-4 accent-[#6262bd] cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => removeCategory(cat.value)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                      title="Remove category"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="border-t border-slate-100 px-6 py-4 flex gap-3">
          <input
            type="text"
            value={newCategoryLabel}
            onChange={e => setNewCategoryLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()}
            placeholder="e.g. Photography Studio"
            className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-[#6262bd]"
          />
          <button
            onClick={addCategory}
            disabled={!newCategoryLabel.trim()}
            className="px-5 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Category
          </button>
        </div>
      </div>
    </div>
  )
}
