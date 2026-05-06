# STACK.md — Menu Hub Tech Stack

## Languages
- **JavaScript** (primary — `.js`, `.jsx`) with `allowJs: true`
- **TypeScript** (fiscal module — `src/lib/fiscal/`, `src/app/api/fiscal/`) targeting ES2017
- **JSX/TSX** via React and Next.js

## Runtime
- **Node.js** — no explicit `engines` field or `.nvmrc`; inferred from Next.js 15 requirements (Node 18+)

## Package Manager
- **npm** — `package-lock.json` present at root

## Frameworks
| Package | Version | Purpose |
|---|---|---|
| `next` | 15.1.6 | Full-stack React framework (App Router) |
| `react` / `react-dom` | 19.2.0 | UI library |
| `next-intl` | 4.7.0 | i18n / translations |
| `next-pwa` | 5.6.0 | Progressive Web App (service worker, offline caching) |
| `next-seo` | 7.2.0 | SEO meta tags |

## Key Dependencies
| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | 2.86.0 | Database + auth + storage client |
| `stripe` | 17.7.0 | Payments, subscriptions, terminal |
| `@getbrevo/brevo` | 3.0.1 | Transactional email and SMS |
| `@react-pdf/renderer` | 4.3.1 | Client-side PDF generation (invoices) |
| `@dnd-kit/core` + `@dnd-kit/utilities` | 6.3.1 / 3.2.2 | Drag-and-drop (menu ordering) |
| `recharts` | 3.5.1 | Dashboard analytics charts |
| `react-big-calendar` | 1.19.4 | Reservations/rota calendar views |
| `date-fns` | 4.1.0 | Date formatting / manipulation |
| `qrcode` / `jsqr` | 1.5.4 / 1.4.0 | QR code generation and scanning |
| `pg` | 8.16.3 | Direct PostgreSQL client (fiscal/server routes) |
| `sharp` | 0.34.5 | Server-side image processing |
| `@next/third-parties` | 16.1.7 | Google Analytics / third-party script helpers |

## Build / Dev Tools
| Package | Version | Purpose |
|---|---|---|
| `tailwindcss` | 3.4.19 | Utility-first CSS (dark mode via `class` strategy) |
| `postcss` + `autoprefixer` | 8.5.6 / 10.4.22 | CSS post-processing |
| `eslint` + `eslint-config-next` | 9 / 16.0.5 | Linting (disabled in production builds) |
| `@cloudflare/next-on-pages` | 1.13.16 | Cloudflare Pages adapter |
| `babel-plugin-react-compiler` | 1.0.0 | React compiler Babel plugin |
| `canvas` | 3.2.0 | Node.js canvas (dev/test, QR scanning) |

## Deployment Target
**Cloudflare Pages** — confirmed by:
- `"pages:build": "npx @cloudflare/next-on-pages"` in `package.json`
- `config.cache = false` in production webpack config (avoids Cloudflare Pages cache size limits)
- Cloudflare Worker proxy at `https://email-proxy.marius-cautis.workers.dev` for edge email delivery

## TypeScript Config Highlights
- `strict: false`, `noEmit: true`, `moduleResolution: node`
- Path alias: `@/*` → `./src/*`
- TypeScript compilation is scoped only to fiscal module (`src/app/api/fiscal/**` and `src/lib/fiscal/**`)

## Tailwind Config Highlights
- Dark mode: `class`-based toggle
- Primary brand colour: `rgb(98, 98, 189)` — purple (#6262bd)
- Custom animations: `fade-in`, `zoom-in`, `slide-up`, `slide-down`
