# Mission FE-02 — Marketing surface — report

**Branch:** `mission-fe-02-marketing`  
**Date:** 2026-04-19  

Canonical detailed notes also appear in `docs/plan/MISSION-FE-02-REPORT.md` (same mission).

## Goal (recap)

Public marketing routes (landing, pricing, examples gallery + detail, FAQ, signup funnel), SEO/metadata, live hero demo (`POST /api/v1/public/demo` with static fallback in `public/demo-cache/`), and automated tests (Playwright + axe).

## What shipped

| Area | Notes |
|------|--------|
| `(marketing)/` routes | Landing, pricing, examples + `[slug]`, signin, signup + `/signup/continue`, terms, privacy |
| Chrome | Sticky nav (Forge logo, Pricing · Examples · Sign in, Start free), footer (DSL copyright, links, Contact `mailto:`, Status → `https://status.forge.app`) |
| Hero | Lazy-loaded (`hero-demo-lazy`), rotating placeholders, chips, 15s autostart, SSE preview + carousel fallback, CTA → `/signup?source=hero_demo` |
| Gallery | Six curated cards from `TEMPLATE_CARDS`, template thumbnail via `next/image` + `/marketing/template-thumb.svg`, hover crossfade overlay |
| Pricing | Starter / Pro / Enterprise, annual toggle, 15-row comparison table, 8-item billing FAQ, Enterprise dialog + mailto |
| Signup | Clerk `SignUp`; query params `plan`, `billing`, `source`, `template` persisted to `sessionStorage` for post-auth flows |
| SEO | `generateMetadata`, `robots.ts`, `sitemap.ts` (marketing URLs + `/examples/*` slugs), JSON-LD on home, dynamic OG via `opengraph-image.tsx` |
| Tests | `e2e/marketing-hero.spec.ts`, `e2e/marketing-a11y.spec.ts`, `e2e/marketing-visual.spec.ts` (example detail uses slug `contractor-small-jobs`) |

## Verification (`apps/web`)

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test:e2e
```

Playwright needs valid Clerk keys in `.env.local` for `/signin` and `/signup` to load (see plan report). Hero test stubs `**/public/demo` SSE.

**Visual baselines:** first run `pnpm exec playwright test e2e/marketing-visual.spec.ts --update-snapshots`.

## Manual / deferred

| Item | Notes |
|------|--------|
| Lighthouse mobile ≥95, desktop ≥98, CLS 0 | Chrome DevTools on production-like build |
| JS budget &lt; 100 KB gzipped on `/` | Bundle analyzer / Lighthouse |
| Stripe Checkout | Pricing CTAs land on signup with plan params; Stripe product wiring is backend/billing follow-up |
| Cross-browser | Safari / Firefox spot-checks |

## Honesty constraints

- No fabricated testimonials; social-proof section omitted unless real quotes exist.
- Pricing footer notes Stripe products may be finalized at launch.
