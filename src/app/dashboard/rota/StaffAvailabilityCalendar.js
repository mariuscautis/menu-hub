'use client';

import { useState, useEffect } from 'react';
import moment from 'moment';
import { useTranslations } from '@/lib/i18n/LanguageContext';

export default function StaffAvailabilityCalendar({ staff, restaurant }) {
  const t = useTranslations('rota.availability');
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Independent calendar controls
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    if (restaurant) {
      fetchTimeOffRequests();
    }
  }, [restaurant, calendarDate]);

  const fetchTimeOffRequests = async () => {
    if (!restaurant) return;

    setLoading(true);

    try {
      // Get date range for week view
      const start = moment(calendarDate).startOf('week');
      const end = moment(calendarDate).endOf('week');

      const response = await fetch(
        `/api/rota/requests?restaurant_id=${restaurant.id}&status=approved&request_type=time_off`
      );
      const result = await response.json();

      if (result.requests) {
        // Filter requests that overlap with the current view period
        const relevantRequests = result.requests.filter(request => {
          const requestStart = moment(request.date_from);
          const requestEnd = moment(request.date_to);
          return requestEnd.isSameOrAfter(start, 'day') && requestStart.isSameOrBefore(end, 'day');
        });
        setTimeOffRequests(relevantRequests);
      }
    } catch (error) {
      console.error('Error fetching time-off requests:', error);
    }

    setLoading(false);
  };

  const getDateRange = () => {
    const start = moment(calendarDate).startOf('week');
    const end = moment(calendarDate).endOf('week');

    const days = [];
    let current = start.clone();

    while (current.isSameOrBefore(end, 'day')) {
      days.push(current.clone());
      current.add(1, 'day');
    }

    return days;
  };

  // Navigation handlers
  const handlePrevious = () => {
    setCalendarDate(moment(calendarDate).subtract(1, 'week').toDate());
  };

  const handleNext = () => {
    setCalendarDate(moment(calendarDate).add(1, 'week').toDate());
  };

  const handleToday = () => {
    setCalendarDate(new Date());
  };

  const getDateRangeLabel = () => {
    const start = moment(calendarDate).startOf('week');
    const end = moment(calendarDate).endOf('week');
    return `${start.format('D MMM')} - ${end.format('D MMM YYYY')}`;
  };

  const getStaffTimeOff = (staffId, date) => {
    return timeOffRequests.find(request => {
      const requestStart = moment(request.date_from);
      const requestEnd = moment(request.date_to);
      return (
        request.staff_id === staffId &&
        date.isSameOrAfter(requestStart, 'day') &&
        date.isSameOrBefore(requestEnd, 'day')
      );
    });
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      annual_holiday: { bg: 'bg-blue-500', text: t('leaveTypes.holiday') },
      sick_self_cert: { bg: 'bg-orange-500', text: t('leaveTypes.sick') },
      sick_medical_cert: { bg: 'bg-red-500', text: t('leaveTypes.sick') },
      unpaid: { bg: 'bg-gray-500', text: t('leaveTypes.unpaid') },
      compassionate: { bg: 'bg-purple-500', text: t('leaveTypes.compassionate') },
      other: { bg: 'bg-slate-500', text: t('leaveTypes.timeOff') }
    };
    return colors[leaveType] || colors.other;
  };

  // Get unique departments and roles for filters
  const departments = [...new Set(staff.map(s => s.department).filter(Boolean))];
  const roles = [...new Set(staff.map(s => s.role).filter(Boolean))];

  // Filter staff based on search and filters
  const filteredStaff = staff.filter(staffMember => {
    const matchesSearch = searchTerm === '' ||
      staffMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.role?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment = departmentFilter === '' || staffMember.department === departmentFilter;
    const matchesRole = roleFilter === '' || staffMember.role === roleFilter;

    return matchesSearch && matchesDepartment && matchesRole;
  });

  const dateRange = getDateRange();

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6262bd] mx-auto mb-3"></div>
            <p className="text-slate-600 dark:text-slate-400 text-sm">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b-2 border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{t('title')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-slate-600">{t('legendHoliday')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-slate-600">{t('legendSick')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-500"></div>
              <span className="text-slate-600">{t('legendOther')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-50 border-2 border-green-200"></div>
              <span className="text-slate-600">{t('legendAvailable')}</span>
            </div>
          </div>
        </div>

        {/* Date Navigation and View Controls */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-300">
          <div className="flex items-center gap-3">
            {/* Previous Button */}
            <button
              onClick={handlePrevious}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-colors text-slate-700 font-medium"
            >
              {t('prevButton')}
            </button>

            {/* Today Button */}
            <button
              onClick={handleToday}
              className="px-4 py-2 border-2 border-slate-200 rounded-lg hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-colors text-slate-700 font-medium"
            >
              {t('todayButton')}
            </button>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg hover:border-[#6262bd] hover:bg-[#6262bd] hover:text-white transition-colors text-slate-700 font-medium"
            >
              {t('nextButton')}
            </button>

            {/* Date Range Label */}
            <div className="ml-4 px-4 py-2 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-lg">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {getDateRangeLabel()}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="">{t('allDepartments')}</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept.charAt(0).toUpperCase() + dept.slice(1)}
                </option>
              ))}
            </select>
          )}

          {/* Role Filter */}
          {roles.length > 0 && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#6262bd] bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200"
            >
              <option value="">{t('allRoles')}</option>
              {roles.map(role => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          )}

          {/* Clear Filters */}
          {(searchTerm || departmentFilter || roleFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('');
                setRoleFilter('');
              }}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-[#6262bd] font-medium text-sm transition-colors"
            >
              {t('clearButton')}
            </button>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Date Headers */}
        <div className="flex border-b-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
          <div className="w-48 flex-shrink-0 px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 border-r-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            {t('staffMember')}
          </div>
          <div className="flex flex-1">
            <div className="flex flex-1">
              {dateRange.map((date, idx) => {
                const isToday = date.isSame(moment(), 'day');
                const isWeekend = date.day() === 0 || date.day() === 6;
                return (
                  <div
                    key={idx}
                    className={`flex-1 min-w-[80px] px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 ${
                      isToday ? 'bg-blue-50 dark:bg-blue-900/30' : isWeekend ? 'bg-slate-100 dark:bg-slate-700' : ''
                    }`}
                  >
                    <div className={`text-xs font-medium ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {date.format('ddd')}
                    </div>
                    <div className={`text-sm font-bold ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {date.format('D')}
                    </div>
                    {isToday && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('todayLabel')}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Staff Rows */}
        {filteredStaff && filteredStaff.length > 0 ? (
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {filteredStaff.map((staffMember) => (
              <div key={staffMember.id} className="flex hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                {/* Staff Name */}
                <div className="w-48 flex-shrink-0 px-4 py-4 border-r-2 border-slate-200 dark:border-slate-700">
                  <div className="font-semibold text-slate-800 dark:text-slate-200">{staffMember.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{staffMember.role}</div>
                  {staffMember.department && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{staffMember.department}</div>
                  )}
                </div>

                {/* Availability Cells */}
                <div className="flex flex-1">
                  <div className="flex flex-1">
                    {dateRange.map((date, idx) => {
                      const timeOff = getStaffTimeOff(staffMember.id, date);
                      const isWeekend = date.day() === 0 || date.day() === 6;
                      const isToday = date.isSame(moment(), 'day');

                      if (timeOff) {
                        const leaveColor = getLeaveTypeColor(timeOff.leave_type);
                        const isFirstDay = date.isSame(moment(timeOff.date_from), 'day');
                        const isLastDay = date.isSame(moment(timeOff.date_to), 'day');

                        return (
                          <div
                            key={idx}
                            className="flex-1 min-w-[80px] px-1 py-4 border-r border-slate-200 relative group"
                          >
                            <div
                              className={`h-full ${leaveColor.bg} ${
                                isFirstDay ? 'rounded-l-lg' : ''
                              } ${isLastDay ? 'rounded-r-lg' : ''}`}
                              title={`${leaveColor.text}: ${moment(timeOff.date_from).format('D MMM')} - ${moment(timeOff.date_to).format('D MMM')}${timeOff.reason ? '\n' + timeOff.reason : ''}`}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                                  <div className="font-semibold">{leaveColor.text}</div>
                                  <div className="text-slate-300">
                                    {moment(timeOff.date_from).format('D MMM')} - {moment(timeOff.date_to).format('D MMM')}
                                  </div>
                                  {timeOff.reason && (
                                    <div className="text-slate-400 mt-1 max-w-xs whitespace-normal">
                                      {timeOff.reason}
                                    </div>
                                  )}
                                  {/* Arrow */}
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-slate-900"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className={`flex-1 min-w-[80px] px-1 py-4 border-r border-slate-200 dark:border-slate-700 ${
                            isToday ? 'bg-blue-50/30 dark:bg-blue-900/20' : isWeekend ? 'bg-slate-50 dark:bg-slate-800' : ''
                          }`}
                        >
                          <div className="h-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg"></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p className="text-lg mb-2">{t('noStaffFound')}</p>
            {(searchTerm || departmentFilter || roleFilter) && (
              <p className="text-sm">{t('tryAdjustingFilters')}</p>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {staff && staff.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-600 dark:text-slate-400">
              {t('showingStaff')
                .replace('{filtered}', filteredStaff.length)
                .replace('{total}', staff.length)
                .replace('{plural}', staff.length !== 1 ? 's' : '')} • {t('days').replace('{count}', dateRange.length)}
              {(searchTerm || departmentFilter || roleFilter) && filteredStaff.length !== staff.length && (
                <span className="ml-2 text-[#6262bd] font-medium">
                  {t('filtered')}
                </span>
              )}
            </div>
            <div className="text-slate-600">
              {t('timeOffRequests')
                .replace('{count}', timeOffRequests.length)
                .replace('{plural}', timeOffRequests.length !== 1 ? 's' : '')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
