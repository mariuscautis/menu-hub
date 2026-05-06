# Codebase Concerns

**Analysis Date:** 2026-05-06

## Tech Debt

**Fiscal compliance adapters are stubs:**
- Issue: Germany, Italy, France, Brazil, and US fiscal adapters are all unimplemented stubs that throw "not implemented" errors. The fiscal pipeline runs in a disabled/passthrough mode for these markets.
- Files: `src/lib/fiscal/adapters/germany.ts`, `src/lib/fiscal/adapters/italy.ts`, `src/lib/fiscal/adapters/france.ts`, `src/lib/fiscal/adapters/brazil.ts`, `src/lib/fiscal/adapters/us.ts`, `src/lib/fiscal/pipeline.ts`
- Impact: Cannot legally operate in DE, IT, FR, BR, ES, US without completing these. The fiscal retry queue (referenced in multiple TODOs) is also missing.
- Fix approach: Implement each adapter per country compliance spec. Add retry queue in `src/lib/fiscal/pipeline.ts` before enabling affected markets.

**Fiscal retry queue missing across multiple touchpoints:**
- Issue: `src/app/dashboard/tables/page.js` (lines 1902, 2078), `src/app/api/fiscal/record/route.ts` (line 67), `src/app/api/takeaway/pickup/route.js` (line 80), `src/lib/syncManager.js` (line 303) all have the same TODO blocking fiscal-strict market launch.
- Files: All files listed above.
- Impact: Fiscal recording can silently fail with no retry; non-compliant in strict markets.
- Fix approach: Implement a persistent retry queue (likely using `offlineQueue.js` pattern) and wire it into the fiscal pipeline.

**ESLint disabled during production builds:**
- Issue: `next.config.js` sets `eslint.ignoreDuringBuilds: true` — lint errors never block a deploy.
- Files: `next.config.js`
- Impact: Regressions and type errors can ship undetected.
- Fix approach: Re-enable ESLint, fix existing violations, remove the flag.

**Mixed JS and TypeScript:**
- Issue: The codebase is predominantly `.js`/`.jsx` but fiscal code (`src/lib/fiscal/`) is `.ts`. No consistent migration path.
- Files: `src/lib/fiscal/` (TypeScript), everything else (JavaScript)
- Impact: No type safety in the bulk of the codebase; incremental migration is unplanned.
- Fix approach: Either commit to full TS migration or document the boundary clearly.

**Stale `_src/` and `_messages/` directories at repo root:**
- Issue: These are renamed/disabled copies of the real `src/` and `messages/` directories. They serve no purpose and could cause confusion.
- Files: `_src/` (root), `_messages/` (root)
- Impact: Confusion about which source is authoritative; wasted disk space; untracked by git.
- Fix approach: Delete both directories entirely — they are not referenced by any build process.

## Known Bugs

**Deleted SQL migration files (unstaged deletions):**
- Symptoms: 11 `.sql` migration files show as deleted (not staged) in git status — they exist in git history but have been removed from the working tree without being committed.
- Files: `ADD_BLACKLIST_AND_STRIPE_CONNECT.sql`, `ADD_CUSTOMER_TRUST_SYSTEM.sql`, `ADD_PAYMENT_FAILED_AT.sql`, `ADD_SMS_BILLING.sql`, `ADD_SOFT_DELETE.sql`, `ADD_STAFF_AVATAR.sql`, `ADD_STRIPE_SUBSCRIPTIONS.sql`, `ADD_SUPPORT_TICKETS.sql`, `ADD_SUSPENSION_MESSAGE.sql`, `APPLY_DISCOUNTS_FIX.sql`, `GLOBAL_BOOKING_FEE.sql`
- Trigger: Running `git status` in the repo root.
- Workaround: The migrations have already been applied to Supabase, so the app works; the files just need to be formally committed as deleted.

## Security Considerations

**API routes have many unauthenticated-looking endpoints:**
- Risk: API routes under `src/app/api/` include `admin`, `billing`, `bridge`, `staff`, `stripe-connect`, `terminal`, `fiscal/record` — if any lack auth checks, they could be exploited.
- Files: `src/app/api/` (all subdirectories)
- Current mitigation: Unknown without reading each route — needs audit.
- Recommendations: Add an audit pass ensuring every sensitive route validates the Supabase session token before processing.

**`debug-brevo` and `test-email` API routes in production:**
- Risk: Debug/test endpoints exposed in production could leak PII or allow spam.
- Files: `src/app/api/debug-brevo/`, `src/app/api/test-email/`
- Current mitigation: Unknown.
- Recommendations: Gate with admin-only auth check or remove from production build.

## Performance Bottlenecks

**`src/app/dashboard/tables/page.js` is very large:**
- Problem: The tables page contains fiscal logic inline (TODOs at lines 1902 and 2078) suggesting it is a very large file handling multiple concerns.
- Files: `src/app/dashboard/tables/page.js`
- Cause: Feature accumulation — ordering, fiscal recording, floor plan, table management all likely in one file.
- Improvement path: Extract fiscal recording, order management, and floor plan into separate components/hooks.

**All components are client-side rendered (`'use client'` everywhere):**
- Problem: No server components — entire dashboard runs client-side, meaning larger JS bundles and no server-side data fetching.
- Files: All `src/app/dashboard/` pages
- Cause: Supabase real-time subscriptions and `useContext` hooks require client rendering.
- Improvement path: Where real-time isn't needed, convert to server components with server-side Supabase fetching.

## Fragile Areas

**`menu-hub/` subdirectory (untracked build artifacts):**
- Files: `menu-hub/` (root)
- Why fragile: Contains `.next/`, `.vercel/`, `node_modules/` — untracked by git, could diverge from root-level source. Any deploy from `menu-hub/` would use stale code.
- Safe modification: Always build and deploy from the repo root, never from `menu-hub/`.
- Test coverage: None.

**`syncManager.js` and offline queue complexity:**
- Files: `src/lib/syncManager.js`, `src/lib/offlineQueue.js`
- Why fragile: Offline sync with Supabase real-time is inherently complex; the fiscal retry queue is not yet wired in.
- Safe modification: Any changes should be tested against the offline PWA scenario.
- Test coverage: None.

**Supabase schema cache / join limitations:**
- Files: All dashboard pages using `.select('*, related_table(col)')`
- Why fragile: New FK columns added via SQL migration aren't recognized by Supabase's schema cache for joins until the cache is refreshed. Workaround (JS-side lookup) is in use but not enforced consistently.
- Safe modification: After any schema migration, verify Supabase schema cache is refreshed before relying on new joins.

## Scaling Limits

**PWA service worker caching strategy:**
- Current capacity: Supabase API cache capped at 64 entries, 24h TTL; storage cache at 128 entries, 30 days.
- Limit: High-volume restaurants with many menu items/orders may hit cache entry limits.
- Scaling path: Increase `maxEntries` limits or implement cache partitioning per restaurant.

## Dependencies at Risk

**`next-pwa` package:**
- Risk: `next-pwa` has historically lagged behind Next.js major versions and has had maintainability concerns.
- Impact: PWA functionality could break on Next.js upgrades.
- Migration plan: Evaluate `@ducanh2912/next-pwa` (active fork) or Serwist as alternatives.

## Missing Critical Features

**Fiscal retry queue:**
- Problem: All fiscal recording (tables, takeaway, sync) lacks a retry mechanism for failed fiscal requests.
- Blocks: Legal operation in DE, IT, FR, BR, ES markets.

**Fiscal adapter implementations (5 countries):**
- Problem: Germany, Italy, France, Brazil, US adapters are stubs.
- Blocks: Expanding to those markets.

**No test suite:**
- Problem: Zero test files exist in the codebase.
- Blocks: Confident refactoring, CI quality gates, regression detection.

## Test Coverage Gaps

**Entire codebase is untested:**
- What's not tested: All dashboard pages, all API routes, all context providers, all hooks, fiscal pipeline, sync manager, offline queue.
- Files: `src/` (everything)
- Risk: Any change can introduce silent regressions. Fiscal logic in particular is high-risk with no test coverage.
- Priority: High — especially for `src/lib/fiscal/`, `src/lib/syncManager.js`, `src/app/api/stripe*/`, `src/app/api/billing/`

---

*Concerns audit: 2026-05-06*
