'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

export default function StaffDashboard() {
  const router = useRouter()
  const [staffSession, setStaffSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState([])
  const [timeOffRequests, setTimeOffRequests] = useState([])
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [timeOffForm, setTimeOffForm] = useState({
    start_date: '',
    end_date: '',
    reason: ''
  })

  useEffect(() => {
    // Check for staff session
    const session = localStorage.getItem('staff_session')
    if (!session) {
      router.push('/staff-login')
      return
    }

    const parsedSession = JSON.parse(session)
    setStaffSession(parsedSession)
    fetchData(parsedSession.staff_id)
  }, [router])

  const fetchData = async (staffId) => {
    try {
      console.log('Fetching data for staff_id:', staffId)

      // Fetch shifts for this staff member
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', staffId)
        .gte('date', moment().subtract(1, 'month').format('YYYY-MM-DD'))
        .lte('date', moment().add(3, 'months').format('YYYY-MM-DD'))
        .order('date', { ascending: true })

      setShifts(shiftsData || [])

      // Fetch time-off requests from shift_requests table
      const { data: timeOffData, error: timeOffError } = await supabase
        .from('shift_requests')
        .select('*')
        .eq('staff_id', staffId)
        .eq('request_type', 'time_off')
        .order('created_at', { ascending: false })

      if (timeOffError) {
        console.error('Error fetching time-off requests:', timeOffError)
      } else {
        console.log('Fetched time-off requests:', timeOffData)
        console.log('Query params - staff_id:', staffId, 'request_type: time_off')
      }

      // Also fetch ALL shift_requests for this staff to debug
      const { data: allRequests } = await supabase
        .from('shift_requests')
        .select('*')
        .eq('staff_id', staffId)

      console.log('All shift_requests for this staff:', allRequests)

      setTimeOffRequests(timeOffData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('staff_session')
    router.push('/staff-login')
  }

  const handleTimeOffChange = (e) => {
    const { name, value } = e.target
    setTimeOffForm({
      ...timeOffForm,
      [name]: value
    })
  }

  const handleTimeOffSubmit = async (e) => {
    e.preventDefault()

    // Validate dates
    if (new Date(timeOffForm.start_date) > new Date(timeOffForm.end_date)) {
      alert('End date must be on or after start date.')
      return
    }

    const workingDays = calculateWorkingDays(timeOffForm.start_date, timeOffForm.end_date)

    if (workingDays === 0) {
      alert('Your selected dates only include weekends. Please select dates that include working days.')
      return
    }

    try {
      const requestBody = {
        restaurant_id: staffSession.restaurant_id,
        staff_id: staffSession.staff_id,
        request_type: 'time_off',
        date_from: timeOffForm.start_date,
        date_to: timeOffForm.end_date,
        reason: timeOffForm.reason,
        leave_type: 'annual_holiday',
        days_requested: workingDays
      }

      console.log('Submitting time-off request:', requestBody)

      const response = await fetch('/api/rota/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      console.log('API Response:', response.status, data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit time-off request')
      }

      // Refresh data
      fetchData(staffSession.staff_id)
      setShowTimeOffModal(false)
      setTimeOffForm({ start_date: '', end_date: '', reason: '' })
      alert(`Time-off request submitted successfully!\n\nRequesting ${workingDays} working day${workingDays > 1 ? 's' : ''} off.`)
    } catch (error) {
      console.error('Error submitting time-off request:', error)
      alert(error.message || 'Failed to submit time-off request. Please try again.')
    }
  }

  const calculateWorkingDays = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) return 0

    let count = 0
    const currentDate = new Date(start)

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay()
      // Count Monday (1) through Friday (5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return count
  }

  // Format shifts for calendar
  const calendarEvents = shifts.map(shift => {
    const shiftDate = moment(shift.date).format('YYYY-MM-DD')
    const startTime = moment(`${shiftDate} ${shift.shift_start}`).toDate()
    const endTime = moment(`${shiftDate} ${shift.shift_end}`).toDate()

    return {
      id: shift.id,
      title: `${shift.role_required} - ${shift.shift_start} to ${shift.shift_end}`,
      start: startTime,
      end: endTime,
      resource: shift
    }
  })

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    }
    return badges[status] || 'bg-slate-100 text-slate-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  if (!staffSession) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Welcome, {staffSession.name}
              </h1>
              <p className="text-slate-500 text-sm">
                {staffSession.role} • {staffSession.restaurant_name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border-2 border-slate-100 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">Upcoming Shifts</p>
            <p className="text-3xl font-bold text-[#6262bd]">
              {shifts.filter(s => moment(s.date).isAfter(moment())).length}
            </p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">This Week</p>
            <p className="text-3xl font-bold text-[#6262bd]">
              {shifts.filter(s => moment(s.date).isBetween(moment().startOf('week'), moment().endOf('week'))).length}
            </p>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-xl p-6">
            <p className="text-slate-500 text-sm font-medium mb-1">Pending Time-Off</p>
            <p className="text-3xl font-bold text-yellow-600">
              {timeOffRequests.filter(r => r.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">My Schedule</h2>
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              views={['month', 'week', 'day']}
              defaultView="week"
            />
          </div>
        </div>

        {/* Time Off Requests */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Time-Off Requests</h2>
            <button
              onClick={() => setShowTimeOffModal(true)}
              className="bg-[#6262bd] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#5252a3]"
            >
              Request Time Off
            </button>
          </div>

          {timeOffRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No time-off requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {timeOffRequests.map(request => (
                <div
                  key={request.id}
                  className="border-2 border-slate-100 rounded-xl p-4 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">
                      {moment(request.date_from).format('MMM D, YYYY')} - {moment(request.date_to).format('MMM D, YYYY')}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">{request.reason || 'No reason provided'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Requested on {moment(request.created_at).format('MMM D, YYYY')}
                      {request.days_requested && ` • ${request.days_requested} day${request.days_requested > 1 ? 's' : ''}`}
                    </p>
                    {request.status === 'rejected' && request.rejection_reason && (
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        Rejection reason: {request.rejection_reason}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusBadge(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowTimeOffModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-800 mb-6">Request Time Off</h2>
            <form onSubmit={handleTimeOffSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={timeOffForm.start_date}
                  onChange={handleTimeOffChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={timeOffForm.end_date}
                  onChange={handleTimeOffChange}
                  required
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={timeOffForm.reason}
                  onChange={handleTimeOffChange}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none"
                  placeholder="Brief reason for time off..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTimeOffModal(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#6262bd] text-white py-3 rounded-xl font-medium hover:bg-[#5252a3]"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
