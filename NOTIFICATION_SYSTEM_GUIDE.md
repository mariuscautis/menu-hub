# Notification System Guide

## What Notifications Should Be Created

### For Staff Members:

1. **Shift Published** (`shift_published`)
   - When: Manager publishes the rota
   - Title: "Your shift has been published"
   - Message: "You have a new shift on [date] from [start] to [end]"

2. **Shift Assigned** (`shift_assigned`)
   - When: Manager assigns a staff member to a shift
   - Title: "You've been assigned to a shift"
   - Message: "New shift on [date] from [start] to [end] as [role]"

3. **Shift Changed** (`shift_changed`)
   - When: Manager modifies an existing shift (time/date change)
   - Title: "Your shift has been updated"
   - Message: "Your shift on [date] has been changed"

4. **Request Approved** (`request_approved`)
   - When: Manager approves time-off/swap/cover request
   - Title: "Request approved"
   - Message: "Your [request type] request has been approved"

5. **Request Rejected** (`request_rejected`)
   - When: Manager rejects a request
   - Title: "Request declined"
   - Message: "Your [request type] request was declined"

6. **Shift Reminder** (`shift_reminder`)
   - When: 2 hours before shift starts (automated)
   - Title: "Shift starts soon"
   - Message: "Your shift starts at [time] in 2 hours"

### For Managers/Owners:

1. **New Request** (`new_request`)
   - When: Staff submits time-off/swap/cover request
   - Title: "New staff request"
   - Message: "[Staff name] requested [request type]"

2. **Staff Clocked In** (`staff_clocked_in`)
   - When: Staff member clocks in
   - Title: "[Staff name] clocked in"
   - Message: "Shift: [time] - [time]"

3. **Staff Late** (`staff_late`)
   - When: Staff hasn't clocked in 15 mins after shift start
   - Title: "[Staff name] is late"
   - Message: "Shift started at [time]"

## Current Display Issue

The notification bell might not be displaying notifications due to RLS (Row Level Security) blocking access for PIN-authenticated staff.

### Fix: Use API endpoint instead of direct Supabase queries

**Problem:** Staff using PIN login don't have `auth.uid()`, so RLS blocks their queries.

**Solution:** Create an API endpoint for fetching notifications, similar to how we fixed the shifts fetching.

## Implementation Needed:

### 1. Create Notifications API Endpoint
File: `/src/app/api/notifications/route.js`

```javascript
// GET /api/notifications?user_id=xxx
// POST /api/notifications (create notification)
// PUT /api/notifications (mark as read)
```

### 2. Update NotificationBell Component
Change from:
```javascript
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  // RLS blocks this for PIN-auth staff
```

To:
```javascript
const response = await fetch(`/api/notifications?user_id=${userId}`)
const data = await response.json()
// API bypasses RLS
```

### 3. Add Notification Creation to Shift Publishing
In the shift publishing flow (`/api/rota/shifts`), when status changes to 'published', create notifications for assigned staff.

### 4. Add Notification Creation to Request Handling
When requests are approved/rejected, create notifications for the requesting staff member.

## Testing Checklist:

- [ ] Staff can see notification bell
- [ ] Unread count shows correctly
- [ ] Dropdown opens and displays notifications
- [ ] Notifications show when shift is published
- [ ] Notifications show when request is approved/rejected
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Real-time updates work (new notifications appear without refresh)
