# Mission FE-01 — Design system & frontend foundation (report)

## Summary

Mission FE-01 consolidates **design tokens** in `apps/web/src/styles/tokens.css` (OKLCH colors, typography scale, spacing, radii, shadows, motion durations/easings, z-index), wires them through **`globals.css`** `@theme inline`, extends **primitives** (Button with `link` + Framer `whileTap`, Card variants + `hoverable`, Textarea with **autoresize**, Separator, layout **Stack/Row/Container/Grid**), standardizes **Lucide** via `components/icons/` and a sized **Forge logo**, expands **`@/lib/motion`** (`SPRINGS`, `MOTION_TRANSITIONS`, `reduceTransition`), adds **`useReducedMotion`**, updates **tabs** sliding indicator and **tooltip** delay (400ms), and documents everything in **`docs/design/`**. Dev surfaces: **`/dev/primitives`** and **`/dev/design-system`** (same matrix; both **404 in production**).

## Upstream design artifact

- **Endpoint:** `https://api.anthropic.com/v1/design/h/ZhxfTfNViMkEnjhpg1EkxA`  
- **Status:** Unauthenticated fetch returned **404**; snapshot placeholder is in **`docs/design/raw/design-artifact-2026-04-19.json`**. Replace with a real response when API access is available; then reconcile token names if the artifact differs.

## Acceptance mapping

| Criterion | Status |
| --------- | ------ |
| Artifact cached + README summary | **Partial** — placeholder JSON + `DESIGN_BRIEF.md`; full artifact pending API. |
| Single `tokens.css` + Tailwind `var()` | **Done** — `@theme inline` maps to CSS variables. |
| Primitives listed in mission | **Done** — see `COMPONENTS.md`; EmptyState lives under `components/chrome/`. |
| Motion presets, no ad-hoc-only policy | **Done** — `motion.ts` + `MOTION.md`; app code should import from here. |
| `/dev/design-system` | **Done** — dev-only, production 404. |
| axe-core 0 violations | **Manual** — run axe against `/dev/design-system` locally (browser extension or CLI against running dev server). |
| Lighthouse ≥ 95 | **Manual** — run on `/dev/design-system` in production build with `NODE_ENV` test or temporary export. |
| Bundle +30KB guard | **Manual** — approximate via `next build` analyzer if enabled; foundation layer is intended to stay lean. |
| Branch `mission-fe-01-design-system` | **Contributor** — create branch and open PR when committing. |

## Verification (local)

```bash
cd apps/web && pnpm lint && pnpm exec tsc --noEmit && pnpm test && pnpm build
```

## Follow-ups

- Ingest real design JSON; add `docs/design/components/` screenshots from the tool.
- Optional: automate axe in CI (`@axe-core/cli` against preview URL).
- Pin Framer Motion major explicitly in docs if lockfile policy requires a single version statement per repo.
