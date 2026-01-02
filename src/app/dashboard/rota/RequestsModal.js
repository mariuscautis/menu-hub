'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function RequestsModal({ onClose, onRequestUpdated }) {
  const [restaurant, setRestaurant] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState({
    date_from: '',
    date_to: '',
    status: '',
    reason: '',
    leave_type: '',
    rejection_reason: ''
  });

  useEffect(() => {
    fetchRestaurantData();
  }, []);

  const fetchRestaurantData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let restaurantData = null;

    // Check for staff session (PIN login)
    const staffSessionData = localStorage.getItem('staff_session');
    if (staffSessionData) {
      try {
        const staffSession = JSON.parse(staffSessionData);
        restaurantData = staffSession.restaurant;
      } catch (err) {
        localStorage.removeItem('staff_session');
      }
    }

    if (!restaurantData) {
      // Check if owner
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (restaurants) {
        restaurantData = restaurants;
      }
    }

    if (restaurantData) {
      setRestaurant(restaurantData);
    }
  };

  useEffect(() => {
    if (restaurant) {
      fetchRequests();
    }
  }, [restaurant, filter]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurant) return;

    const requestsChannel = supabase
      .channel(`requests-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_requests',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => {
        fetchRequests();
      })
      .subscribe();

    return () => {
      requestsChannel.unsubscribe();
    };
  }, [restaurant, filter]);

  const fetchRequests = async () => {
    setLoading(true);

    const params = new URLSearchParams({
      restaurant_id: restaurant.id
    });

    if (filter !== 'all') {
      params.append('status', filter);
    }

    const response = await fetch(`/api/rota/requests?${params}`);
    const result = await response.json();

    if (result.requests) {
      // Filter out time_off requests - they're managed in the dedicated Time-Off Requests page
      const filteredRequests = result.requests.filter(req => req.request_type !== 'time_off');
      setRequests(filteredRequests);
    }

    setLoading(false);
  };

  const handleApprove = async (request) => {
    const staffData = localStorage.getItem('staff');
    const staff = staffData ? JSON.parse(staffData) : null;

    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'approved',
          approved_by: staff?.id || restaurant.owner_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      fetchRequests();
      if (onRequestUpdated) onRequestUpdated(); // Notify parent to update count
      alert('Request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      alert(error.message);
    }
  };

  const handleReject = async (request) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: request.id,
          status: 'rejected',
          rejection_reason: rejectionReason
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      setSelectedRequest(null);
      setRejectionReason('');
      fetchRequests();
      if (onRequestUpdated) onRequestUpdated(); // Notify parent to update count
      alert('Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert(error.message);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setEditForm({
      date_from: request.date_from || '',
      date_to: request.date_to || '',
      status: request.status || '',
      reason: request.reason || '',
      leave_type: request.leave_type || '',
      rejection_reason: request.rejection_reason || ''
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingRequest) return;

    try {
      const staffData = localStorage.getItem('staff');
      const staff = staffData ? JSON.parse(staffData) : null;

      const response = await fetch('/api/rota/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRequest.id,
          date_from: editForm.date_from,
          date_to: editForm.date_to,
          status: editForm.status,
          reason: editForm.reason,
          leave_type: editForm.leave_type,
          rejection_reason: editForm.rejection_reason,
          approved_by: editForm.status === 'approved' ? (staff?.id || restaurant.owner_id) : undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update request');
      }

      setEditingRequest(null);
      setEditForm({
        date_from: '',
        date_to: '',
        status: '',
        reason: '',
        leave_type: '',
        rejection_reason: ''
      });
      fetchRequests();
      if (onRequestUpdated) onRequestUpdated();
      alert('Request updated successfully');
    } catch (error) {
      console.error('Error updating request:', error);
      alert(error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRequestTypeBadge = (type) => {
    const badges = {
      time_off: 'bg-blue-100 text-blue-800',
      swap: 'bg-purple-100 text-purple-800',
      cover: 'bg-orange-100 text-orange-800'
    };

    const labels = {
      time_off: 'Time Off',
      swap: 'Shift Swap',
      cover: 'Cover Request'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[type] || 'bg-gray-100 text-gray-800'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const getLeaveTypeBadge = (leaveType) => {
    if (!leaveType) return null;

    const badges = {
      annual_holiday: 'bg-green-100 text-green-800',
      sick_self_cert: 'bg-orange-100 text-orange-800',
      sick_medical_cert: 'bg-red-100 text-red-800',
      unpaid: 'bg-gray-100 text-gray-800',
      compassionate: 'bg-purple-100 text-purple-800',
      other: 'bg-slate-100 text-slate-800'
    };

    const labels = {
      annual_holiday: '🏖️ Annual Holiday',
      sick_self_cert: '🤒 Sick (Self-Cert)',
      sick_medical_cert: '🏥 Sick (Medical Cert)',
      unpaid: '💰 Unpaid',
      compassionate: '🕊️ Compassionate',
      other: 'Other'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[leaveType] || 'bg-gray-100 text-gray-800'}`}>
        {labels[leaveType] || leaveType}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Staff Requests</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-slate-100">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'pending'
                ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'approved'
                ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'rejected'
                ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Rejected
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'all'
                ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All
          </button>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
            <p className="text-slate-600">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600">No requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => (
              <div
                key={request.id}
                className="border-2 border-slate-100 rounded-xl p-6 hover:border-slate-200 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-slate-800">
                        {request.staff?.name}
                      </h3>
                      {getRequestTypeBadge(request.request_type)}
                      {request.leave_type && getLeaveTypeBadge(request.leave_type)}
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-slate-500">
                      {request.staff?.role} • Submitted {formatDate(request.created_at)}
                      {request.days_requested && (
                        <span className="ml-2 font-medium text-[#6262bd]">
                          • {request.days_requested} working {request.days_requested === 1 ? 'day' : 'days'}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(request)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleEdit(request)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>

                {/* Request Details */}
                <div className="bg-slate-50 rounded-lg p-4">
                  {request.request_type === 'time_off' && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Time Off Request:</p>
                      <p className="text-sm text-slate-600">
                        From: {formatDate(request.date_from)} to {formatDate(request.date_to)}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-slate-600 mt-2">
                          Reason: {request.reason}
                        </p>
                      )}
                    </div>
                  )}

                  {request.request_type === 'swap' && request.shift && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Shift Swap Request:</p>
                      <p className="text-sm text-slate-600">
                        Wants to swap: {formatDate(request.shift.date)} {request.shift.shift_start} - {request.shift.shift_end}
                      </p>
                      {request.swap_with_staff && (
                        <p className="text-sm text-slate-600 mt-1">
                          With: {request.swap_with_staff.name}
                        </p>
                      )}
                    </div>
                  )}

                  {request.request_type === 'cover' && request.shift && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Cover Request:</p>
                      <p className="text-sm text-slate-600">
                        Needs cover for: {formatDate(request.shift.date)} {request.shift.shift_start} - {request.shift.shift_end}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-slate-600 mt-2">
                          Reason: {request.reason}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === 'approved' && request.approver && (
                    <p className="text-sm text-green-600 mt-3">
                      Approved by {request.approver.name} on {formatDate(request.approved_at)}
                    </p>
                  )}

                  {request.status === 'rejected' && request.rejection_reason && (
                    <p className="text-sm text-red-600 mt-3">
                      Rejected: {request.rejection_reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-bold mb-4">Reject Request</h3>
              <p className="text-sm text-slate-600 mb-4">
                Please provide a reason for rejecting this request:
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows="4"
                placeholder="Enter rejection reason..."
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none mb-4"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 border-2 border-slate-200 rounded-lg text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleReject(selectedRequest)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Request Modal */}
        {editingRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Edit Request</h3>

              <div className="space-y-4">
                {/* Staff Info */}
                <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700">Staff: <span className="font-bold">{editingRequest.staff?.name}</span></p>
                  <p className="text-sm text-slate-600">Role: {editingRequest.staff?.role}</p>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="date_from"
                      value={editForm.date_from}
                      onChange={handleEditFormChange}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="date_to"
                      value={editForm.date_to}
                      onChange={handleEditFormChange}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    />
                  </div>
                </div>

                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Leave Type
                  </label>
                  <select
                    name="leave_type"
                    value={editForm.leave_type}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  >
                    <option value="">Select type</option>
                    <option value="annual_holiday">Annual Holiday</option>
                    <option value="sick_self_cert">Sick Leave - Self Certified</option>
                    <option value="sick_medical_cert">Sick Leave - Medical Certificate</option>
                    <option value="unpaid">Unpaid Leave</option>
                    <option value="compassionate">Compassionate Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditFormChange}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    value={editForm.reason}
                    onChange={handleEditFormChange}
                    rows="3"
                    placeholder="Request reason..."
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none"
                  />
                </div>

                {/* Rejection Reason (if status is rejected) */}
                {editForm.status === 'rejected' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Rejection Reason
                    </label>
                    <textarea
                      name="rejection_reason"
                      value={editForm.rejection_reason}
                      onChange={handleEditFormChange}
                      rows="3"
                      placeholder="Why was this request rejected..."
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd] resize-none"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => {
                      setEditingRequest(null);
                      setEditForm({
                        date_from: '',
                        date_to: '',
                        status: '',
                        reason: '',
                        leave_type: '',
                        rejection_reason: ''
                      });
                    }}
                    className="px-6 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-medium hover:border-[#6262bd]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
