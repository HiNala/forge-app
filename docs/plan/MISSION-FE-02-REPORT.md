# Mission FE-02 — Marketing surface — report

**Branch:** `mission-fe-02-marketing`  
**Date:** 2026-04-19  

## Goal (recap)

Public marketing routes (landing, pricing, examples, FAQ, signup funnel), SEO/metadata, live hero demo (`POST /api/v1/public/demo` with fallback), and automated tests (Playwright + axe).

## What landed in the repo

| Area | Status |
|------|--------|
| Route group `(marketing)/` — landing, pricing, examples + `[slug]`, signin/signup/continue, terms/privacy | ✅ |
| Signup URL params — `plan`, `billing`, `source` stored in `sessionStorage` (`forge.pendingCheckout`) for post-checkout wiring | ✅ |
| Marketing chrome — sticky nav, footer, `Container` `xl`, copy width caps | ✅ |
| Hero — lazy client bundle (`hero-demo-lazy.tsx`), SSE + cached fallback, chips, 15s autostart, signup `?source=hero_demo` | ✅ |
| How-it-works, gallery cards, FAQ accordion, final CTA | ✅ |
| Pricing — tiers, annual toggle, 15-row comparison table, 8-question billing FAQ, Enterprise dialog + mailto | ✅ |
| SEO — `metadataBase` (root + marketing layout), `generateMetadata` on pages, JSON-LD, `robots.ts`, `sitemap.ts`, dynamic OG images (`opengraph-image.tsx`) | ✅ |
| Next.js 16 — `dynamic(..., { ssr: false })` moved out of Server Components into `hero-demo-lazy.tsx` | ✅ |
| Playwright — `e2e/marketing-hero.spec.ts` (SSE stubbed), `e2e/marketing-a11y.spec.ts`, `e2e/marketing-visual.spec.ts` (example slug `contractor-small-jobs`) | ✅ |
| Tooling — `tsconfig` excludes `e2e/` + `playwright.config.ts` from `next build` typecheck | ✅ |
| Scripts — `pnpm exec next` for `dev`/`build`/`start` (Windows-friendly PATH) | ✅ |

## Verification commands (`apps/web`)

| Check | Command | Notes |
|--------|---------|--------|
| Typecheck | `pnpm run typecheck` | ✅ |
| Lint | `pnpm run lint` | Run locally |
| Production build | `pnpm run build` | ✅ |
| E2E (Playwright) | `pnpm run test:e2e` or `pnpm run test:e2e:ci` | See **Clerk requirement** below |

## Clerk + Playwright (required)

`ClerkProvider` and `clerkMiddleware` need **real development keys** from the [Clerk dashboard](https://dashboard.clerk.com/). Placeholder strings are rejected (`Publishable key not valid`), and `next start` will not become healthy for Playwright.

1. Copy `apps/web/.env.example` → `apps/web/.env.local`.
2. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (development instance).
3. `playwright.config.ts` merges `.env.local` and passes `env: { ...process.env }` into `webServer` so **both** `next build` (when `CI=true`) and `next start` see the same vars.
4. Re-run `pnpm run test:e2e`.

**CI:** Add the same two variables (and optional `NEXT_PUBLIC_API_URL`) as encrypted secrets.

## E2E implementation details

- **Hero flow:** Network route stubs `**/public/demo` with a minimal SSE `html.complete` body and CORS headers so tests do not depend on the Python API.
- **Hero CTA:** Asserts the link named **“Like what you see? Start free”** (avoids matching the nav **“Start free”**).
- **Server:** `next start` (not `next dev`) for reliable lazy chunks; when `CI=true`, `webServer` runs `pnpm exec next build && pnpm exec next start …`.
- **Visual baselines:** First run: `pnpm exec playwright test e2e/marketing-visual.spec.ts --update-snapshots`.

## Not fully automated in this report

| Item | Notes |
|------|--------|
| Lighthouse ≥95 mobile / ≥98 desktop | Run manually in Chrome DevTools against production build + real URLs. |
| Total JS &lt; 100 KB gzipped on `/` | Verify with build analyzer / Lighthouse “unused JS” as needed. |
| Mobile Safari / Firefox manual passes | Manual device / BrowserStack recommended. |
| Axe “zero violations” on `/signin` and `/signup` | Depends on Clerk embed; `iframe` is excluded in `marketing-a11y.spec.ts`. Re-test after Clerk UI changes. |

## Acceptance summary

- Marketing surface and hero behavior match FE-02 intent; backend demo + static `public/demo-cache/` cover live and offline modes.
- SEO routes (`robots`, `sitemap`, OG) are present.
- Playwright + axe suites are in-repo; **E2E requires valid Clerk env** as above.
- No fabricated testimonials or fake metrics in marketing content (per prior implementation).
