# Code Conventions — Menu Hub

## File Naming
- **Pages**: kebab-case directories with `page.js` (Next.js App Router), e.g. `src/app/dashboard/menu/page.js`
- **Components**: PascalCase, e.g. `InfoTooltip.js`, `NotificationBell.js`, `ThemeToggle.js`
- **Hooks**: camelCase prefixed with `use`, e.g. `useAdminSupabase.js`, `useOrderSounds.js`
- **Lib modules**: camelCase, e.g. `soundGenerator.js`, `syncManager.js`, `offlineQueue.js`
- All source files use `.js` (not `.ts` / `.tsx` / `.jsx`)

## Component Patterns
- **All components and page files are Client Components** — every file begins with `'use client'`
- No Server Components observed in the codebase; the project uses Next.js App Router but opts every file into client rendering
- Components are functional (no class components)
- Default export is always used for the main component in a file

## Import Aliases
- `@/` maps to the `src/` directory (configured in `jsconfig.json` / Next.js default)
- Examples: `@/lib/supabase`, `@/components/InfoTooltip`, `@/hooks/useAdminSupabase`
- No relative `../..` traversals in pages — always use `@/`

## State Management
- **Local UI state**: `useState` + `useRef` for local interaction state
- **Shared app state**: React Context (`useRestaurant`, `useCurrency`, `useGuide`, `useLanguage`)
- No Redux / Zustand / external state library
- Complex pages (e.g. `orders/page.js`) declare many `useState` calls at the top of the component — no consolidation into reducer patterns
- `useRef` used for stable references that should not re-trigger effects (e.g. `playNewOrderSoundRef`, `menuItemsRef`)

## Tailwind Usage
- Tailwind CSS v3 throughout — utility classes only, no `@apply` observed
- **Dark mode**: `dark:` variant applied extensively on every styled element, e.g. `dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200`
- Primary brand colour hard-coded as `#6262bd` (purple) using arbitrary value syntax: `bg-[#6262bd]`, `text-[#6262bd]`, `hover:border-[#6262bd]`
- Opacity modifier shorthand: `bg-[#6262bd]/10`, `bg-emerald-900/30`
- `rounded-sm` is the preferred border-radius (flat/editorial aesthetic); `rounded-xl` in tooltip popovers
- Card borders: `border border-zinc-200 dark:border-zinc-800`
- Common icon size: `w-8 h-8` with `fill="none" stroke="currentColor"` SVGs (stroke-based, no filled icons)
- Responsive prefixes `md:` and `sm:` used for layout breakpoints

## Translation Pattern
- Custom i18n — **not** next-intl (despite it being a dependency; the project wraps its own `LanguageContext`)
- Import: `import { useTranslations } from '@/lib/i18n/LanguageContext'`
- Usage:
  ```js
  const t = useTranslations('namespace')
  t('key')                          // returns string or falls back to key
  t('key', { placeholder: value })  // string interpolation with {placeholder}
  ```
- Multiple namespaces imported per page: `t` for the page namespace, `tc` for `'common'`, `tg` for `'guide'`
- Translation files: `messages/en.json` (primary), with `es`, `fr`, `it`, `ro` counterparts
- Missing keys return the key string — never throw

## Hook Conventions
- Named exports for hooks: `export function useOrderSounds(...)`, `export function useAdminSupabase()`
- Also paired with a `export default useOrderSounds` at the bottom of the file in some hooks
- Hooks may export ancillary constants alongside the hook function (e.g. `export const soundOptions = [...]`)
- Hooks that access Supabase for reads use the raw `supabase` import; `useAdminSupabase` is used for write operations in pages that support admin impersonation

## Supabase Access Pattern
- Read-only hooks / utils: `import { supabase } from '@/lib/supabase'` directly
- Dashboard pages that mutate data: `const supabase = useAdminSupabase()` — the hook returns either the real client or an admin-proxy client depending on impersonation state
- **No Supabase join syntax** for FK columns added via migration — resolve relationships in JS from already-fetched arrays

## Export Patterns
- **Default export** for the main component or hook in every file
- **Named exports** for secondary utilities exported from the same file (e.g. `soundOptions`, `useLanguage`, `useTranslations`)

## Comment Conventions
- Minimal inline comments; JSDoc-style block comments on components that have non-obvious behaviour (e.g. `InfoTooltip`, `useAdminSupabase` have `/** ... */` blocks)
- `console.log` with emoji prefixes used as debugging markers in hooks (e.g. `'🔊 Sound settings updated:'`) — not stripped for production in current state
- Section markers as plain inline comments: `// Takeaway state`, `// Refund modal state`, etc.

## ESLint
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` (ESLint v9 flat config)
- No additional plugins (no Prettier, no Biome)
- Script: `"lint": "eslint"` (no path arg — lints project default)
