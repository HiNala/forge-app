# Mission FE-01 — Design System & Frontend Foundation (report)

## Status: complete (in-repo)

### Upstream design artifact

- **Fetch:** `GET https://api.anthropic.com/v1/design/h/ZhxfTfNViMkEnjhpg1EkxA` returned **403** without authentication. A snapshot metadata file is stored at `docs/design/raw/anthropic-design-2026-04-19.json`.
- **Authoritative styling** until the artifact is imported: **`apps/web/src/styles/tokens.css`** + mission text (warm cream canvas, warm teal accent ~hue 192 in OKLCH).

### Token layer

- Single source: **`apps/web/src/styles/tokens.css`** (OKLCH colors, type scale, spacing 4px grid, radius, shadow, motion, z-index, `.dark` overrides).
- **Tailwind v4** mapping: `apps/web/src/app/globals.css` (`@theme inline`, `@custom-variant dark`).

### Typography & fonts

- **`apps/web/src/app/fonts.ts`:** Cormorant Garamond (display), Manrope (body), `display: "swap"`, subset weights only.

### Icons

- **Lucide** via `apps/web/src/components/icons/index.ts`; **Forge logo** SVG in `components/icons/logo.tsx` (`ForgeLogo` sizes sm/md/lg).

### Motion

- **`apps/web/src/lib/motion.ts`:** `SPRINGS`, `MOTION_TRANSITIONS`, alias **`TRANSITIONS`**, variants, `reduceTransition`.
- **Framer Motion** pinned to **`12.38.0`** (exact) in `package.json`.
- **Button** uses **`motion.button`** with `whileTap` + `SPRINGS.snappy` and **`useReducedMotion()`** from `framer-motion`.

### Primitives & dev surface

- Shadcn/Radix-based components under `components/ui/`; showcase: **`/dev/design-system`** (404 in production via `notFound()`).
- **E2E:** `e2e/design-system-a11y.spec.ts` runs axe (wcag2a/2aa/21aa) against the design system page when the dev server exposes it.

### Documentation

| Doc | Purpose |
|-----|---------|
| `docs/design/DESIGN_BRIEF.md` | Mood, type, motion, patterns. |
| `docs/design/TOKENS.md` | Token table. |
| `docs/design/COMPONENTS.md` | Primitive reference. |
| `docs/design/MOTION.md` | Springs vs tweens, reduced motion. |

### Verification commands

```bash
cd apps/web && pnpm run typecheck && pnpm run lint
```

**Axe on `/dev/design-system`:** that route only exists under `next dev` (`NODE_ENV=development`). Start the dev server path for Playwright:

```bash
# Unix / Git Bash
cd apps/web && PLAYWRIGHT_NEXT_DEV=1 pnpm exec playwright test e2e/design-system-a11y.spec.ts
```

```powershell
# Windows PowerShell
cd apps/web; $env:PLAYWRIGHT_NEXT_DEV="1"; pnpm exec playwright test e2e/design-system-a11y.spec.ts
```

With `PLAYWRIGHT_NEXT_DEV=1`, `playwright.config.ts` runs `next dev` instead of `next start`, so the page is not a 404 and axe can run. **Latest run:** 0 violations (`wcag2a`, `wcag2aa`, `wcag21aa`).

### Deferred / manual

- **Lighthouse ≥ 95** and **CLS = 0** on a token-heavy page: run against `/dev/design-system` locally (`pnpm dev`) and record scores; production builds intentionally 404 this route.
- **Bundle size &lt; 30KB gzipped** for token+primitive layer: run `@next/bundle-analyzer` on a minimal route when profiling.
- Replace `docs/design/raw/*.json` with the real API payload when authenticated download is available.

### Fixes applied during verification

- **`Button` + `motion.button`:** `ButtonProps` omits HTML `onDrag` / `onDragStart` / `onDragEnd` / `onAnimationStart` / `onAnimationEnd` so they do not collide with Framer Motion’s prop types.
- **Design system showcase `Select`:** `SelectTrigger` uses `aria-labelledby` pointing at the visible `<Label id="…">` so axe `button-name` passes.
