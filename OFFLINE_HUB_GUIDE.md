# Offline Hub — Technical Guide

A reference document for the offline hub feature built in Phase 2 of the offline resilience project.

---

## What it does

The Offline Hub allows orders to be placed by staff even when the venue has no internet, by routing them through a local WiFi network instead of going directly to Supabase.

**Normal (online) flow:**
```
Staff device → Supabase (cloud)
```

**Offline with hub configured:**
```
Staff device (spoke) → Hub device (local WiFi) → IndexedDB on hub → Supabase when internet returns
```

**Offline, hub unreachable:**
```
Staff device → own IndexedDB → Supabase when internet returns
```

There are three device roles:

| Role | Configuration | Behaviour |
|------|--------------|-----------|
| **Normal** | No hub config | Orders go to Supabase (online) or own local IDB (offline) |
| **Hub** | "This device is the Hub" ON | Receives orders from spoke devices over local WiFi; holds the queue; syncs to Supabase |
| **Spoke** | Hub IP address entered | When offline, POSTs orders to hub over WiFi; falls back to own local IDB if hub is unreachable |

---

## Files involved

### `src/lib/localHub.js`
The configuration module. All hub state is stored in `localStorage` so it is **device-local** — each device independently knows its own role.

| Export | What it does |
|--------|-------------|
| `isHubDevice()` | Returns `true` if `localStorage.menuhub_hub_mode === 'true'` |
| `getHubIp()` | Returns the hub IP string from `localStorage.menuhub_hub_ip`, or `null` |
| `setHubMode(enabled)` | Enables/disables hub mode; enabling it clears the hub IP (can't be both) |
| `setHubIp(ip)` | Saves the hub IP; clears hub mode flag |
| `getHubOrderUrl()` | Returns `http://<hubIp>/offline-hub/order` or `null` |
| `isHubConfigured()` | Returns `true` if this device is a spoke (hub IP set, hub mode off) |
| `pingHub()` | `fetch GET /offline-hub/ping` with 3s timeout — returns `true`/`false` |

**localStorage keys:**
- `menuhub_hub_mode` — `'true'` when this device is the hub
- `menuhub_hub_ip` — IP/hostname string of the hub (spoke devices only)

---

### `worker/index.js`
The service worker is extended to act as a **local HTTP server** for hub API requests. The `fetch` event handler checks if the URL pathname starts with `/offline-hub/` and short-circuits to `handleHubRequest()` before any Workbox caching logic runs.

**Routes handled:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/offline-hub/ping` | Liveness check — returns `{ ok: true, hub: true, ts: <timestamp> }` |
| `POST` | `/offline-hub/order` | Receives `{ orderData, orderItems }` from a spoke. Stores in hub IDB. Returns `{ ok: true, client_id }` |
| `GET` | `/offline-hub/orders` | Returns all records in the hub IDB store (diagnostic/debug only) |
| `OPTIONS` | `/offline-hub/*` | CORS preflight — allows cross-origin requests from spoke devices |

**Hub IndexedDB (separate from the main offline queue):**
- Database name: `menuhub-hub`
- Version: `1`
- Store: `hub_pending_orders`
  - `keyPath: 'client_id'`
  - Index: `received_at`
  - Index: `synced` (boolean)

Each record stored: `{ client_id, orderData, orderItems, received_at, synced: false, retry_count: 0 }`

> **Important:** The hub's IDB is separate from the main `menuhub-offline` IDB used by `offlineQueue.js`. This is intentional — the hub holds *other devices'* orders; the main IDB holds *this device's* own queued orders.

---

### `src/hooks/useOfflineOrder.js`
The `placeOrder` function has three priority levels:

```
Priority 1   → Supabase directly (navigator.onLine)
Priority 1.5 → Hub device (isHubConfigured() && fetch to hubUrl with 5s timeout)
Priority 2   → Local IndexedDB (fallback)
```

The `via` field in the return value reflects which path was taken: `'supabase'`, `'hub'`, or `'indexeddb'`.

The hub fetch sends:
```json
POST http://<hubIp>/offline-hub/order
Content-Type: application/json

{
  "orderData": { ...all order fields including client_id },
  "orderItems": [ ...array of order items ]
}
```

If the hub returns a non-2xx status or the fetch times out, the code falls through to Priority 2 silently.

---

### `src/app/dashboard/settings/offline-hub/page.js` ← dedicated page
The settings page for the Offline Hub feature. It contains:

- **"This device is the Hub"** toggle — calls `setHubMode()`, stored in localStorage immediately
- **"Connect to a Hub"** IP input + Save/Clear buttons — calls `setHubIp()`
- **"Test connection"** ping button — calls `pingHub()`, shows green/red result inline
- **"How it works"** numbered steps section
- A note that settings are device-local (not saved to the database)

State:
- `hubMode` (boolean) — mirrors `isHubDevice()` from localStorage
- `hubIpInput` (string) — controlled input for the hub IP
- `hubPingStatus` (null | `'pinging'` | `'ok'` | `'fail'`)

Accessible at: `/dashboard/settings/offline-hub`

---

### `src/app/dashboard/settings/page.js`
The main settings grid. An **Offline Hub** tile was added pointing to `/dashboard/settings/offline-hub` with an indigo WiFi/signal icon.

---

### `src/components/PageTabsConfig.js`
The `settingsTabs` array (used for the horizontal tab bar on all settings sub-pages) now includes an `offlineHub` entry pointing to `/dashboard/settings/offline-hub`.

---

### `src/components/HubConnectionStatus.js`
Shown in the dashboard header (wired in `src/app/dashboard/layout.js` at the `<HubConnectionStatus restaurantId={restaurant.id} />` call).

| Device role | What's shown |
|-------------|-------------|
| Hub device | Purple "Hub" pill with WiFi icon |
| Spoke (hub IP configured) | Coloured dot: grey pulsing (checking) → green (reachable) → amber (unreachable) + label |
| Normal device | Nothing — component returns `null` |

The component pings the hub every **15 seconds** in spoke mode. It also listens for `storage` events so the badge updates immediately if the user changes hub settings in another tab.

---

## How to set it up in practice

### Step 1 — Designate the hub device
On the device that will act as the hub (ideally a tablet or device that stays on-site):
1. Go to **Settings → Offline Hub**
2. Toggle **"This device is the Hub"** ON
3. Note the device's local IP address (found in the device's WiFi settings — usually `192.168.x.x`)

### Step 2 — Configure spoke devices
On every other staff device that should relay through the hub:
1. Go to **Settings → Offline Hub**
2. Enter the hub device's IP address (e.g. `192.168.1.5`)
3. Tap **Save**, then **Test connection** to confirm it's reachable
4. The header will show a green "Hub" dot when connected

### Step 3 — Verify
- Take a device offline (disable WiFi on non-hub devices, or kill the router)
- Place a test order — it should be accepted without error
- When internet returns to the hub, orders sync automatically to Supabase

---

## Architecture decisions & trade-offs

**Why service worker as local server?**
The service worker intercepts all `fetch()` calls — including cross-origin calls to `http://<hubIp>/...`. By having the hub device's SW handle `/offline-hub/*` paths, it can respond to spoke fetch calls without any extra server process. No Node.js server, no native app, no extra port.

**Why localStorage for config?**
Hub configuration is entirely device-local. There's no value in storing it in Supabase — each device simply needs to know its own role. localStorage survives page refreshes and app installs.

**Why a separate `menuhub-hub` IDB?**
The main `menuhub-offline` IDB (used by `offlineQueue.js`) contains orders queued by *this device* for its own sync. The hub's IDB contains orders received *from other devices*. Keeping them separate avoids confusion in sync logic.

**Why HTTP not WebRTC/WebSockets?**
HTTP over local WiFi is the simplest and most reliable approach. It requires no pairing, no handshake, and works with a bare IP address. The spoke simply does a `fetch()` POST.

**What happens when the hub has no internet and receives orders?**
The hub stores them in its IDB. When internet is restored, `syncAllOrders()` (service worker) pushes all queued orders to Supabase — both the hub's own orders and relayed spoke orders.

---

## Known limitations

- The hub's service worker must be active (i.e. the app must have been opened on the hub device since the last SW update). If the hub device's browser is fully closed and the SW has been terminated by the OS, it cannot receive requests.
- HTTP (not HTTPS) is used for local hub communication since local IPs don't have TLS certificates. This is acceptable for a private local network.
- `AbortSignal.timeout()` requires a relatively modern browser (supported in all current iOS/Android/desktop browsers as of 2023+).
- Hub settings are in `localStorage` and will be lost if the user clears browser data.
- Hub-received orders are stored in their own IDB (`menuhub-hub`) and are currently synced by the service worker's `syncAllOrders()` function. If the hub device is online but the SW sync hasn't been triggered yet, there may be a short delay before they appear in Supabase.
