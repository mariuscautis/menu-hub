# Testing — Menu Hub

## Current State

**No tests exist.** A recursive search of `src/` found zero `*.test.*` or `*.spec.*` files.

There is also no test framework configured:
- No `jest.config.*` file
- No `vitest.config.*` file
- No `@testing-library/*`, `jest`, or `vitest` packages in `package.json`
- No test script in `package.json` (`scripts` contains only `dev`, `build`, `pages:build`, `start`, `lint`)

## Recommended Approach

Given the stack (Next.js 15, React 19, no TypeScript), the recommended path is **Vitest + React Testing Library**:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest run --coverage"
}
```

### Priority areas to test first

1. **Pure utility functions** in `src/lib/` (e.g. `formatCurrency`, translation key resolution in `useTranslations`) — zero setup required, highest ROI
2. **Custom hooks** (e.g. `useAdminSupabase`, `useOrderSounds`) — use `renderHook` from `@testing-library/react`; mock `@/lib/supabase` and `@/lib/RestaurantContext`
3. **Isolated UI components** (e.g. `InfoTooltip`, `ThemeToggle`) — straightforward render + interaction tests; mock `useGuide` context
4. **Page-level integration tests** — lower priority given heavy Supabase dependency, but can be tested with `msw` (Mock Service Worker) to intercept fetch calls

### Suggested file placement

Co-locate tests next to source files:
```
src/components/InfoTooltip.test.js
src/hooks/useAdminSupabase.test.js
src/lib/i18n/LanguageContext.test.js
```

### Mocking patterns needed

Most of the codebase depends on a small set of contexts and the Supabase client. A shared test helper that provides mock providers for `RestaurantContext`, `LanguageContext`, `CurrencyContext`, and `GuideContext` would significantly reduce boilerplate across tests.
