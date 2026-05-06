# INTEGRATIONS.md — Menu Hub External Services

## 1. Supabase
**Purpose:** Primary database (PostgreSQL), authentication, real-time subscriptions, file storage.

**Client setup:** `src/lib/supabase.js`
- Public client (`supabase`) — uses anon key, wraps `fetch` with a 7-day offline localStorage cache for GET/RPC reads
- Admin client (`supabaseAdmin`) — uses service role key, server-only (throws if called client-side)
- Dashboard pages use the `useAdminSupabase()` hook (`src/hooks/useAdminSupabase.js`) rather than importing the raw client

**Auth approach:** Supabase Auth (magic links via `src/lib/magicLink.js`, OTP for reservations)

**Storage:** Supabase Storage — restaurant logos, staff avatars, menu images. Cached by service worker for 30 days.

**Env vars:**
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Row-level-security anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS — server-only admin operations |

---

## 2. Stripe
**Purpose:** Subscription billing, Stripe Connect (restaurant payouts), Stripe Terminal (physical card readers), reservation no-show fees.

**Env vars:**
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe.js |
| `STRIPE_SECRET_KEY` | Server-side Stripe API calls |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures |
| `STRIPE_PRICE_ORDERS_MONTHLY` | Price ID — Orders plan |
| `STRIPE_PRICE_BOOKINGS_MONTHLY` | Price ID — Bookings plan |
| `STRIPE_PRICE_TEAM_MONTHLY` | Price ID — Team plan |

**Webhook endpoints:**
- `src/app/api/billing/webhook/route.js` — subscription lifecycle events

**API routes:**
| Route | Purpose |
|---|---|
| `src/app/api/billing/create-checkout/route.js` | Create Stripe Checkout session |
| `src/app/api/billing/portal/route.js` | Customer billing portal |
| `src/app/api/billing/sms-addon/route.js` | SMS add-on billing |
| `src/app/api/stripe-connect/onboard/route.js` | Stripe Connect onboarding |
| `src/app/api/stripe-connect/status/route.js` | Check Connect account status |
| `src/app/api/terminal/create-payment-intent/route.js` | Terminal payment intent |
| `src/app/api/terminal/process-reader/route.js` | Process card reader |
| `src/app/api/terminal/list-readers/route.js` | List registered readers |
| `src/app/api/terminal/cancel-action/route.js` | Cancel terminal action |
| `src/app/api/reservations/create-fee-payment-intent/route.js` | Reservation no-show fee intent |
| `src/app/api/reservations/complete-with-fee/route.js` | Complete reservation with fee charge |

---

## 3. Brevo (formerly Sendinblue)
**Purpose:** Transactional email and SMS.

**Client setup:**
- `src/lib/services/email.js` — Node.js runtime (server routes)
- `src/lib/services/email-edge.js` — Cloudflare Edge runtime, proxies through Cloudflare Worker at `https://email-proxy.marius-cautis.workers.dev`
- `src/lib/services/sms.js` — SMS via Brevo TransactionalSMS API

**Env vars:**
| Var | Purpose |
|---|---|
| `BREVO_API_KEY` | Brevo API authentication |
| `BREVO_SMS_SENDER` | Sender name for outgoing SMS |
| `EMAIL_FROM` | Default sender email address |
| `EMAIL_FROM_NAME` | Default sender display name |

**Usage:** Reservation confirmations, magic links, invoice emails, staff notifications, OTP SMS.

---

## 4. Resend
**Purpose:** Secondary email delivery (used in specific routes alongside Brevo).

**Env vars:**
| Var | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API authentication |

**Usage:** `src/app/api/invoices/email/route.js`, `src/app/api/staff/send-magic-link/route.js`, reservation booking confirmations (`src/app/[restaurant]/book/page.js`), auth confirmation (`src/app/auth/confirmation/page.js`)

---

## 5. Cloudflare Turnstile
**Purpose:** Bot protection on public-facing forms (contact, booking).

**Env vars:**
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client-side widget key (public) |
| `TURNSTILE_SECRET_KEY` | Server-side token verification |

**Usage:** `src/app/api/contact/route.js`, `src/app/contact/page.js`, `src/app/[restaurant]/book/page.js`

---

## 6. Cloudflare Workers (Email Proxy)
**Purpose:** Edge-compatible email dispatch. The Cloudflare Worker securely stores the Brevo API key so it is never exposed in the Next.js edge runtime.

**Worker URL:** `https://email-proxy.marius-cautis.workers.dev`

No env var needed in the app — the worker URL is hardcoded in `src/lib/services/email-edge.js`.

---

## 7. Fiscal Compliance Adapters
**Purpose:** Country-specific fiscal receipt signing/transmission (DE, IT, FR, BR, US sales tax).

**Setup:** `src/lib/fiscal/` — TypeScript module with pluggable adapters per ISO country code.

**API route:** `src/app/api/fiscal/record/` — records fiscal transactions server-side.

Uses the `pg` package for direct PostgreSQL access in fiscal routes.

---

## 8. Veno Bridge (Companion App)
**Purpose:** LAN printing and offline sync via a local Tauri v2 companion app.

**Hook:** `src/hooks/useVenoBridge.js` — communicates with the local Bridge over LAN.

**API routes:** `src/app/api/bridge/` — relay endpoints for Bridge connectivity and print jobs.

---

## 9. Authentication Summary
| Mechanism | Used for |
|---|---|
| Supabase Auth (email magic link) | Restaurant owner / staff login |
| Supabase Auth (OTP via SMS) | Reservation verification |
| Stripe Auth (Connect OAuth) | Restaurant payout account setup |
| Session validation | `src/hooks/useSessionValidator.js` — auto-logout on inactivity |

---

## 10. Hosting / Deployment
| Layer | Platform |
|---|---|
| Next.js app | **Cloudflare Pages** (`@cloudflare/next-on-pages` adapter) |
| Email proxy | **Cloudflare Workers** (`email-proxy.marius-cautis.workers.dev`) |
| Database + Auth + Storage | **Supabase** (hosted) |

---

## All Env Vars Reference
| Var | Scope | Service |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Stripe |
| `STRIPE_SECRET_KEY` | Server | Stripe |
| `STRIPE_WEBHOOK_SECRET` | Server | Stripe |
| `STRIPE_PRICE_ORDERS_MONTHLY` | Server | Stripe |
| `STRIPE_PRICE_BOOKINGS_MONTHLY` | Server | Stripe |
| `STRIPE_PRICE_TEAM_MONTHLY` | Server | Stripe |
| `BREVO_API_KEY` | Server | Brevo |
| `BREVO_SMS_SENDER` | Server | Brevo |
| `EMAIL_FROM` | Server | Brevo / Resend |
| `EMAIL_FROM_NAME` | Server | Brevo / Resend |
| `RESEND_API_KEY` | Server | Resend |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Cloudflare Turnstile |
| `TURNSTILE_SECRET_KEY` | Server | Cloudflare Turnstile |
| `NEXT_PUBLIC_APP_URL` | Public | App base URL |
| `NEXT_PUBLIC_BASE_URL` | Public | App base URL (alt) |
| `OTP_SECRET` | Server | Reservation OTP signing |
| `CRON_SECRET` | Server | Cron job authentication |
| `SUPER_ADMIN_EMAIL` | Server | Super-admin access guard |
