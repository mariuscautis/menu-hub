# Staff Availability Calendar Feature

## Overview
A visual timeline calendar that displays all staff members and their availability, time-off periods, and leave status. This helps managers efficiently plan shifts by seeing at a glance who is available and when.

## Features

### 1. **Visual Timeline Calendar**
- Shows each staff member in a row
- Displays dates across columns (week or month view synced with main shift calendar)
- Color-coded availability cells:
  - **Blue**: Annual holiday
  - **Orange**: Sick leave (self-certified)
  - **Red**: Sick leave (medical certificate)
  - **Gray**: Other leave types (unpaid, compassionate)
  - **Green**: Available to work

### 2. **Advanced Filtering**
- **Search by Name/Role**: Real-time text search across staff names and roles
- **Department Filter**: Dropdown to filter by specific department
- **Role Filter**: Dropdown to filter by job role
- **Clear Filters Button**: Quick reset of all filters
- **Filter Indicator**: Shows "(filtered)" when active filters reduce the list

### 3. **Interactive Tooltips**
- Hover over any time-off period to see:
  - Leave type (Holiday, Sick, etc.)
  - Exact date range
  - Reason for leave (if provided)
- Tooltips appear above the cell with arrow pointer

### 4. **Visual Indicators**
- **Today Highlight**: Current day column highlighted in blue
- **Weekend Shading**: Weekends (Sat/Sun) have subtle gray background
- **Multi-Day Leave**: Continuous bars span across multiple days
  - Rounded corners on first and last day
  - Solid color bar across full period

### 5. **Responsive Design**
- Horizontal scrolling for long date ranges
- Sticky staff name column (stays visible while scrolling dates)
- Sticky date header row
- Minimum cell width ensures readability

### 6. **Summary Statistics**
- Shows count: "Showing X of Y staff members"
- Displays total days in view
- Shows count of approved time-off requests in period
- Updates dynamically when filters are applied

## How It Works

### Data Flow
1. **On Load**: Fetches all approved time-off requests for the restaurant
2. **Date Range**: Filters requests to only show those overlapping with current calendar view (week/month)
3. **Matching**: For each staff member and each date, checks if there's an approved time-off request
4. **Rendering**: Colors cells based on leave type or shows as available

### Independent Navigation
- **Independent from main shift calendar** - has its own date navigation and view controls
- Managers can view different time periods simultaneously:
  - Main shift calendar showing current week
  - Availability calendar showing next month or 3 months ahead
- **Three View Options**:
  - **Week View**: Shows 7 days (Sunday to Saturday)
  - **Month View**: Shows full calendar month
  - **3 Months View**: Shows 3 consecutive months for long-term planning
- **Navigation Controls**:
  - Previous/Next buttons to move backward/forward
  - Today button to jump back to current period
  - Date range label shows current viewing period

### Performance
- Only fetches time-off data for visible date range
- Filters applied client-side for instant response
- Minimal re-renders using React state management

## User Flows

### Scenario 1: Planning Next Week's Shifts
1. Manager opens Rota page (main calendar shows current week)
2. Scrolls down to Staff Availability Calendar
3. Clicks "Next" to view next week (Jan 8-14)
4. Sees that 3 staff are on holiday that week
5. Filters by "Kitchen" department to see kitchen staff availability
6. Identifies available kitchen staff for scheduling
7. Goes back up to create shifts in main calendar

### Scenario 2: Finding Cover for a Shift
1. Manager needs a bartender for Friday
2. Uses role filter to show only "Bartender" role
3. Sees Jane is on holiday but Mike and Sarah are available
4. Creates shift and assigns Mike

### Scenario 3: Long-Term Planning
1. Manager planning February shifts in advance
2. In availability calendar, clicks "Month" view
3. Clicks "Next" multiple times to reach February
4. Filters by "Front of House" department
5. Sees Sarah has approved holiday 15-20 Feb
6. Plans shifts around her absence
7. Main shift calendar still shows current week for day-to-day management

### Scenario 4: Quarterly Overview
1. Manager wants to see holiday patterns for Q1
2. Switches availability calendar to "3 Months" view
3. Navigates to January (shows Jan, Feb, Mar)
4. Sees that many staff take holiday in February
5. Plans to reduce service hours or hire temporary staff
6. Can plan 3 months ahead while main calendar handles current operations

## Technical Details

### Component Props
```javascript
<StaffAvailabilityCalendar
  staff={staff}              // Array of all active staff
  restaurant={restaurant}     // Restaurant object with ID
/>
```

### State Management
```javascript
const [timeOffRequests, setTimeOffRequests] = useState([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [departmentFilter, setDepartmentFilter] = useState('');
const [roleFilter, setRoleFilter] = useState('');

// Independent calendar controls
const [calendarDate, setCalendarDate] = useState(new Date());
const [calendarView, setCalendarView] = useState('week'); // 'week', 'month', '3months'
```

### API Integration
- **Endpoint**: `GET /api/rota/requests`
- **Query Params**:
  - `restaurant_id`: Restaurant ID
  - `status=approved`: Only approved requests
  - `request_type=time_off`: Only time-off (not shift swaps)
- **Response**: Array of request objects with dates, staff_id, leave_type, reason

### Filtering Logic
```javascript
const filteredStaff = staff.filter(staffMember => {
  const matchesSearch = searchTerm === '' ||
    staffMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staffMember.role?.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesDepartment = departmentFilter === '' ||
    staffMember.department === departmentFilter;

  const matchesRole = roleFilter === '' ||
    staffMember.role === roleFilter;

  return matchesSearch && matchesDepartment && matchesRole;
});
```

### Date Matching
```javascript
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
```

## Files Modified/Created

### Created
- `/src/app/dashboard/rota/StaffAvailabilityCalendar.js` - Main component

### Modified
- `/src/app/dashboard/rota/page.js` - Added import and component usage

## Color Coding Reference

| Leave Type | Color | Hex Code | Usage |
|------------|-------|----------|--------|
| Annual Holiday | Blue | `bg-blue-500` | Most common, planned time off |
| Sick (Self Cert) | Orange | `bg-orange-500` | Short-term sick leave |
| Sick (Medical) | Red | `bg-red-500` | Medical certificate sick leave |
| Unpaid Leave | Gray | `bg-gray-500` | Unpaid time off |
| Compassionate | Purple | `bg-purple-500` | Compassionate leave |
| Other | Slate | `bg-slate-500` | Catch-all for other types |
| Available | Green | `bg-green-50` + `border-green-200` | Staff is working |

## Benefits

✅ **Quick Visual Overview**: See all staff availability at a glance
✅ **Prevents Scheduling Conflicts**: Immediately visible who's unavailable
✅ **Department Planning**: Filter by department for focused scheduling
✅ **Role-Based Scheduling**: Find available staff by role
✅ **Detailed Information**: Hover tooltips show leave reasons
✅ **Independent Navigation**: View different time periods from main calendar
✅ **Multi-View Options**: Week, month, or 3-month views
✅ **Long-Term Planning**: See up to 3 months ahead for strategic planning
✅ **Flexible Filtering**: Search, department, and role filters work together
✅ **Mobile Friendly**: Horizontal scroll for small screens

## Future Enhancements (Optional)

- Export to PDF/Excel for printing
- Show shift count per staff member
- Availability percentage metrics
- Click cell to create shift for that staff/date
- Show partial day availability (morning/evening shifts)
- Color customize by manager preference
- Show recurring patterns (every Friday off, etc.)
- Integration with external calendars (Google Calendar, Outlook)
