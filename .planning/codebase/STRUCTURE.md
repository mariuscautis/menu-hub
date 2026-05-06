# Structure

## Directory Tree

```
/ (repo root)
├── src/
│   ├── app/                          # Next.js App Router — all routes
│   │   ├── layout.js                 # Root layout: ThemeProvider, metadata, PWA meta, GA
│   │   ├── globals.css               # Global CSS / Tailwind base
│   │   │
│   │   ├── dashboard/                # Authenticated dashboard (owner + staff)
│   │   │   ├── layout.js             # Dashboard shell: auth init, sidebar, providers, realtime badges
│   │   │   ├── page.js               # Overview (home) page
│   │   │   ├── analytics/            # Analytics section
│   │   │   │   ├── page.js           # Analytics landing
│   │   │   │   ├── overview/         # Revenue/sales overview charts
│   │   │   │   ├── tables/           # Table performance
│   │   │   │   ├── staff/            # Staff performance
│   │   │   │   ├── labor/            # Labor cost analytics
│   │   │   │   └── losses/           # Loss analytics (menu + stock sub-routes)
│   │   │   ├── cash-drawer/          # Cash drawer management
│   │   │   ├── customers/            # Customer list + trust scores
│   │   │   ├── floor-plan/           # Owner/admin interactive floor plan
│   │   │   ├── guide/                # Onboarding guide / checklist
│   │   │   ├── menu/                 # Menu management landing
│   │   │   │   ├── items/            # Menu items CRUD
│   │   │   │   └── categories/       # Menu categories CRUD
│   │   │   ├── my-availability/      # Staff: set availability
│   │   │   ├── my-rota/              # Staff: view own rota
│   │   │   ├── orders/               # Live orders (kitchen/bar view)
│   │   │   ├── report-loss/          # Staff: report stock loss
│   │   │   ├── reports/              # Reports landing
│   │   │   │   ├── fiscal-records/
│   │   │   │   ├── monthly/
│   │   │   │   ├── sales-balance/
│   │   │   │   ├── stock-movement/
│   │   │   │   ├── tax/
│   │   │   │   ├── weekly/
│   │   │   │   ├── x-report/
│   │   │   │   └── z-report/
│   │   │   ├── reservations/         # Reservation management
│   │   │   ├── rota/                 # Staff rota builder (owner/admin)
│   │   │   ├── settings/             # Settings landing
│   │   │   │   ├── billing/          # Stripe subscription management
│   │   │   │   ├── data-migration/
│   │   │   │   ├── departments/      # Department permissions
│   │   │   │   ├── discounts/        # Discounts + promotions
│   │   │   │   ├── offline-hub/      # Offline Hub config
│   │   │   │   ├── other-options/
│   │   │   │   ├── payments/         # Payment methods (Stripe Connect)
│   │   │   │   ├── product-tax/
│   │   │   │   ├── reservation-settings/
│   │   │   │   ├── restaurant-info/
│   │   │   │   ├── security/
│   │   │   │   ├── staff-leave/
│   │   │   │   └── tax-invoicing/
│   │   │   ├── staff/                # Staff & Rota landing (owner/admin)
│   │   │   ├── staff-members/        # Staff member list
│   │   │   ├── stock/                # Stock management landing
│   │   │   │   ├── inventory/
│   │   │   │   ├── products/
│   │   │   │   └── purchasing-invoices/
│   │   │   ├── support/              # In-app support tickets
│   │   │   ├── tables/               # Tables & QR codes
│   │   │   ├── tables-floor-plan/    # Staff-only floor plan view
│   │   │   └── time-off-requests/    # Staff time-off request management
│   │   │
│   │   ├── [restaurant]/             # Public guest-facing pages (slug param)
│   │   │   ├── book/                 # Reservation booking form
│   │   │   ├── menu/                 # Public QR menu
│   │   │   ├── reservation/          # Reservation status + cancel flow
│   │   │   │   └── cancel/[token]/
│   │   │   ├── table/[tableId]/      # Table ordering (scan QR at table)
│   │   │   └── takeaway/             # Takeaway ordering
│   │   │
│   │   ├── r/[slug]/                 # Per-restaurant short URLs
│   │   │   ├── auth/staff-login/     # Staff login page
│   │   │   └── install/              # PWA install prompt
│   │   │
│   │   ├── admin/                    # Platform superadmin panel
│   │   │   ├── admins/
│   │   │   ├── billing/
│   │   │   ├── categories/
│   │   │   ├── deleted-restaurants/
│   │   │   ├── restaurants/
│   │   │   ├── seo/
│   │   │   ├── settings/
│   │   │   └── support/
│   │   │
│   │   ├── auth/                     # Owner authentication flow
│   │   │   ├── callback/             # Supabase OAuth callback
│   │   │   ├── confirmation/
│   │   │   ├── forgot-password/
│   │   │   ├── login/
│   │   │   ├── onboarding/           # Post-registration restaurant setup
│   │   │   ├── pending/              # Awaiting approval
│   │   │   ├── register/
│   │   │   ├── register-full/
│   │   │   ├── register-interest/
│   │   │   ├── reset-password/
│   │   │   └── staff-login/          # Legacy staff login (redirects to /r/[slug])
│   │   │
│   │   ├── api/                      # Next.js Route Handlers (Edge runtime)
│   │   │   ├── admin/
│   │   │   │   ├── db-proxy/         # RLS-bypass proxy for impersonation writes
│   │   │   │   └── sms-billing/
│   │   │   ├── analytics/            # 10+ analytics aggregation endpoints
│   │   │   ├── billing/              # Stripe: checkout, portal, webhook, SMS addon
│   │   │   ├── bridge/               # Veno Bridge LAN printer integration
│   │   │   ├── customers/peer-ratings/
│   │   │   ├── export/               # CSV export (menu items, stock products)
│   │   │   ├── favicon/              # Dynamic per-restaurant favicon
│   │   │   ├── fiscal/record/        # Fiscal record submission
│   │   │   ├── icon/[size]/          # Dynamic PWA icons
│   │   │   ├── import/               # CSV import (menu items, stock products)
│   │   │   ├── invoices/             # PDF invoice generate + email
│   │   │   ├── manifest/[slug]/      # Dynamic PWA manifest per restaurant
│   │   │   ├── menu-items/           # Menu item operations
│   │   │   ├── notifications/        # Email notifications (recovery, registration)
│   │   │   ├── print-jobs/           # Print job queue
│   │   │   ├── printers/             # Printer configuration
│   │   │   ├── reservations/         # Full reservation lifecycle (15+ sub-routes)
│   │   │   ├── rota/                 # Rota: shifts, templates, attendance, requests, notify
│   │   │   ├── sessions/             # Staff session validate + invalidate
│   │   │   ├── staff/                # Staff login, password, magic link
│   │   │   ├── stock/                # Stock operations (inventory, products, invoices, losses)
│   │   │   ├── stripe-connect/       # Stripe Connect onboard + status
│   │   │   ├── support/              # Support tickets + messages
│   │   │   ├── takeaway/             # Takeaway order lifecycle
│   │   │   └── terminal/             # Stripe Terminal: create intent, process reader
│   │   │
│   │   └── (marketing pages)         # about, contact, cookies, help, home, pricing,
│   │                                 # privacy, services/*, terms
│   │
│   ├── components/                   # Shared UI components (flat + 2 subdirs)
│   │   ├── analytics/                # Chart + stat card components
│   │   ├── invoices/templates/       # PDF invoice template components
│   │   ├── ConnectedDevicesPanel.js
│   │   ├── GuideToggle.js
│   │   ├── HubConnectionStatus.js
│   │   ├── InactivityRing.js
│   │   ├── InfoTooltip.js
│   │   ├── LanguageSelector.js
│   │   ├── NotificationBell.js
│   │   ├── OfflineIndicator.js
│   │   ├── OfflinePageGuard.js
│   │   ├── PWAInstallButton.js / PWAInstallPrompt.js
│   │   ├── PageTabs.js / PageTabsConfig.js
│   │   ├── PlatformLogo.js
│   │   ├── ServiceInnerPage.js / ServicePageLayout.js
│   │   ├── SiteFooter.js
│   │   └── ThemeToggle.js
│   │
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAdminSupabase.js       # Supabase client (normal or impersonation proxy)
│   │   ├── useInactivityTimeout.js   # Auto-logout after inactivity for staff
│   │   ├── useModuleGuard.js         # Guard pages behind enabled_modules flags
│   │   ├── useOfflineOrder.js        # Offline order queue
│   │   ├── useOrderSounds.js         # Audio alerts for new orders
│   │   ├── useSessionValidator.js    # Periodic staff session validation
│   │   └── useVenoBridge.js          # LAN printer / Veno Bridge integration
│   │
│   └── lib/                          # Shared utilities and context providers
│       ├── supabase.js               # Supabase client singletons (anon + admin)
│       ├── RestaurantContext.js       # Restaurant + user type context
│       ├── CurrencyContext.js         # Currency formatting context
│       ├── GuideContext.js            # Guide/tooltip panel context
│       ├── ThemeContext.js            # Dark/light theme context
│       ├── i18n/LanguageContext.js    # i18n: LanguageProvider + useTranslations()
│       ├── clientTranslations.js      # Client-side translation loader
│       ├── currencyUtils.js           # Currency symbol map + formatting helpers
│       ├── email-translations.js      # Translations for email templates
│       ├── invoicePdfGenerator.js     # PDF invoice generation (client-side)
│       ├── localHub.js                # Veno Bridge LAN utilities
│       ├── magicLink.js               # Magic link auth utilities
│       ├── offlineQueue.js            # Offline write queue
│       ├── syncManager.js             # Offline queue flush on reconnect
│       ├── soundGenerator.js          # Audio alert generation
│       ├── usePlatformBranding.js     # Platform branding/white-label hook
│       ├── useSeoSettings.js          # SEO settings hook
│       ├── fiscal/                    # Fiscal printing adapters
│       │   └── adapters/
│       └── services/                  # Shared service utilities
│
├── messages/                          # i18n translation files
│   ├── en.json                        # Primary — always add new keys here first
│   ├── es.json
│   ├── fr.json
│   ├── it.json
│   └── ro.json
│
├── public/                            # Static assets + PWA service worker
│   └── fallback-*.js                  # Service worker offline fallback bundles
│
├── .planning/                         # GSD project management artifacts
│   ├── codebase/                      # Codebase analysis (this directory)
│   └── (phases, research, etc.)
│
├── menu-hub/                          # BUILD ARTIFACTS ONLY — do not edit
│   └── (.next/, .vercel/, node_modules/)
│
├── _src/                              # DISABLED stale copy — ignore entirely
├── _messages/                         # DISABLED stale copy — ignore entirely
│
├── next.config.js
├── package.json
├── tailwind.config.js
└── *.sql                              # Database migration files (run in Supabase SQL editor)
```

---

## Where to Add Things

### New dashboard page
1. Create `src/app/dashboard/<page-name>/page.js`
2. Add `'use client'` at top
3. Use `useRestaurant()` to get restaurant/user context; wait for `restaurantCtx?.restaurant` before fetching
4. Use `useAdminSupabase()` for all Supabase queries
5. Add a nav item in the `getNavItems()` function in `src/app/dashboard/layout.js`
6. Add translation keys to `messages/en.json` (and other language files)

### New API route
1. Create `src/app/api/<route-name>/route.js`
2. Add `export const runtime = 'edge'` at the top
3. Instantiate Supabase locally: `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })`
4. Export named handler functions: `export async function GET(request)`, `POST`, etc.
5. Return `NextResponse.json(...)` with appropriate status codes

### New shared component
1. Create `src/components/ComponentName.js`
2. Add `'use client'` if it uses hooks or browser APIs
3. Use Tailwind with `dark:` variants; primary brand colour is `#6262bd`

### New hook
1. Create `src/hooks/useHookName.js`
2. Add `'use client'` at top
3. Follow existing patterns — use `useRestaurant()` and `useAdminSupabase()` as needed

### New context / lib utility
1. Create `src/lib/UtilityName.js`
2. If it's a React context, export `Provider` + `useX()` hook pattern (see `RestaurantContext.js` as the simplest example)
3. Add the provider to `src/app/dashboard/layout.js` if it's dashboard-scoped, or `src/app/layout.js` for app-wide

### New translation keys
1. Add to `messages/en.json` under the appropriate namespace
2. Mirror the key (with translated value) in `es.json`, `fr.json`, `it.json`, `ro.json`
3. Access with `const t = useTranslations('namespace')` then `t('key')`

### New SQL migration
1. Create `<MIGRATION_NAME>.sql` at the repo root
2. Run it manually in the Supabase SQL editor
3. Note: new FK columns won't be auto-recognised by Supabase joins in JS — query via JS from already-fetched state

---

## File Naming Conventions

| Pattern | Convention |
|---|---|
| Pages | `page.js` (Next.js App Router convention) |
| Layouts | `layout.js` |
| API routes | `route.js` |
| Components | `PascalCase.js` |
| Hooks | `useCamelCase.js` |
| Lib utilities | `camelCase.js` or `PascalCase.js` for contexts |
| SQL migrations | `ALL_CAPS_WITH_UNDERSCORES.sql` |
| Translation files | `messages/<lang-code>.json` (2-letter ISO) |

---

## Special Directories

| Directory | Status | Notes |
|---|---|---|
| `menu-hub/` | Build artifacts only | Contains `.next/`, `.vercel/`, `node_modules/`. Never edit. |
| `_src/` | Disabled / stale | Renamed copy of old source. Ignore entirely. |
| `_messages/` | Disabled / stale | Renamed copy of old messages. Ignore entirely. |
| `.planning/` | Project management | GSD artifacts: plans, research, codebase docs. Not deployed. |
| `public/` | Static assets | PWA service worker fallback bundles live here. |
