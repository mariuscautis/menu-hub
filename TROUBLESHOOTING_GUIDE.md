# Troubleshooting Guide - Item-Level Delivery Tracking

## Issues You're Experiencing

1. ✅ "Start Preparing" notification shows but button doesn't change
2. ✅ Badges appear immediately after "Start Preparing" instead of after "Mark Ready"
3. ✅ Delivery badges ("Kitchen Ready", "Bar Ready") don't disappear after clicking

## Root Cause Analysis

### Most Likely Cause: SQL Migration Not Run

The new columns (`preparing_started_at`, `marked_ready_at`, `delivered_at`) don't exist on the `order_items` table yet.

**Symptoms when migration hasn't been run**:
- Buttons don't change state
- Old data causes unexpected behavior
- Badges appear at wrong times

### How to Verify

Run these queries in Supabase SQL Editor:

#### Query 1: Check if columns exist
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'order_items'
  AND column_name IN ('preparing_started_at', 'marked_ready_at', 'delivered_at');
```

**Expected result**: 3 rows
**If you get 0 rows**: Migration hasn't been run! Go to "Solution 1" below.

#### Query 2: Check for old migrated data
```sql
SELECT
  oi.id,
  mi.name,
  mi.department,
  oi.preparing_started_at,
  oi.marked_ready_at,
  oi.delivered_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.paid = false
  AND o.status != 'cancelled'
ORDER BY o.created_at DESC
LIMIT 10;
```

**Expected result**: All new timestamp columns should be NULL for new orders

**If `marked_ready_at` is NOT NULL**: Old data was migrated. This causes badges to appear immediately. Go to "Solution 2" below.

## Solutions

### Solution 1: Run the SQL Migration (REQUIRED FIRST STEP)

1. Open Supabase SQL Editor
2. Copy the **entire contents** of `ADD_ITEM_LEVEL_DELIVERY_TRACKING_V3.sql`
3. Paste into SQL Editor
4. Click "Run"

**Expected output**:
```
✅ Item-level delivery tracking added successfully!
New columns: order_items.preparing_started_at, marked_ready_at, delivered_at
New view: order_item_delivery_analytics
Migrated existing order timestamps to items
Using menu_categories table for category names
Note: Each department controls preparation and ready status independently
```

**If you get an error**: Check the error message and see "Common Migration Errors" section below.

### Solution 2: Clean Up Old Data (If badges appear prematurely)

If you've already run the migration but badges are appearing too early, run this cleanup query:

```sql
-- Clear timestamps from unpaid orders so you can test cleanly
UPDATE order_items oi
SET
  preparing_started_at = NULL,
  marked_ready_at = NULL,
  delivered_at = NULL
FROM orders o
WHERE oi.order_id = o.id
  AND o.paid = false
  AND o.status != 'cancelled';
```

This will reset all unpaid orders to a clean state.

### Solution 3: Refresh Your Browser

After running the migration:
1. Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Or open an incognito/private window
3. Navigate to Orders tab
4. Create a new test order

## Testing the Complete Workflow

### Step-by-Step Test

1. **Create Test Order**:
   - Go to a table's ordering page
   - Add: 1x Pizza (kitchen) + 1x Coke (bar)
   - Submit order

2. **Check Orders Tab - Pending State**:
   - Go to Orders tab
   - Find your order
   - Should show **TWO buttons**:
     - 🍳 Start Preparing Kitchen
     - 🍸 Start Preparing Bar

3. **Kitchen Starts Preparing**:
   - Click "🍳 Start Preparing Kitchen"
   - **Expect**:
     - ✅ Notification: "Kitchen started preparing!"
     - ✅ Button changes to: "🍳 Mark Kitchen Ready" (green)
     - ✅ Bar button unchanged: "🍸 Start Preparing Bar" (purple)

4. **Check Tables Tab - After Kitchen Starts**:
   - Go to Tables tab
   - Find your table
   - **Expect**:
     - ❌ NO badges should appear yet
     - (Kitchen hasn't marked ready, only started)

5. **Kitchen Marks Ready**:
   - Go back to Orders tab
   - Click "🍳 Mark Kitchen Ready"
   - **Expect**:
     - ✅ Notification: "Kitchen items marked as ready!"
     - ✅ Kitchen button disappears
     - ✅ Bar button still shows: "🍸 Start Preparing Bar"

6. **Check Tables Tab - After Kitchen Ready**:
   - Go to Tables tab
   - Find your table
   - **Expect**:
     - ✅ Green pulsing badge: "KITCHEN READY!"
     - ❌ No bar badge (bar hasn't started yet)

7. **Bar Starts and Marks Ready**:
   - Go to Orders tab
   - Click "🍸 Start Preparing Bar"
   - Button changes to "🍸 Mark Bar Ready"
   - Click "🍸 Mark Bar Ready"

8. **Check Tables Tab - After Bar Ready**:
   - Go to Tables tab
   - Find your table
   - **Expect**:
     - ✅ Green badge: "KITCHEN READY!"
     - ✅ Blue badge: "BAR READY!"
     - (Both showing simultaneously)

9. **Deliver Kitchen Items**:
   - Click the green "KITCHEN READY!" badge
   - **Expect**:
     - ✅ Notification: "1 Kitchen item delivered to Table X!"
     - ✅ Green badge disappears
     - ✅ Blue badge remains

10. **Deliver Bar Items**:
    - Click the blue "BAR READY!" badge
    - **Expect**:
      - ✅ Notification: "1 Bar item delivered to Table X!"
      - ✅ Blue badge disappears
      - ✅ No badges remaining

11. **Verify Database**:
```sql
SELECT
  oi.id,
  mi.name,
  mi.department,
  oi.preparing_started_at,
  oi.marked_ready_at,
  oi.delivered_at
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.id = '<your-order-id>'
ORDER BY mi.department, mi.name;
```

**Expected**:
- Pizza (kitchen): All 3 timestamps set
- Coke (bar): All 3 timestamps set
- Kitchen timestamps should be earlier than bar timestamps

## Common Migration Errors

### Error: "column already exists"
**Cause**: Migration was already run partially
**Fix**: The migration uses `IF NOT EXISTS`, so this shouldn't happen. But if it does, you can skip to running just the view creation part.

### Error: "relation menu_categories does not exist"
**Cause**: Your database doesn't have a menu_categories table
**Fix**: The system uses `menu_items.department` field, not menu_categories. This is for analytics only.

### Error: "permission denied"
**Cause**: Database user doesn't have permission to create columns/indexes
**Fix**: Make sure you're logged in as the database owner or have SUPERUSER privileges

## Debugging Console Output

Open browser console (F12) and look for:

### When clicking "Start Preparing Kitchen":
```
Kitchen started preparing!
```

### When clicking "Mark Kitchen Ready":
```
Kitchen items marked as ready!
Tables page - Order item changed: { ... }
Tables page - Fetching updated table order info
```

### When clicking delivery badge:
```
1 Kitchen item delivered to Table 5!
Tables page - Order item changed: { ... }
Tables page - Fetching updated table order info
```

If you're **NOT seeing** these console logs, the real-time subscription isn't working.

## Real-Time Subscription Issues

### Symptom: Badges don't disappear after clicking
**Cause**: Real-time subscription not refreshing the Tables page

**Fix**: Force refresh by navigating away and back:
1. Click on "Orders" tab
2. Click back on "Tables" tab
3. Badges should now be updated

**Permanent Fix**: Already implemented - changed `order_items` subscription from `INSERT` only to `*` (all events) in [src/app/dashboard/tables/page.js](src/app/dashboard/tables/page.js:127)

## Critical Fix: RLS UPDATE Policy

### Issue: Updates Not Persisting Despite Policy Existing

**Symptom**: After clicking "Start Preparing", success notification appears but `preparing_started_at` remains NULL in database.

**Root Cause**: The UPDATE RLS policy was created with only a USING clause, but PostgreSQL requires BOTH:
- **USING**: Determines which rows can be SEEN for updates
- **WITH CHECK**: Determines which rows can be MODIFIED

**Fix**: Run `FIX_ORDER_ITEMS_UPDATE_POLICY.sql` which adds the WITH CHECK clause:

```bash
# In Supabase SQL Editor, run:
FIX_ORDER_ITEMS_UPDATE_POLICY.sql
```

**Expected output**:
```
✅ Updated order_items UPDATE policy with WITH CHECK clause
This policy now allows owners and staff to update order items
Both USING (which rows can be seen) and WITH CHECK (which rows can be modified) are now set
```

**Verify the fix**:
1. Run the SQL file above
2. Hard refresh your browser (Cmd+Shift+R)
3. Click "Start Preparing Kitchen"
4. Check console - should see "Update result - data: [...]" with actual data
5. Query database - `preparing_started_at` should now be set

## Still Having Issues?

### Debug Checklist:

- [ ] SQL migration has been run successfully
- [ ] New columns exist on `order_items` table (verified with Query 1)
- [ ] Old data has been cleaned up (if needed, verified with Query 2)
- [ ] Browser has been hard refreshed
- [ ] Created a new test order (not using an old one)
- [ ] Console shows "started preparing" notification
- [ ] Console shows "marked as ready" notification
- [ ] Console shows "Order item changed" real-time events

### What to Check:

1. **Menu Items Configuration**:
```sql
SELECT id, name, department
FROM menu_items
WHERE restaurant_id = '<your-restaurant-id>'
LIMIT 10;
```
Verify all items have `department` set to either 'kitchen' or 'bar'

2. **Current Order State**:
```sql
SELECT
  o.id,
  o.status,
  o.table_id,
  t.table_number
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
WHERE o.paid = false
  AND o.status != 'cancelled'
ORDER BY o.created_at DESC
LIMIT 5;
```
Check your unpaid orders

3. **Order Items State**:
```sql
SELECT
  oi.id,
  oi.order_id,
  mi.name,
  mi.department,
  oi.preparing_started_at,
  oi.marked_ready_at,
  oi.delivered_at
FROM order_items oi
JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE oi.order_id IN (
  SELECT id FROM orders
  WHERE paid = false
    AND status != 'cancelled'
)
ORDER BY oi.order_id, mi.department;
```
Check the actual timestamps on order items

## Files Changed

- ✅ [ADD_ITEM_LEVEL_DELIVERY_TRACKING_V3.sql](ADD_ITEM_LEVEL_DELIVERY_TRACKING_V3.sql) - SQL migration
- ✅ [src/app/dashboard/orders/page.js](src/app/dashboard/orders/page.js) - Department-specific buttons
- ✅ [src/app/dashboard/tables/page.js](src/app/dashboard/tables/page.js) - Badge display and real-time updates

## Quick Fix Commands

### Reset Everything to Clean State:
```sql
-- WARNING: This clears ALL delivery tracking data!
UPDATE order_items
SET
  preparing_started_at = NULL,
  marked_ready_at = NULL,
  delivered_at = NULL;

UPDATE orders
SET status = 'pending'
WHERE paid = false
  AND status IN ('preparing', 'ready');
```

### Check What's Currently "Ready":
```sql
SELECT
  t.table_number,
  mi.department,
  COUNT(*) as ready_items
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN tables t ON o.table_id = t.id
JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE oi.marked_ready_at IS NOT NULL
  AND oi.delivered_at IS NULL
  AND o.paid = false
GROUP BY t.table_number, mi.department
ORDER BY t.table_number, mi.department;
```

This shows which tables should have badges and for which departments.
