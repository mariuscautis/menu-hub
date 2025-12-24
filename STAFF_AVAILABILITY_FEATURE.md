# Staff Availability Feature

## Overview
Prevents managers from accidentally booking staff who are on approved time-off by filtering and visually indicating staff availability when creating/editing shifts.

## Implementation Details

### Features Implemented

1. **Automatic Availability Checking**
   - When a manager selects a shift date, the system automatically checks which staff members have approved time-off
   - Fetches all approved time-off requests and compares them with the shift date
   - Separates staff into "available" and "unavailable" lists

2. **Visual Indicators**
   - Available staff shown in "✅ Available Staff" optgroup
   - Unavailable staff shown separately in "❌ Unavailable (On Time Off)" optgroup
   - Status message shows: "X available, Y on time off"
   - Warning message if all staff are unavailable: "⚠️ All staff are unavailable on this date"

3. **Toggle to Show/Hide Unavailable Staff**
   - Button appears when unavailable staff exist: "Show unavailable (N)"
   - Clicking toggles visibility of unavailable staff in dropdown
   - Unavailable staff are disabled (cannot be selected) with reason shown

4. **Detailed Unavailability Reasons**
   - Shows leave type: "On holiday", "On sick leave", etc.
   - Shows date range: "(5 Jan - 10 Jan)" or single date "(5 Jan)"
   - Format: "John Smith - On holiday (5 Jan - 10 Jan)"

### Files Modified

#### `/src/app/dashboard/rota/ShiftModal.js`

**New State Variables:**
```javascript
const [availableStaff, setAvailableStaff] = useState([]);
const [unavailableStaff, setUnavailableStaff] = useState([]);
const [showUnavailable, setShowUnavailable] = useState(false);
```

**New Functions:**

1. **`checkStaffAvailability()`**
   - Fetches approved time-off requests from API
   - Compares shift date with time-off date ranges
   - Separates staff into available/unavailable lists
   - Adds `unavailableReason` to unavailable staff objects

2. **`getUnavailableReason(request)`**
   - Formats leave type and date range into readable message
   - Maps leave types to user-friendly labels
   - Handles single-day and multi-day time-off periods

**Updated UI Components:**

1. **Staff Assignment Dropdown**
   - Now uses `availableStaff` and `unavailableStaff` instead of raw `staff` prop
   - Shows optgroups to separate available from unavailable
   - Unavailable staff are disabled with reason in option text
   - Loading state: "Loading availability..."
   - Empty state: "No available staff"

2. **Toggle Button**
   - Conditionally rendered when `unavailableStaff.length > 0`
   - Shows count: "Show unavailable (3)"
   - Toggles between "Show" and "Hide"

3. **Status Message**
   - Dynamic message based on availability:
     - "Checking staff availability..." (loading)
     - "⚠️ All staff are unavailable on this date" (all unavailable)
     - "5 available, 2 on time off" (mixed)
     - "Select a staff member to assign to this shift" (default)

## How It Works

1. **Manager opens shift modal** → All staff shown by default (no date selected yet)

2. **Manager selects a date** →
   - `useEffect` triggers `checkStaffAvailability()`
   - API call: `GET /api/rota/requests?restaurant_id=X&status=approved&request_type=time_off`
   - System checks which staff have approved time-off overlapping with shift date

3. **Staff list updates** →
   - Available staff appear first in dropdown (enabled)
   - Unavailable staff hidden by default
   - Status message shows availability count

4. **Manager clicks "Show unavailable"** →
   - Unavailable staff appear in disabled optgroup
   - Shows reason: "Jane Doe - On holiday (1 Jan - 5 Jan)"
   - Cannot be selected (disabled)

5. **Manager selects available staff** → Shift saves normally

## Benefits

✅ **Prevents booking conflicts** - Staff on time-off cannot be assigned
✅ **Clear visibility** - Manager sees who's unavailable and why
✅ **Maintains flexibility** - Can still see full roster if needed
✅ **Better UX** - Automatic checking, no manual verification needed
✅ **Informative** - Shows exact dates and reason for unavailability

## Example Scenarios

### Scenario 1: Some staff unavailable
```
Shift Date: 5 January 2024

✅ Available Staff:
  - John Smith - Server
  - Mike Johnson - Chef

❌ Unavailable (On Time Off):
  - Jane Doe - On holiday (1 Jan - 7 Jan)
  - Bob Wilson - On sick leave (5 Jan)

Status: "2 available, 2 on time off"
```

### Scenario 2: All staff unavailable
```
Shift Date: 25 December 2024

✅ Available Staff:
  (No available staff)

❌ Unavailable (On Time Off):
  - All staff members listed with reasons

Status: "⚠️ All staff are unavailable on this date"
```

### Scenario 3: All staff available
```
Shift Date: 10 March 2024

✅ Available Staff:
  - All active staff members

Status: "Select a staff member to assign to this shift"
```

## Technical Notes

- **Performance**: API call only when date changes, not on every render
- **Error Handling**: If API fails, shows all staff as available (fail-safe)
- **Date Comparison**: Uses JavaScript Date objects for accurate range checking
- **Real-time**: When new time-off is approved, re-opening the modal will reflect changes
- **Leave Types Supported**:
  - Annual holiday
  - Sick leave (self-cert and medical)
  - Unpaid leave
  - Compassionate leave
  - Other

## Future Enhancements (Optional)

- Cache availability data to reduce API calls
- Show availability calendar view
- Warning confirmation if manager tries to override (not currently possible)
- Email notification if someone on time-off is accidentally scheduled
- Bulk availability check for multiple days
