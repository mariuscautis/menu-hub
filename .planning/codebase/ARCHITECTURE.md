# Architecture

## Overall Pattern

**Next.js 14+ App Router** — all pages and layouts are under `src/app/`. The project is **almost entirely client-side rendered**: virtually every page and the main layouts carry `'use client'`. Server Components and React Server Components (RSC) are not used in the dashboard; the architecture leans on client components that call Supabase directly or hit Next.js API routes.

**PWA-capable** — includes a Service Worker, cache-warming logic, and offline-first Supabase reads.

---

## Layers

### 1. App Routes (`src/app/`)
Four route families:
| Family | Description |
|---|---|
| `src/app/dashboard/` | Authenticated restaurant-owner / staff dashboard |
| `src/app/[restaurant]/` | Public-facing guest pages (menu, book, table ordering, takeaway) |
| `src/app/auth/` | Owner auth flow (login, register, onboarding, password reset) |
| `src/app/admin/` | Platform superadmin panel (admins, billing, restaurants) |
| `src/app/r/[slug]/` | Per-restaurant short URLs used for staff login and PWA install |
| `src/app/(public)` | Marketing pages (home, pricing, services, about, contact, etc.) |

### 2. API Routes (`src/app/api/`)
Standard Next.js Route Handlers (`route.js`). All use the **Edge runtime** (`export const runtime = 'edge'`). They instantiate `supabaseAdmin` locally using the service-role key — they do NOT import the shared `supabaseAdmin` singleton (which throws on the client). Groups:
- `billing/` — Stripe checkout, portal, webhooks, SMS add-on
- `reservations/` — create, confirm, cancel, OTP, notifications
- `analytics/` — all analytics aggregations
- `rota/` — shifts, attendance, notifications
- `stock/` — inventory, products, purchasing invoices
- `staff/` — login, password, magic link
- `sessions/` — staff session validation and management
- `terminal/` — Stripe Terminal (card reader) payment intents
- `stripe-connect/` — Stripe Connect onboarding and status
- `invoices/` — PDF generation and email delivery
- `support/` — ticket + message CRUD
- `bridge/` — Veno Bridge (LAN printer) integration
- `admin/db-proxy` — RLS-bypass proxy for impersonating platform admins

### 3. Lib / Context (`src/lib/`)
Shared singletons and context providers:

| File | Role |
|---|---|
| `supabase.js` | Two lazy-initialized Supabase clients. `supabase` (client-side) wraps `fetch` with an offline-caching layer (localStorage, 7-day TTL). `supabaseAdmin` (server-only) uses the service role key. Both are exported as `Proxy` objects to defer initialization. |
| `RestaurantContext.js` | Thin React context. `RestaurantProvider` wraps the dashboard `<main>`. Value shape: `{ restaurant, userType, staffDepartment, departmentPermissions, isPlatformAdmin, enabledModules }`. Consumed via `useRestaurant()`. |
| `CurrencyContext.js` | Provides `{ currency, currencySymbol, formatCurrency }`. Currency is derived from `restaurant.invoice_settings.currency`. Consumed via `useCurrency()`. |
| `GuideContext.js` | Controls guide/tooltip panel visibility. |
| `ThemeContext.js` | Dark/light mode toggle, persisted to localStorage. Wraps the root layout. |
| `i18n/LanguageContext.js` | `LanguageProvider` + `useTranslations(namespace)`. Returns a `t(key)` function; missing keys return the key string (never throws). |
| `syncManager.js` | Offline queue flush — replays queued write operations when coming back online. Called from dashboard layout via `initAutoSync()`. |
| `offlineQueue.js` | Enqueues write operations for offline deferral. |
| `localHub.js` | Veno Bridge LAN communication utilities. |
| `fiscal/` | Fiscal record adapter layer (country-specific fiscal printing). |
| `services/` | Shared service utilities. |

### 4. Hooks (`src/hooks/`)

| Hook | Role |
|---|---|
| `useAdminSupabase()` | Returns either the standard `supabase` client OR a proxy client that routes all writes through `/api/admin/db-proxy` (for platform admins impersonating a restaurant). Reads always use the normal client. |
| `useSessionValidator` | Polls `/api/sessions/validate` every 30s for staff users. On failure, clears localStorage and redirects to the staff login page. |
| `useInactivityTimeout` | Times out staff sessions after configurable inactivity; drives the `InactivityRing` UI. |
| `useModuleGuard` | Guards pages behind `restaurant.enabled_modules` flags. |
| `useOfflineOrder` | Manages offline order creation and localStorage queue. |
| `useOrderSounds` | Plays notification sounds on new orders. |
| `useVenoBridge` | Connects to the Veno Bridge companion app over LAN for print jobs. |

### 5. Components (`src/components/`)
Flat directory of shared UI components plus two subdirs:
- `analytics/` — chart and stat card components for analytics pages
- `invoices/templates/` — PDF invoice template components (used by `invoicePdfGenerator.js`)

Notable shared components: `NotificationBell`, `ThemeToggle`, `GuideToggle`, `OfflineIndicator`, `HubConnectionStatus`, `InactivityRing`, `LanguageSelector`, `PlatformLogo`, `InfoTooltip`, `PWAInstallButton`, `PageTabs`.

---

## Data Flow: Supabase to UI

```
Dashboard Layout (client component)
  │
  ├── On mount: reads localStorage 'staff_session' OR calls supabase.auth.getUser()
  ├── Fetches restaurant row from 'restaurants' table
  ├── Resolves userType: 'owner' | 'staff-admin' | 'staff'
  ├── Fetches departmentPermissions from 'department_permissions'
  │
  └── Passes restaurantContextValue into <RestaurantProvider>
        │
        └── Dashboard page (child component)
              │
              ├── useRestaurant()  → { restaurant, userType, ... }
              ├── useAdminSupabase() → supabase client (or proxy for admins)
              ├── useCurrency()    → { formatCurrency, currencySymbol }
              ├── useTranslations('namespace') → t('key')
              │
              └── Direct supabase queries in useEffect / event handlers
                    │
                    └── Supabase REST API (with offline localStorage cache)
```

**Realtime**: The dashboard layout subscribes to `postgres_changes` channels for live badge counts (reservations, orders, support messages). Individual pages set up their own realtime subscriptions where needed.

**API Routes**: Used for operations that require the service-role key (bypass RLS), external service calls (Stripe, Brevo email, Twilio SMS), or server-side PDF generation. Client components call these via `fetch('/api/...')`.

---

## Auth Flow

### Owner Auth (Supabase Auth)
1. `/auth/login` — email + password via `supabase.auth.signInWithPassword()`
2. Dashboard layout calls `supabase.auth.getUser()` on mount (8-second timeout)
3. Checks `admins` table (platform admin), `restaurants` table (owner), then `staff` table (staff user)
4. Redirects: no user → `/auth/login`; no restaurant → `/auth/onboarding`; pending staff → `/auth/pending`

### Staff Auth (Custom Session)
1. Staff logs in at `/r/[slug]/auth/staff-login` via `/api/staff/login`
2. API validates credentials, creates a session row in `sessions` table, returns a `session_token` + `device_id`
3. Layout reads `localStorage.staff_session` on mount (bypasses Supabase Auth entirely)
4. `useSessionValidator` periodically calls `/api/sessions/validate` to detect remote revocation
5. Logout: clears `staff_session` + `session_token` from localStorage, calls `/api/sessions/validate` with `action: 'logout'`, redirects to staff login URL

### Platform Admin Impersonation
1. Admin navigates to `/admin/restaurants`, clicks "Impersonate"
2. `sessionStorage.impersonation_session` is set with `{ restaurantId, restaurantName }`
3. Dashboard layout detects this and sets `isImpersonating = true`, loading the target restaurant
4. `useAdminSupabase()` routes writes through `/api/admin/db-proxy` (service role key)
5. Impersonation banner shown; "Return to Admin" button clears `sessionStorage` and redirects

---

## Error Handling Strategy

- **Loading timeouts**: Dashboard layout sets a 10-second safety timer; if auth/init hangs, `loading` is forced false
- **Auth timeout**: `supabase.auth.getUser()` wrapped in `Promise.race` with an 8-second timeout
- **Offline / network**: Supabase reads fall back to localStorage cache (7-day TTL). `navigator.onLine` and a periodic 15-second HTTP probe (`HEAD /api/manifest`) drive the offline banner UI
- **API routes**: Return `{ success: false, error: 'message' }` with appropriate HTTP status codes; no global error boundary
- **Context errors**: `useCurrency()` throws if used outside provider; other context hooks (`useRestaurant`, `useTranslations`) return `null` or the key string gracefully
- **Offline writes**: Failed mutations are enqueued in `offlineQueue.js` and replayed by `syncManager.js` when connectivity is restored
- **Department permissions**: If the DB call fails (offline), falls back to `localStorage` cached permissions
