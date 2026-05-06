# Printer Management — Build Reference

**Built:** 2026-05-06  
**Status:** Complete (PWA side). Bridge side implemented separately in the Veno Bridge repo.

---

## What Was Built

A full multi-printer management system for the VenoApp POS dashboard. Venue managers can configure any number of thermal printers from the Settings page, assign each one to one or more departments or to the payment receipt trigger, and the app automatically routes print jobs to the correct printer(s) over WiFi or Bluetooth via the Veno Bridge companion app.

**Three print triggers now exist:**
1. **Receipt** — fires when a table payment is completed (was already partially wired, now fully routed)
2. **Kitchen ticket** — fires when an order is submitted and contains items belonging to a kitchen department
3. **Bar ticket / any department ticket** — fires when an order contains items for that department

---

## Architecture

```
Venue manager configures printers
  → Saved to Supabase printers table (source of truth)
  → Pushed to Veno Bridge via bridge:set_printers WebSocket message (offline copy)

Payment completed (tables/page.js)
  → getReceivingPrinters(restaurantPrinters, 'receipt')
  → sendPrintJob({ ...receiptPayload, printer_id }) per matching printer
  → Bridge receives print:receipt, looks up printer by ID, sends ESC/POS bytes

Order submitted (tables/page.js → submitOrder)
  → items grouped by department
  → getReceivingPrinters(restaurantPrinters, dept) per department
  → sendDepartmentTicket(dept, { ...payload, printer_id }) per matching printer
  → Bridge receives print:department_ticket, routes to correct printer
```

The Bridge is "dumb" — it only receives a job with a `printer_id` and executes it. All routing logic lives in the PWA.

---

## Files Changed / Created

### New files

| File | Purpose |
|---|---|
| `src/lib/printerRouter.js` | Pure routing utility — given a printer list and a trigger, returns matching active printers |
| `src/app/dashboard/settings/printers/page.js` | Printers settings page — full CRUD UI |

### Modified files

| File | What changed |
|---|---|
| `src/hooks/useVenoBridge.js` | Added `sendDepartmentTicket`, `setPrinters`, `getPrinters`, `printerList` state, `bridge:printers` message handler |
| `src/components/PageTabsConfig.js` | Added Printers tab to `settingsTabs` |
| `src/app/dashboard/settings/page.js` | Added Printers tile to the settings hub grid |
| `src/app/dashboard/tables/page.js` | Imports `getReceivingPrinters`, loads `restaurantPrinters` on mount, routes receipt and department tickets |
| `messages/en.json` | Added `pageTabs.printers`, `settingsHub.printers`, `settingsHub.printersDesc` |

### Database migration

Run in Supabase SQL editor — **already applied**:

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

The original `department` (single text, NOT NULL) and `cloudprnt_url` columns were kept untouched to avoid breaking changes.

---

## Key Code — How It Works

### `src/lib/printerRouter.js`

```js
export function getReceivingPrinters(printers, trigger) {
  if (!Array.isArray(printers) || !trigger) return []
  return printers.filter(p =>
    p.is_active &&
    Array.isArray(p.departments) &&
    p.departments.includes(trigger)
  )
}
```

Called with `trigger = 'receipt'` for payment, or `trigger = 'kitchen'` / `'bar'` / any department name for order tickets. Returns an empty array if no printers match — the caller handles the fallback.

### `src/hooks/useVenoBridge.js` — new methods

```js
// Send a department order ticket (kitchen, bar, etc.)
sendDepartmentTicket(department, payload)
// → sends: { type: "print:department_ticket", payload: { ...payload, department } }

// Push full printer config to Bridge after saving in settings
setPrinters(printers)
// → sends: { type: "bridge:set_printers", payload: { printers } }

// Request current printer list from Bridge (called on settings page open)
getPrinters()
// → sends: { type: "bridge:get_printers" }
```

`printerList` state is populated when the Bridge responds with a `bridge:printers` message.

### `src/app/dashboard/tables/page.js` — receipt trigger (line ~2169)

```js
const receiptPrinters = getReceivingPrinters(restaurantPrinters, 'receipt')
if (receiptPrinters.length > 0) {
  receiptPrinters.forEach(printer => sendPrintJob({ ...receiptPayload, printer_id: printer.id }))
} else {
  sendPrintJob(receiptPayload)  // fallback: Bridge uses its default printer_ip
}
```

### `src/app/dashboard/tables/page.js` — department ticket trigger (line ~2904)

```js
if (restaurantPrinters.length > 0) {
  const itemsByDept = {}
  consolidatedItems.forEach(item => {
    const dept = item.department || item.menu_items?.department || 'kitchen'
    if (!itemsByDept[dept]) itemsByDept[dept] = []
    itemsByDept[dept].push(item)
  })
  Object.entries(itemsByDept).forEach(([dept, deptItems]) => {
    const deptPrinters = getReceivingPrinters(restaurantPrinters, dept)
    deptPrinters.forEach(printer => {
      sendDepartmentTicket(dept, {
        printer_id: printer.id,
        venue_name: restaurant?.name || '',
        table_number: selectedTable?.table_number?.toString() || null,
        items: deptItems.map(i => ({ name: i.name, quantity: i.quantity })),
        timestamp: new Date().toISOString(),
      })
    })
  })
}
```

---

## Supabase `printers` Table — Full Schema

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, auto-generated |
| `restaurant_id` | UUID | FK → restaurants |
| `name` | TEXT NOT NULL | Display name, e.g. "Kitchen Printer" |
| `department` | TEXT NOT NULL | Legacy column — kept for backwards compat. Set to `departments[0]` on save |
| `departments` | TEXT[] | Array of triggers: `['kitchen']`, `['receipt']`, `['kitchen','bar']`, etc. |
| `connection_type` | TEXT | `'wifi'` or `'bluetooth'` |
| `ip_address` | TEXT | WiFi only |
| `port` | INTEGER | WiFi only, default 9100 |
| `bt_address` | TEXT | Bluetooth only, MAC format `AA:BB:CC:DD:EE:FF` |
| `cloudprnt_url` | TEXT | Legacy CloudPRNT field, unused by this feature |
| `is_active` | BOOLEAN | Toggle from settings page |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Important:** `department` (singular, old column) has a NOT NULL constraint. The save payload always sets `department: form.departments[0]` to satisfy it. The actual routing uses only the `departments` array.

---

## Veno Bridge — WebSocket Protocol (for Bridge session reference)

The Bridge must handle these new message types. The PWA side is complete; the Bridge side was implemented in the Veno Bridge repo separately.

| Message | Direction | Payload |
|---|---|---|
| `print:receipt` | PWA → Bridge | `{ ...receiptFields, printer_id }` |
| `print:department_ticket` | PWA → Bridge | `{ printer_id, department, venue_name, table_number, items, timestamp }` |
| `bridge:set_printers` | PWA → Bridge | `{ printers: [...] }` — Bridge replaces its printers table |
| `bridge:get_printers` | PWA → Bridge | (no payload) |
| `bridge:printers` | Bridge → PWA | `{ printers: [...] }` |
| `print:error` | Bridge → PWA | `{ printer_id, printer_name, message }` |

When `printer_id` is present in a print job, the Bridge looks up the printer by ID, reads its `connection_type`, `ip_address`/`port` or `bt_address`, and routes accordingly. If `printer_id` is absent (old PWA code), it falls back to the `printer_ip` config key.

---

## Settings Page — `/dashboard/settings/printers`

- Owner and staff-admin only (`isOwnerOrAdmin` check)
- Wrapped in `OfflinePageGuard` (consistent with all other settings pages)
- Bridge connection status badge at top (green when Bridge is connected)
- Each printer card shows: name, connection badge (WiFi IP:port or Bluetooth MAC), department trigger chips, active/inactive toggle, edit and delete buttons
- Add/Edit form validates: name required, at least one trigger required, IP required for WiFi, BT address required for Bluetooth
- On save: upserts to Supabase, then pushes full updated list to Bridge via `setPrinters()`
- Toggle uses **optimistic update** — flips the local state immediately, then confirms with the DB response (avoids the loading flicker)
- Departments in the trigger selector are loaded dynamically from `department_permissions` table, so they always reflect the restaurant's actual configured departments

---

## Known Constraints & Gotchas

**`department` NOT NULL constraint**
The original `printers` table has `department TEXT NOT NULL`. The new `departments TEXT[]` column is the one actually used for routing, but every insert/update must also populate `department` with a non-null value. Currently set to `form.departments[0]`. If this ever causes confusion, the long-term fix is a Supabase migration to drop the NOT NULL constraint on the old column.

**Bridge must be running for print jobs to land**
`sendPrintJob` and `sendDepartmentTicket` return `false` silently when the Bridge WebSocket is not connected. No error is surfaced to staff in that case — the payment still goes through. If you want staff to be alerted when printing fails, add a notification on `sendPrintJob` returning `false`. For Bridge-side failures (e.g. printer unreachable), the Bridge sends `print:error` back — the PWA does not yet display that notification (future improvement).

**Department name on order items**
The department ticket grouping reads `item.department || item.menu_items?.department || 'kitchen'`. Menu items fetched via the `get_available_menu_items` RPC include `department`. If a menu item somehow lacks a department, it defaults to `'kitchen'` — so a kitchen printer will always catch it.

**Bluetooth on Bridge**
Bluetooth printing requires the printer to be paired at OS level on the Bridge device before the Bridge app can connect to it by MAC address. The Bridge handles the actual BT connection — the PWA only stores and transmits the MAC address.

**Offline behaviour**
`restaurantPrinters` is loaded from Supabase in `fetchData` during the online path only. When offline, `restaurantPrinters` will be empty (`[]`) and `getReceivingPrinters` will return no matches, so `sendPrintJob` falls back to the no-`printer_id` call. The Bridge then uses its cached `printer_ip` config. This is acceptable — printing while fully offline is a best-effort operation.

---

## Testing

### Without a physical printer

On any machine on the same network as the Bridge, listen on port 9100 to capture raw ESC/POS bytes:

```bash
nc -l 9100 | xxd > /tmp/escpos_output.txt
```

Set the printer IP in the dashboard to the IP of the machine running `nc`. Any print job fired will be captured.

### PWA routing only (no Bridge needed)

1. Add a test printer at `/dashboard/settings/printers` with IP `127.0.0.1`
2. Open browser DevTools → Network → WS tab
3. Process a payment or submit an order
4. Inspect the WebSocket frames — you should see `print:receipt` or `print:department_ticket` messages with the correct `printer_id`

### End-to-end

1. Start Veno Bridge on a local device
2. Ensure the PWA shows "Veno Bridge connected" on the Printers settings page
3. Add a real printer (WiFi, pointing to the actual printer IP)
4. Assign it to `Receipt (on payment)` and/or a department
5. Process a payment → receipt prints
6. Submit an order with kitchen items → kitchen ticket prints

---

## Commits

| Hash | Description |
|---|---|
| `55c96e5` | feat: add printerRouter utility |
| `10336e0` | feat: extend useVenoBridge with printer methods |
| `7b4231d` | feat: add Printers tab to settings nav |
| `aef864a` | feat: add Printers settings page |
| `6b3519f` | feat: wire printer routing in tables page |
| `3762b95` | fix: settings hub tile + legacy NOT NULL constraint |
| `f45fbec` | fix: optimistic toggle state |
| `ad81961` | fix: correct toggle button animation |
