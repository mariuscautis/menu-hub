'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
export default function LossesAnalytics() {
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
      expired: 'Expired',
      spoiled: 'Spoiled',
      cross_contamination: 'Cross-contamination',
      damaged_delivery: 'Damaged in Delivery',
      burned_overcooked: 'Burned/Overcooked',
      dropped_fallen: 'Dropped/Fallen',
      quality_failure: 'Quality Failure',
      customer_complaint: 'Customer Complaint Remake'
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
    return <div className="text-slate-500">Loading...</div>
  }
  if (!restaurant) {
    return <div className="text-red-600">No restaurant found</div>
  }
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Stock Losses</h1>
        <p className="text-slate-500">Track items marked for removal and analyze loss patterns</p>
      </div>
      {/* Filters */}
      <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-slate-700 mb-4">Filters</h2>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
            >
              <option value="all">All Departments</option>
              <option value="bar">Bar</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
            >
              <option value="all">All Reasons</option>
              <option value="expired">Expired</option>
              <option value="spoiled">Spoiled</option>
              <option value="cross_contamination">Cross-contamination</option>
              <option value="damaged_delivery">Damaged in Delivery</option>
              <option value="burned_overcooked">Burned/Overcooked</option>
              <option value="dropped_fallen">Dropped/Fallen</option>
              <option value="quality_failure">Quality Failure</option>
              <option value="customer_complaint">Customer Complaint</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Staff Member</label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
            >
              <option value="all">All Staff</option>
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
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Loss Records</p>
              <p className="text-2xl font-bold text-[#6262bd]">{lossesData.summary.total_loss_records}</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Total Items Lost</p>
              <p className="text-2xl font-bold text-red-600">{lossesData.summary.total_items_lost}</p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Bar Losses</p>
              <p className="text-2xl font-bold text-orange-600">
                {lossesData.summary.by_department?.bar?.items || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cost: £{lossesData.summary.by_department?.bar?.restaurant_cost?.toFixed(2) || '0.00'} •
                Revenue: £{lossesData.summary.by_department?.bar?.selling_cost?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-500 text-sm font-medium mb-1">Kitchen Losses</p>
              <p className="text-2xl font-bold text-green-600">
                {lossesData.summary.by_department?.kitchen?.items || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Cost: £{lossesData.summary.by_department?.kitchen?.restaurant_cost?.toFixed(2) || '0.00'} •
                Revenue: £{lossesData.summary.by_department?.kitchen?.selling_cost?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
          {/* Top Loss Items */}
          {lossesData.summary.top_loss_items.length > 0 && (
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-bold text-slate-700 mb-4">Top Loss Items (by lost revenue)</h2>
              <div className="space-y-2">
                {lossesData.summary.top_loss_items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-400">#{index + 1}</span>
                      <div>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-sm text-slate-500">
                          {item.count} loss record{item.count > 1 ? 's' : ''} • {item.items} items
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        item.department === 'bar'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {item.department === 'bar' ? '🍸 Bar' : '🍳 Kitchen'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">£{item.selling_cost?.toFixed(2) || '0.00'}</p>
                      <p className="text-xs text-slate-500">lost revenue</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Cost: £{item.restaurant_cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Loss Records Table */}
          <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Loss Records</h2>
            {lossesData.data.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>No loss records found for the selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date & Time</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Item</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Qty</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Restaurant Cost</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Selling Cost</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Reason</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Dept</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Staff</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lossesData.data.map((loss) => (
                      <tr key={loss.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {new Date(loss.created_at).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800">{loss.menu_item_name}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-red-600">{loss.quantity}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-amber-700">
                            £{loss.restaurant_cost?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-red-700">
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
                          {loss.staff_name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {loss.notes ? (
                            <button
                              onClick={() => {
                                setSelectedNote({ item: loss.menu_item_name, note: loss.notes, date: loss.created_at })
                                setShowNotesModal(true)
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                              title="View note"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                              </svg>
                            </button>
                          ) : (
                            <div className="inline-flex items-center justify-center w-8 h-8 text-slate-300" title="No notes">
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
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="py-4 px-4 text-sm font-bold text-slate-700" colSpan="2">
                        TOTAL
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-red-600">
                          {lossesData.summary.total_items_lost}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-amber-700 text-lg">
                          £{lossesData.summary.total_restaurant_cost?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-red-700 text-lg">
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
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Loss Note</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedNote.item}</p>
                <p className="text-xs text-slate-400">
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
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4">
              <p className="text-slate-700 whitespace-pre-wrap">{selectedNote.note}</p>
            </div>
            <button
              onClick={() => {
                setShowNotesModal(false)
                setSelectedNote(null)
              }}
              className="mt-4 w-full bg-[#6262bd] text-white py-3 rounded-xl font-semibold hover:bg-[#5252ad] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
