'use client';

import moment from 'moment';

export default function MobileRotaView({ shifts, onSelectShift }) {
  // Group shifts by date
  const groupedShifts = shifts.reduce((groups, shift) => {
    const date = shift.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(shift);
    return groups;
  }, {});

  // Sort dates
  const sortedDates = Object.keys(groupedShifts).sort();

  const formatDate = (dateString) => {
    return moment(dateString).format('ddd, MMM D');
  };

  const formatTime = (timeString) => {
    return timeString?.substring(0, 5);
  };

  // Generate consistent color for each staff member (same logic as desktop)
  const getStaffColor = (staffId) => {
    if (!staffId) return null;

    let hash = 0;
    const idStr = staffId.toString();
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash % 360);
    const saturation = 65 + (Math.abs(hash % 10));
    const lightness = 50 + (Math.abs(hash % 10));

    return {
      background: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      border: `hsl(${hue}, ${saturation}%, ${lightness - 15}%)`,
      light: `hsl(${hue}, ${saturation}%, 95%)`,
      text: lightness > 55 ? '#1f2937' : '#ffffff'
    };
  };

  const getShiftStyle = (shift) => {
    // Cancelled shifts
    if (shift.status === 'cancelled') {
      return {
        borderLeft: '4px solid #6b7280',
        backgroundColor: '#f9fafb'
      };
    }

    // Unfilled shifts
    if (!shift.staff_id) {
      return {
        borderLeft: '4px solid #d97706',
        backgroundColor: '#fffbeb'
      };
    }

    // Completed shifts
    if (shift.status === 'completed') {
      const staffColor = getStaffColor(shift.staff_id);
      return {
        borderLeft: `4px solid ${staffColor ? staffColor.border : '#059669'}`,
        backgroundColor: '#ecfdf5'
      };
    }

    // Published/Draft with staff assigned - use staff color
    const staffColor = getStaffColor(shift.staff_id);
    if (staffColor) {
      return {
        borderLeft: `4px solid ${staffColor.border}`,
        backgroundColor: staffColor.light
      };
    }

    // Fallback for draft without staff
    return {
      borderLeft: '4px solid #6262bd',
      backgroundColor: '#f5f3ff'
    };
  };

  const getStatusLabel = (shift) => {
    if (shift.status === 'cancelled') return 'Cancelled';
    if (!shift.staff_id) return 'Unfilled';
    if (shift.status === 'completed') return 'Completed';
    if (shift.status === 'published') return 'Published';
    return 'Draft';
  };

  return (
    <div className="space-y-4">
      {sortedDates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border-2 border-slate-100">
          <p className="text-slate-600">No shifts scheduled for this period</p>
        </div>
      ) : (
        sortedDates.map(date => (
          <div key={date} className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
            {/* Date Header */}
            <div className="bg-[#6262bd] text-white px-4 py-3">
              <h3 className="font-bold text-lg">{formatDate(date)}</h3>
              <p className="text-sm opacity-90">{groupedShifts[date].length} shift{groupedShifts[date].length !== 1 ? 's' : ''}</p>
            </div>

            {/* Shifts */}
            <div className="divide-y divide-slate-100">
              {groupedShifts[date].map(shift => {
                const shiftStyle = getShiftStyle(shift);
                const staffColor = shift.staff_id ? getStaffColor(shift.staff_id) : null;

                return (
                  <div
                    key={shift.id}
                    onClick={() => onSelectShift(shift)}
                    className="p-4 active:opacity-75 transition-all"
                    style={shiftStyle}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-lg text-slate-800">
                            {formatTime(shift.shift_start)} - {formatTime(shift.shift_end)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-slate-700 font-medium">
                            {shift.staff?.name || shift.role_required}
                          </p>
                          {staffColor && shift.staff_id && (
                            <div
                              className="w-3 h-3 rounded-full border-2"
                              style={{
                                backgroundColor: staffColor.background,
                                borderColor: staffColor.border
                              }}
                              title={shift.staff?.name}
                            ></div>
                          )}
                        </div>
                        {!shift.staff_id && (
                          <p className="text-sm text-slate-500 mt-1">{shift.role_required} needed</p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-700">
                          {getStatusLabel(shift)}
                        </span>
                        {shift.department && (
                          <span className="px-2 py-1 bg-white border border-slate-200 text-slate-700 rounded text-xs">
                            {shift.department}
                          </span>
                        )}
                      </div>
                    </div>

                    {shift.notes && (
                      <p className="text-sm text-slate-600 mt-2 bg-white/50 p-2 rounded">
                        {shift.notes}
                      </p>
                    )}

                    {shift.break_duration > 0 && (
                      <p className="text-xs text-slate-500 mt-2">
                        Break: {shift.break_duration} min
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
