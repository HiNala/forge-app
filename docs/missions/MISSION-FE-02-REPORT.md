# Mission FE-02 — Marketing surface (report)

## Summary

Public marketing routes under `apps/web/src/app/(marketing)/` deliver a token-aligned, SEO-aware funnel: live hero demo (SSE to `POST /api/v1/public/demo` with `public/demo-cache/` fallback), honest proof section (no fabricated testimonials), pricing with comparison table + billing FAQ, gallery/examples, sign-in/up with Clerk, JSON-LD on the home page, sitemap + robots, and automated axe/hero E2E coverage.

## Routes

| Route | Notes |
|-------|--------|
| `/` | Landing: hero, ticker, qualitative highlights, how-it-works, gallery strip, honest proof, FAQ, final CTA |
| `/pricing` | Three tiers, annual toggle, comparison table (15 rows), enterprise dialog → mailto |
| `/examples`, `/examples/[slug]` | Gallery + per-slug preview (existing template mission wiring) |
| `/signin`, `/signup` | Clerk; marketing chrome; signup stores plan/source in sessionStorage for continue flow |
| `/terms`, `/privacy` | Legal |

## Hero demo

- **Client:** `components/marketing/hero-demo.tsx` (code-split via `hero-demo-lazy.tsx`).
- **API:** `apps/api/app/api/v1/public_demo.py` — rate-limited anonymous SSE; tests in `apps/api/tests/test_public_demo.py`.
- **Fallback:** `public/demo-cache/{1,2,3}.html` + friendly inline HTML if fetch fails; no hard error surface in the hero.
- **UX:** Rotating placeholders (4s, pause on focus), three chips (Booking / RSVP / Proposal), 15s autostart prompt, “Like what you see?” + `Start free` → `/signup?source=hero_demo`.
- **Responsive:** Column stack on narrow screens; side-by-side input + preview from `lg` breakpoint.

## SEO & metadata

- Per-route `generateMetadata` / exports where applicable; home OG via `opengraph-image.tsx` (1200×630, warm cream + serif headline).
- `MarketingJsonLd`: `Organization` + `SoftwareApplication`.
- `src/app/sitemap.ts` lists marketing URLs + `/examples/*` slugs from `EXAMPLES_SLUGS`.
- `src/app/robots.ts`: allows public marketing; disallows app shell and `/dev/`.

## Honesty / compliance

- Removed **fake metrics** (former stats) and **fabricated testimonials**; replaced with qualitative highlights and `HonestProofSection` pointing to the live demo + examples.

## Performance notes

- `Manrope` (`bodyFont`) uses `preload: false`; `Cormorant Garamond` remains the primary preloaded face (Mission FE-02 guidance).
- Lighthouse targets (mobile ≥95, CLS 0) should be validated on a production build with real `NEXT_PUBLIC_*` URLs; marketing layout is `force-dynamic` for provider compatibility.

## Tests

| File | Purpose |
|------|---------|
| `e2e/marketing-hero.spec.ts` | Chip → preview iframe has body text; signup links carry `source` query params |
| `e2e/marketing-a11y.spec.ts` | axe (`wcag2a`, `wcag2aa`, `wcag21aa`) on core marketing paths |
| `e2e/marketing-pages.visual.spec.ts` | Full-page snapshots at 375 / 768 / 1280 — update baselines with `--update-snapshots` |

Run (from `apps/web`, with dev server or Playwright webServer):

```bash
pnpm exec playwright test e2e/marketing-hero.spec.ts e2e/marketing-a11y.spec.ts
```

## Fixes (post-pass)

- **`getApiUrl()`** (`apps/web/src/lib/api.ts`) normalizes `NEXT_PUBLIC_API_URL` when it already ends with `/api/v1` (matches `.env.example` and Docker), so the hero demo and API client no longer hit `/api/v1/api/v1/...`. Unit tests: `apps/web/src/lib/api-url.test.ts`.
- **CI E2E** (`.github/workflows/e2e.yml`) also runs `e2e/marketing-hero.spec.ts` and `e2e/marketing-a11y.spec.ts` against the docker-compose stack.
- Removed duplicate unconditional **`marketing-visual.spec.ts`** (no snapshot baselines); use opt-in **`e2e/marketing-pages.visual.spec.ts`** with `SNAPSHOT_MARKETING=1`.

## Follow-ups (optional)

- Wire Stripe Checkout from pricing CTAs when billing endpoints are production-ready.
- Replace gradient gallery thumbnails with real `next/image` assets per template when art exists.
- Tune `force-dynamic` on `(marketing)/layout` if static marketing prerender becomes desirable.
