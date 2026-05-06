# Printer Management — Design Spec
**Date:** 2026-05-06  
**Scope:** PWA (Menu Hub Next.js app) + Veno Bridge companion app spec  
**Status:** Approved, ready for implementation

---

## Problem

The app already fires a `sendPrintJob()` call when a payment is completed (tables/page.js:2138), and the Veno Bridge already handles a single `print:receipt` message to one hardcoded printer IP. What is missing:

1. No printer management UI — venue managers cannot configure printers from the dashboard
2. Only one printer supported — no multi-printer routing
3. Only receipts on payment — no kitchen or bar tickets when orders are dispatched
4. No Bluetooth support — WiFi only, single IP

---

## Goals

- Venue manager can add/edit/delete printers from `/dashboard/settings/printers`
- Each printer is assigned one or more departments (drawn from the restaurant's live `department_permissions` list) plus a special `receipt` trigger (fires on payment)
- A single printer can cover multiple departments
- Connection type: WiFi (TCP/IP ESC-POS) or Bluetooth
- When an order is dispatched to a department, the matching printer receives a kitchen/bar ticket
- When a payment is completed, all printers assigned to `receipt` receive a bill
- The Bridge holds an offline copy of the printer config so it works without internet
- Print errors surface as a dashboard notification

---

## Architecture

### Data flow

```
Venue manager saves printer config
  → Supabase printers table (source of truth)
  → bridge:set_printers WebSocket message → Bridge SQLite printers table (offline copy)

Payment completed (tables/page.js)
  → printerRouter(printers, 'receipt') → matching printer IDs
  → sendPrintJob(payload, printer_id) per printer → Bridge → ESC/POS → thermal printer

Order dispatched to department (tables/page.js)
  → printerRouter(printers, departmentName) → matching printer IDs
  → sendDepartmentTicket(department, payload, printer_id) per printer → Bridge → ESC/POS → thermal printer
```

### Routing rule

The PWA resolves which printers handle which jobs. The Bridge is dumb — it receives a job with a `printer_id`, looks up the connection config for that ID, and sends bytes. No routing logic in the Bridge.

---

## PWA Changes

### 1. Database migration — `ADD_PRINTER_MULTI_DEPARTMENT.sql`
**Status: Already applied to Supabase.**

```sql
ALTER TABLE printers
  ADD COLUMN IF NOT EXISTS departments TEXT[],
  ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'wifi',
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS bt_address TEXT,
  ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 9100;

UPDATE printers
  SET departments = ARRAY[department]
  WHERE departments IS NULL AND department IS NOT NULL;
```

The old `department` (single text) and `cloudprnt_url` columns are kept untouched.

### 2. New page — `src/app/dashboard/settings/printers/page.js`

**Route:** `/dashboard/settings/printers`  
**Access:** owner and staff-admin only  
**Pattern:** follows the same structure as other settings pages (PageTabs, useRestaurant, useAdminSupabase, useCurrency, useTranslations)

**Behaviour:**
- On mount: fetch printers from Supabase `printers` table for this restaurant. Fetch department list from `department_permissions`.
- Display list of printer cards (name, department chips, connection type badge, IP or BT address, active toggle, edit/delete buttons)
- "Add printer" button opens an inline form (not a modal — consistent with other settings pages)
- Form fields:
  - Name (text, required)
  - Connection type: WiFi | Bluetooth (radio/toggle)
  - IP address (text, shown when WiFi selected)
  - Port (number, default 9100, shown when WiFi selected)
  - Bluetooth address (text, shown when Bluetooth selected)
  - Departments: multi-select checkboxes — one per `department_permissions` row + a special **"Receipt (on payment)"** option rendered at the top
  - Active (toggle, default true)
- On save: upsert to Supabase `printers` table, then call `setPrinters(allPrinters)` from `useVenoBridge` to push `bridge:set_printers`
- On delete: soft delete (set `is_active = false`) or hard delete — hard delete is fine since the Bridge will receive the updated list on next `bridge:set_printers`
- Bridge connection status indicator at the top of the page (reuse `isConnected` from `useVenoBridge`)

### 3. New lib — `src/lib/printerRouter.js`

```js
/**
 * Returns all active printers that should receive a job for the given trigger.
 * @param {Array} printers - full list from Supabase printers table
 * @param {string} trigger - 'receipt' | department name e.g. 'kitchen', 'bar'
 * @returns {Array} matching active printers
 */
export function getReceivingPrinters(printers, trigger) {
  return printers.filter(p =>
    p.is_active &&
    Array.isArray(p.departments) &&
    p.departments.includes(trigger)
  )
}
```

### 4. Updated hook — `src/hooks/useVenoBridge.js`

Add the following to the public API alongside the existing `sendPrintJob` / `sendOrderEvent`:

```js
// Push full printer config to Bridge (called after save in settings)
const setPrinters = useCallback((printers) =>
  send({ type: 'bridge:set_printers', payload: { printers } }), [send])

// Request current printer list from Bridge (called on settings page open)
const getPrinters = useCallback(() =>
  send({ type: 'bridge:get_printers' }), [send])

// Send a department order ticket (kitchen, bar, etc.)
const sendDepartmentTicket = useCallback((department, payload) =>
  send({ type: 'print:department_ticket', payload: { ...payload, department } }), [send])
```

Also handle incoming `bridge:printers` message in the live session `onmessage` handler — store in a `printerList` state value returned from the hook.

Updated return shape:
```js
return { isConnected, bridgeStatus, printerList, sendPrintJob, sendDepartmentTicket, setPrinters, getPrinters, sendOrderEvent, requestStatus }
```

### 5. Updated `src/app/dashboard/tables/page.js`

**Payment receipt (line ~2138) — update existing call:**
```js
const receiptPrinters = getReceivingPrinters(restaurantPrinters, 'receipt')
if (receiptPrinters.length > 0) {
  receiptPrinters.forEach(printer => sendPrintJob({ ...receiptPayload, printer_id: printer.id }))
} else {
  // No receipt printer configured — send without printer_id (Bridge uses default IP fallback)
  sendPrintJob(receiptPayload)
}
```

**Order dispatch to department — new trigger:**
Find where order items are marked as sent to kitchen/bar (the department dispatch event). After the Supabase update:
```js
const deptPrinters = getReceivingPrinters(restaurantPrinters, itemDepartment)
deptPrinters.forEach(printer =>
  sendDepartmentTicket(itemDepartment, {
    printer_id: printer.id,
    venue_name: restaurant.name,
    table_number: selectedTable?.table_number,
    items: itemsForDepartment,
    timestamp: new Date().toISOString(),
  })
)
```

**Printer list loading:**
Add a `restaurantPrinters` state, fetch from Supabase on mount alongside the existing data fetch:
```js
const { data: printers } = await supabase
  .from('printers')
  .select('*')
  .eq('restaurant_id', restaurant.id)
  .eq('is_active', true)
setRestaurantPrinters(printers || [])
```

### 6. Settings nav — `src/components/PageTabsConfig.js`

Add a Printers entry to `settingsTabs`:
```js
{ label: 'Printers', href: '/dashboard/settings/printers' }
```

---

## Veno Bridge Changes (separate session)

> **Hand this section to a new Claude session with the Veno Bridge repo open.**

### Context

The Bridge is a Tauri v2 app (Rust + embedded JS). It currently:
- Runs a WebSocket server on port 3355
- Has a single `printer_ip` key in its SQLite `config` table
- On receiving `print:receipt`, opens a TCP socket to `printer_ip:9100` and sends ESC/POS bytes

### What needs to change

#### 1. New SQLite table: `printers`

```sql
CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  departments TEXT NOT NULL,     -- JSON array string: '["kitchen","bar"]'
  connection_type TEXT NOT NULL, -- 'wifi' | 'bluetooth'
  ip_address TEXT,
  bt_address TEXT,
  port INTEGER DEFAULT 9100,
  is_active INTEGER DEFAULT 1
);
```

Run this migration on first launch if the table doesn't exist (check via `sqlite_master`).

#### 2. Handle `bridge:set_printers`

```json
{
  "type": "bridge:set_printers",
  "payload": {
    "printers": [ { "id": "...", "name": "...", "departments": ["kitchen"], "connection_type": "wifi", "ip_address": "192.168.1.50", "bt_address": null, "port": 9100, "is_active": true } ]
  }
}
```

Handler: DELETE all rows from `printers`, INSERT all printers from payload. Respond with `{ "type": "bridge:printers_saved" }`.

#### 3. Handle `bridge:get_printers`

SELECT all from `printers`. Respond with:
```json
{ "type": "bridge:printers", "payload": { "printers": [...] } }
```

#### 4. Update print job handlers

All three message types (`print:receipt`, `print:department_ticket`) now carry a `printer_id` field in their payload.

Handler flow:
1. Extract `printer_id` from payload
2. `SELECT * FROM printers WHERE id = ?`
3. If not found: fall back to `printer_ip` from `config` table (backwards compatibility)
4. If `connection_type = 'wifi'`: open TCP socket to `ip_address:port`, send ESC/POS bytes
5. If `connection_type = 'bluetooth'`: use `btleplug` to connect by `bt_address`, send via RFCOMM

#### 5. ESC/POS formatting

**Receipt (`print:receipt`):**
- Header: venue name (double width), "RECEIPT" label
- Table number if present
- Divider line
- Item list: name (left), qty × price (right)
- Divider
- Subtotal, tax label + amount, **TOTAL** (bold, double height)
- Footer text if present
- VAT number if present
- Timestamp
- 4× line feed + cut command

**Department ticket (`print:department_ticket`, field `department` in payload):**
- Header: department name in caps (double width)
- Table number (large)
- Timestamp
- Divider
- Item list: name + quantity only (no prices)
- 4× line feed + cut command

#### 6. Bluetooth support

Add `btleplug` to `Cargo.toml`:
```toml
btleplug = { version = "0.11", features = ["serde"] }
```

Flow for Bluetooth print:
1. Get `CentralManager` (platform BT adapter)
2. Scan for peripheral with address matching `bt_address` (5 second timeout)
3. Connect + discover services
4. Find the serial port service (SPP UUID: `00001101-0000-1000-8000-00805f9b34fb`) or the printer's write characteristic
5. Write ESC/POS bytes in chunks (MTU ~512 bytes)
6. Disconnect after write

Note: Most thermal printers use Classic Bluetooth RFCOMM (SPP profile), not BLE. On Linux, use `bluer` crate instead of `btleplug` for better RFCOMM support. On Android, Tauri's `tauri-plugin-bluetooth` or JNI bridge may be needed.

#### 7. Error feedback

On any print failure (TCP timeout, BT connection failure, ESC/POS write error), send back to the originating WebSocket client:
```json
{
  "type": "print:error",
  "payload": {
    "printer_id": "uuid",
    "printer_name": "Kitchen Printer",
    "message": "Connection refused — check printer IP and power"
  }
}
```

#### 8. Backwards compatibility

If `printer_id` is absent from a print job payload, fall back to the existing `printer_ip` from the `config` table. This ensures the existing PWA code (before this feature ships) continues to work.

---

## Testing Guide

### Without a physical printer (ESC/POS byte inspector)

On any Mac/Linux machine on the same network as the Bridge:

```bash
# Listen on port 9100 and dump raw bytes to a file
nc -l 9100 | xxd > /tmp/escpos_output.txt
```

Then set your printer IP in the Bridge to the IP of the machine running `nc`. When a print job fires, the ESC/POS bytes will be captured. You can inspect them against the [ESC/POS command reference](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/).

### PWA-only testing (no Bridge)

1. Open `/dashboard/settings/printers`, add a WiFi printer with IP `127.0.0.1`
2. The Bridge won't be connected so `isConnected` will be false — print calls will return `false` silently
3. Check the browser console: `sendPrintJob` / `sendDepartmentTicket` log the payload before sending — verify the right printers are being targeted for each job type

### End-to-end with Bridge running

1. Start the Bridge on a local machine
2. Add a printer in the dashboard pointing to a real thermal printer IP (or `nc` listener)
3. Process a test payment on the Tables page → receipt should print
4. Mark an order item as sent to kitchen → kitchen ticket should print
5. Check the dashboard notification area for any `print:error` messages

### Bluetooth testing

Pair the printer with the Bridge device at OS level first. Then add it in the dashboard with connection type Bluetooth and the device's MAC address. The Bridge will handle the rest.

---

## Files changed / created (PWA)

| File | Change |
|---|---|
| `ADD_PRINTER_MULTI_DEPARTMENT.sql` | New migration (already applied) |
| `src/app/dashboard/settings/printers/page.js` | New page |
| `src/lib/printerRouter.js` | New utility |
| `src/hooks/useVenoBridge.js` | Add `setPrinters`, `getPrinters`, `sendDepartmentTicket`, `printerList` state |
| `src/app/dashboard/tables/page.js` | Update receipt trigger, add department ticket trigger |
| `src/components/PageTabsConfig.js` | Add Printers tab to settings nav |
