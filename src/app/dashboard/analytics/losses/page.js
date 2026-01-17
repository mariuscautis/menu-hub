'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslations } from '@/lib/i18n/LanguageContext'
export default function LossesAnalytics() {
  const t = useTranslations('lossesAnalytics')
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lossesData, setLossesData] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [reasonFilter, setReasonFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  useEffect(() => {
    initData()
  }, [])
  useEffect(() => {
    if (restaurant) {
      fetchLosses()
    }
  }, [restaurant, startDate, endDate, departmentFilter, reasonFilter, staffFilter])
  const initData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let restaurantData = null
    // Check for staff session
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
      } catch (err) {
        localStorage.removeItem('staff_session')
      }
    }
    if (!restaurantData) {
      const { data: ownedRestaurant } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (ownedRestaurant) {
        restaurantData = ownedRestaurant
      } else {
        const { data: staffRecords } = await supabase
          .from('staff')
          .select('*, restaurants(*)')
          .or(`user_id.eq.${user.id},email.eq.${user.email}`)
          .eq('status', 'active')
        const staffRecord = staffRecords && staffRecords.length > 0 ? staffRecords[0] : null
        if (staffRecord?.restaurants) {
          restaurantData = staffRecord.restaurants
        }
      }
    }
    if (restaurantData) {
      setRestaurant(restaurantData)
      // Set default date range (last 30 days)
      const today = new Date()
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      setEndDate(today.toISOString().split('T')[0])
      setStartDate(thirtyDaysAgo.toISOString().split('T')[0])
    }
    setLoading(false)
  }
  const fetchLosses = async () => {
    if (!startDate || !endDate) return
    const params = new URLSearchParams({
      restaurantId: restaurant.id,
      startDate,
      endDate,
      department: departmentFilter,
      reason: reasonFilter,
      staffEmail: staffFilter
    })
    const response = await fetch(`/api/analytics/losses?${params}`)
    const result = await response.json()
    if (result.success) {
      setLossesData(result)
    }
  }
  const getReasonLabel = (reason) => {
    const labels = {
      expired: t('reasonExpired'),
      spoiled: t('reasonSpoiled'),
      cross_contamination: t('reasonCrossContamination'),
      damaged_delivery: t('reasonDamagedDelivery'),
      burned_overcooked: t('reasonBurnedOvercooked'),
      dropped_fallen: t('reasonDroppedFallen'),
      quality_failure: t('reasonQualityFailure'),
      customer_complaint: t('reasonCustomerComplaint')
    }
    return labels[reason] || reason
  }
  const getReasonColor = (reason) => {
    const colors = {
      expired: 'bg-yellow-100 text-yellow-700',
      spoiled: 'bg-red-100 text-red-700',
      cross_contamination: 'bg-orange-100 text-orange-700',
      damaged_delivery: 'bg-purple-100 text-purple-700',
      burned_overcooked: 'bg-amber-100 text-amber-700',
      dropped_fallen: 'bg-blue-100 text-blue-700',
      quality_failure: 'bg-pink-100 text-pink-700',
      customer_complaint: 'bg-indigo-100 text-indigo-700'
    }
    return colors[reason] || 'bg-slate-100 text-slate-700'
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
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('title')}</h1>
        <p className="text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
      </div>
      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">{t('filters')}</h2>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('startDate')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('endDate')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('department')}</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="all">{t('allDepartments')}</option>
              <option value="bar">{t('bar')}</option>
              <option value="kitchen">{t('kitchen')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('reason')}</label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="all">{t('allReasons')}</option>
              <option value="expired">{t('reasonExpired')}</option>
              <option value="spoiled">{t('reasonSpoiled')}</option>
              <option value="cross_contamination">{t('reasonCrossContamination')}</option>
              <option value="damaged_delivery">{t('reasonDamagedDelivery')}</option>
              <option value="burned_overcooked">{t('reasonBurnedOvercooked')}</option>
              <option value="dropped_fallen">{t('reasonDroppedFallen')}</option>
              <option value="quality_failure">{t('reasonQualityFailure')}</option>
              <option value="customer_complaint">{t('reasonCustomerComplaint')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('staffMember')}</label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="all">{t('allStaff')}</option>
              {lossesData && (() => {
                // Get unique staff members from all losses data
                const uniqueStaff = [...new Set(lossesData.data.map(loss =>
                  JSON.stringify({ name: loss.staff_name, email: loss.staff_email })
                ))].map(str => JSON.parse(str))
                return uniqueStaff.map((staff, index) => (
                  <option key={index} value={staff.email}>
                    {staff.name}
                  </option>
                ))
              })()}
            </select>
          </div>
        </div>
      </div>
      {lossesData && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('totalLossRecords')}</p>
              <p className="text-2xl font-bold text-[#6262bd]">{lossesData.summary.total_loss_records}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('totalItemsLost')}</p>
              <p className="text-2xl font-bold text-red-600">{lossesData.summary.total_items_lost}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('barLosses')}</p>
              <p className="text-2xl font-bold text-orange-600">
                {lossesData.summary.by_department?.bar?.items || 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('cost')}: £{lossesData.summary.by_department?.bar?.restaurant_cost?.toFixed(2) || '0.00'} •
                {t('revenue')}: £{lossesData.summary.by_department?.bar?.selling_cost?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('kitchenLosses')}</p>
              <p className="text-2xl font-bold text-green-600">
                {lossesData.summary.by_department?.kitchen?.items || 0}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('cost')}: £{lossesData.summary.by_department?.kitchen?.restaurant_cost?.toFixed(2) || '0.00'} •
                {t('revenue')}: £{lossesData.summary.by_department?.kitchen?.selling_cost?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
          {/* Top Loss Items */}
          {lossesData.summary.top_loss_items.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">{t('topLossItems')}</h2>
              <div className="space-y-2">
                {lossesData.summary.top_loss_items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-400">#{index + 1}</span>
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {item.count} {t('lossRecords').replace('{plural}', item.count > 1 ? 's' : '')} • {item.items} {t('items')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        item.department === 'bar'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {item.department === 'bar' ? `🍸 ${t('bar')}` : `🍳 ${t('kitchen')}`}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">£{item.selling_cost?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('lostRevenue')}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {t('cost')}: £{item.restaurant_cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Loss Records Table */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">{t('lossRecordsTable')}</h2>
            {lossesData.data.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>{t('noRecordsFound')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('dateTime')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('item')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('qty')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('restaurantCost')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('sellingCost')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('reason')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('dept')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('staff')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('notes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lossesData.data.map((loss) => (
                      <tr key={loss.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                          {new Date(loss.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{loss.menu_item_name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-red-600">{loss.quantity}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-amber-700 dark:text-amber-500">
                            £{loss.restaurant_cost?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-red-700 dark:text-red-500">
                            £{loss.selling_cost?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getReasonColor(loss.reason)}`}>
                            {getReasonLabel(loss.reason)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            loss.department === 'bar'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {loss.department === 'bar' ? '🍸' : '🍳'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-slate-700 dark:text-slate-300">{loss.staff_name}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {loss.notes ? (
                            <button
                              onClick={() => {
                                setSelectedNote({ item: loss.menu_item_name, note: loss.notes, date: loss.created_at })
                                setShowNotesModal(true)
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                              title={t('viewNote')}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                              </svg>
                            </button>
                          ) : (
                            <div className="inline-flex items-center justify-center w-8 h-8 text-slate-300" title={t('noNotes')}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                              </svg>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                      <td className="py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-200" colSpan="2">
                        {t('total')}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-red-600">
                          {lossesData.summary.total_items_lost}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-amber-700 dark:text-amber-500 text-lg">
                          £{lossesData.summary.total_restaurant_cost?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-red-700 dark:text-red-500 text-lg">
                          £{lossesData.summary.total_selling_cost?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td colSpan="4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      {/* Notes Modal */}
      {showNotesModal && selectedNote && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowNotesModal(false)
            setSelectedNote(null)
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{t('lossNote')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedNote.item}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(selectedNote.date).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowNotesModal(false)
                  setSelectedNote(null)
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-xl p-4">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedNote.note}</p>
            </div>
            <button
              onClick={() => {
                setShowNotesModal(false)
                setSelectedNote(null)
              }}
              className="mt-4 w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252ad] transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
