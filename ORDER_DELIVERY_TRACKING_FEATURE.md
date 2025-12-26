# Order Delivery Tracking Feature

## Overview
Tracks the complete lifecycle of orders from creation to delivery, capturing preparation time, delivery time, and waiter response time. Provides actionable analytics for restaurant managers to optimize kitchen efficiency and service quality.

## Features Implemented

### 1. **Order Delivery Workflow**
- **"Order Ready!" Badge**: Appears on table cards when orders status = 'ready'
- **Click to Deliver**: Clicking the badge marks order as delivered and tracks delivery timestamp
- **Automatic Timestamping**: System automatically captures:
  - `created_at`: When order was placed
  - `marked_ready_at`: When kitchen/bar marked order as ready
  - `delivered_at`: When waiter delivered order to table

### 2. **Real-time Notifications**
- **Pulsing Green Badge**: Highly visible indicator on table card when order is ready
- **Positioned Bottom-Center**: Easy to spot without blocking other badges
- **Auto-Updates**: Badge appears/disappears in real-time as orders change status
- **Success Notification**: Toast confirms delivery with count (e.g., "2 orders marked as delivered to Table 5!")

### 3. **Delivery Analytics**
- **Preparation Time**: Time from order placed to marked ready
- **Waiter Response Time**: Time from marked ready to delivered
- **Total Delivery Time**: Time from order placed to delivered
- **Performance Metrics**: Average, median, fastest, slowest delivery times

## Database Schema Changes

### New Columns Added to `orders` Table

```sql
-- Timestamps
marked_ready_at TIMESTAMPTZ           -- When status changed to 'ready'
delivered_at TIMESTAMPTZ              -- When waiter delivered order to table

-- Computed Columns (auto-calculated)
preparation_duration_minutes INTEGER  -- Minutes from created_at to marked_ready_at
delivery_duration_minutes INTEGER     -- Minutes from created_at to delivered_at
```

### Trigger: Auto-Update marked_ready_at
```sql
-- Automatically sets marked_ready_at when status changes to 'ready'
CREATE TRIGGER trigger_update_order_ready_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_ready_timestamp();
```

### Analytics View
```sql
CREATE VIEW order_delivery_analytics AS
SELECT
  o.id,
  o.restaurant_id,
  o.table_id,
  t.table_number,
  o.created_at AS order_time,
  o.marked_ready_at,
  o.delivered_at,
  o.preparation_duration_minutes,
  o.delivery_duration_minutes,
  -- Waiter response time (ready to delivered)
  CASE
    WHEN delivered_at IS NOT NULL AND marked_ready_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (delivered_at - marked_ready_at)) / 60
    ELSE NULL
  END AS waiter_response_minutes
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
WHERE o.status != 'cancelled';
```

## API Endpoint

### GET `/api/analytics/delivery-performance`

**Query Parameters:**
- `restaurant_id` (required): Restaurant ID
- `start_date` (optional): Filter orders from this date
- `end_date` (optional): Filter orders to this date

**Response:**
```json
{
  "totalOrders": 245,
  "averageDeliveryTime": 18.5,
  "medianDeliveryTime": 16.0,
  "averagePreparationTime": 12.3,
  "medianPreparationTime": 11.0,
  "averageWaiterResponseTime": 6.2,
  "medianWaiterResponseTime": 5.0,
  "fastestDelivery": 8.5,
  "slowestDelivery": 35.2,
  "recentOrders": [
    {
      "id": "order-uuid",
      "tableNumber": 5,
      "total": 45.50,
      "orderTime": "2024-01-15T18:30:00Z",
      "deliveryMinutes": 15.5,
      "preparationMinutes": 10.2,
      "waiterResponseMinutes": 5.3
    }
    // ... up to 10 recent orders
  ]
}
```

## User Workflow

### Kitchen/Bar Staff (Orders Tab)
1. See incoming order (status: "pending", amber badge)
2. Click **"Start Preparing"** → status changes to "preparing" (blue badge)
3. Prepare food/drinks
4. Click **"Mark Ready"** → status changes to "ready" (green badge)
5. System automatically sets `marked_ready_at` timestamp

### Waiters (Tables Tab)
1. See **pulsing green "ORDER READY!"** badge on table card
2. Click badge to mark as delivered
3. System:
   - Sets `delivered_at` timestamp
   - Calculates all duration metrics
   - Removes badge from table card
   - Shows success notification
4. Collect order from kitchen/bar and deliver to table

### Restaurant Managers (Analytics Dashboard)
1. Navigate to Analytics → Delivery Performance
2. View key metrics:
   - Average delivery time
   - Preparation time trends
   - Waiter response efficiency
   - Slowest/fastest deliveries
3. Filter by date range for specific periods
4. Identify bottlenecks and optimization opportunities

## Code Changes

### Files Modified

#### `/src/app/dashboard/tables/page.js`
**New Function: `markOrderDelivered`** (lines 726-763)
- Finds all 'ready' orders for table
- Updates `delivered_at` timestamp
- Refreshes table order info
- Shows success notification

**Updated Function: `fetchTableOrderInfo`** (lines 340-368)
- Added `hasReadyOrders` flag to track tables with ready orders
- Used to show/hide "Order Ready!" badge

**Updated Component: `TableCard`** (line 2339)
- Added `onMarkDelivered` prop
- Changed badge click handler from `onViewOrders` to `onMarkDelivered`
- Updated tooltip text to reflect delivery action

#### Files Created

##### `/src/app/api/analytics/delivery-performance/route.js`
- New API endpoint for delivery performance analytics
- Calculates average, median, min, max delivery times
- Breaks down into preparation time vs waiter response time
- Returns recent orders with detailed timing breakdown

##### `/ADD_ORDER_DELIVERY_TRACKING.sql`
- SQL migration to add delivery tracking columns
- Creates trigger for auto-updating `marked_ready_at`
- Creates analytics view for easy querying
- Adds indexes for performance

## Benefits

✅ **Data-Driven Decisions**: Managers see exactly how long orders take
✅ **Identify Bottlenecks**: Separate kitchen prep time from waiter delivery time
✅ **Improve Customer Experience**: Track and reduce wait times
✅ **Staff Accountability**: Measure waiter response times
✅ **Performance Trends**: See improvement over time with historical data
✅ **Simple Workflow**: One-click delivery tracking for waiters
✅ **Real-time Visibility**: Badge appears immediately when order is ready

## Analytics Use Cases

### 1. Kitchen Performance
- **Question**: Is the kitchen keeping up during peak hours?
- **Metric**: Average preparation time
- **Action**: If >15 mins, consider adding kitchen staff or simplifying menu

### 2. Waiter Efficiency
- **Question**: Are waiters responding quickly to ready orders?
- **Metric**: Average waiter response time
- **Action**: If >7 mins, retrain staff on monitoring or add more wait staff

### 3. Overall Service Quality
- **Question**: What's our total order-to-table time?
- **Metric**: Average delivery time
- **Action**: Set target (e.g., <20 mins) and track improvement

### 4. Peak Hour Analysis
- **Question**: When do delivery times spike?
- **Metric**: Delivery times grouped by hour
- **Action**: Adjust staffing schedules to match demand

## Future Enhancements (Optional)

- **Real-time Dashboard**: Live view of current order preparation times
- **Alerts**: Notify manager if order exceeds target time (e.g., >25 mins)
- **Staff Leaderboard**: Gamify fastest delivery times
- **Customer Notifications**: SMS/app notification when order is ready
- **Table Comparison**: Which tables get fastest service?
- **Menu Item Analysis**: Which dishes take longest to prepare?
- **Integration with POS**: Auto-mark delivered when payment processed

## Testing Steps

### Before Running SQL Migration
The SQL file needs to be run on your Supabase database to add the new columns.

### Testing the Workflow
1. **Place Order**: Create order from table (status: pending)
2. **Start Preparing**: Kitchen staff clicks "Start Preparing" (status: preparing)
3. **Mark Ready**: Kitchen staff clicks "Mark Ready" (status: ready, `marked_ready_at` set)
4. **Verify Badge**: Check Tables tab - green "ORDER READY!" badge should appear
5. **Click Badge**: Waiter clicks badge on table card
6. **Verify Delivery**:
   - Success toast appears
   - Badge disappears from table
   - Check database: `delivered_at` is set
7. **Check Analytics**: Call `/api/analytics/delivery-performance?restaurant_id=xxx`
8. **Verify Metrics**: Delivery times calculated correctly

## SQL Migration Instructions

1. Open Supabase SQL Editor
2. Copy contents of `ADD_ORDER_DELIVERY_TRACKING.sql`
3. Paste and run the SQL
4. Verify success messages appear
5. Check that new columns exist in `orders` table
6. Test trigger by manually updating order status to 'ready'
7. Verify `marked_ready_at` is auto-populated

## Performance Considerations

- **Indexes Added**: `delivered_at` and `marked_ready_at` for fast analytics queries
- **Computed Columns**: Duration calculations stored as integers for query efficiency
- **View Created**: `order_delivery_analytics` pre-joins tables for faster reporting
- **Minimal Impact**: Only updates `delivered_at` when badge clicked (not on every status change)

## Compatibility

- ✅ Works with existing order workflow
- ✅ Backwards compatible (existing orders work fine with null timestamps)
- ✅ No breaking changes to current features
- ✅ Real-time subscriptions automatically pick up changes
