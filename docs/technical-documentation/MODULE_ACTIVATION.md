# Module Activation System — Technical Reference

**Written:** 2026-05-19  
**Status:** Live — billing page fix applied in commit `0694f9e`

---

## Overview

Module access in Veno App is controlled by two separate DB fields on the `restaurants` table. Understanding the difference between them is critical — they serve different purposes and are read by different parts of the app.

| Field | Type | Purpose |
|---|---|---|
| `enabled_modules` | `jsonb` | **Actual runtime gate.** Controls whether a feature is accessible in the app. Read by API routes and module guards. |
| `subscription_plans` | `text` | **Billing record.** Comma-separated list of active paid plan keys (`orders`, `bookings`, `team`). Used by the billing page and Stripe webhook. |

These two fields are **not automatically in sync** — they serve different layers of the system.

---

## Module Keys

### `enabled_modules` keys (runtime access)

```json
{
  "ordering": true,
  "analytics": true,
  "reservations": true,
  "rota": true,
  "reports": true,
  "cash_drawer": true
}
```

### `subscription_plans` keys (billing plans)

| Plan key | Covers `enabled_modules` keys |
|---|---|
| `orders` | `ordering`, `analytics`, `reports`, `cash_drawer` |
| `bookings` | `reservations` |
| `team` | `rota` |

---

## How Modules Are Activated

### 1. Self-registration (`/auth/register-full`)

On signup, the restaurant row is inserted with all modules enabled by default:

```js
enabled_modules: { ordering: true, analytics: true, reservations: true, rota: true, reports: true, cash_drawer: true }
```

`subscription_plans` is left empty. The user is in trial mode.

### 2. Super admin manual registration (`/api/admin/manual-register`)

The same defaults apply — all modules enabled, `subscription_plans` empty, status set to `trialing`. This is intentional: the user gets full access during the trial regardless of how the account was created.

### 3. Active subscription (via Stripe webhook)

When a Stripe `customer.subscription.created` or `customer.subscription.updated` event fires, the webhook (`/api/billing/webhook`) sets both fields in sync:

- `subscription_plans` is set to the purchased plan keys (e.g. `orders,team`)
- `enabled_modules` is updated to reflect exactly what those plans cover

### 4. Subscription cancelled / expired

The webhook zeroes out `enabled_modules`:

```js
enabled_modules: { ordering: false, analytics: false, reservations: false, rota: false }
```

`subscription_plans` is also cleared. The user loses access and the billing page shows all toggles off.

---

## How Runtime Access Is Enforced

API routes and the `useModuleGuard` hook read `enabled_modules` directly. Example from reservations API:

```js
if (!venue.enabled_modules?.reservations) {
  return NextResponse.json({ error: 'Module not enabled' }, { status: 403 })
}
```

`subscription_plans` is **never** used for access control — only for billing UI state.

---

## The Bug That Was Fixed (2026-05-19)

### Symptom

On `/dashboard/settings/billing`, all module plan cards showed as toggled **off** (inactive) even when the user had full module access. This happened for both self-registered and super-admin-registered accounts during the trial period.

In the super admin dashboard, the same restaurant correctly showed modules as active (because it reads `enabled_modules`). This created a visible discrepancy.

### Root Cause

The billing page's `useEffect` that pre-selects plan cards only ran when `subscription_status === 'active'`:

```js
// Before fix — only ran for paid subscriptions
useEffect(() => {
  if (isActive && subscriptionPlans.length > 0) {
    setSelected(subscriptionPlans)
  }
}, [restaurant?.subscription_plans, subscriptionStatus])
```

During trial, `subscription_plans` is always empty (no payment taken yet), so `selected` stayed `[]` and all toggles appeared off — even though `enabled_modules` had everything enabled.

The billing page never read `enabled_modules` at all.

### Fix Applied

The `useEffect` was updated to derive the selected plan state from `enabled_modules` when the subscription is not yet active:

```js
useEffect(() => {
  if (!restaurant) return
  if (isActive && subscriptionPlans.length > 0) {
    // Paid subscription — use the billing record
    setSelected(subscriptionPlans)
  } else if (!isActive) {
    // Trial or expired — derive from actual module access
    const mods = restaurant.enabled_modules || {}
    const derived = []
    if (mods.ordering || mods.analytics || mods.reports || mods.cash_drawer) derived.push('orders')
    if (mods.reservations) derived.push('bookings')
    if (mods.rota) derived.push('team')
    setSelected(derived)
  }
}, [restaurant?.subscription_plans, restaurant?.enabled_modules, subscriptionStatus])
```

File: `src/app/dashboard/settings/billing/page.js`

### Why This Is Safe

- During trial, toggling plan cards only updates local `selected` state — no API call is made
- The user can still deselect modules before going through Stripe checkout
- When the trial expires and `enabled_modules` is zeroed out by the webhook, all toggles correctly show as off
- When a paid subscription is active, the original `subscription_plans` path still runs as before

---

## Full Lifecycle Summary

```
Registration (self or admin)
  └── enabled_modules: all true
  └── subscription_plans: ""
  └── subscription_status: "trialing"
         │
         ▼
  Billing page (trial)
  └── Reads enabled_modules → derives selected plans → toggles show ON
  └── User can adjust selection and click "Start subscription" → Stripe checkout
         │
         ▼
  Stripe payment succeeds → webhook fires
  └── subscription_status: "active"
  └── subscription_plans: "orders,bookings" (whatever was purchased)
  └── enabled_modules: updated to match purchased plans
         │
         ▼
  Billing page (active)
  └── Reads subscription_plans → selected = ["orders", "bookings"]
  └── User can add/remove plans → triggers Stripe portal or new checkout
         │
         ▼
  Subscription cancelled / expired → webhook fires
  └── enabled_modules: all false
  └── subscription_plans: ""
  └── Billing page shows all toggles OFF → user prompted to resubscribe
```

---

## Files Involved

| File | Role |
|---|---|
| `src/app/dashboard/settings/billing/page.js` | Billing UI — reads both fields, fixed to derive trial state from `enabled_modules` |
| `src/app/api/billing/webhook/route.js` | Stripe webhook — source of truth for writing both fields on payment events |
| `src/app/api/billing/create-checkout/route.js` | Creates Stripe checkout session, can also directly update modules for plan changes |
| `src/app/auth/register-full/page.js` | Self-registration — sets initial `enabled_modules` |
| `src/app/api/admin/manual-register/route.js` | Super admin registration — sets same initial `enabled_modules` |
| `src/hooks/useModuleGuard.js` | Client-side module guard hook |
