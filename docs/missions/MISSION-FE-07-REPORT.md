# Mission FE-07 — Polish, Micro-Interactions, Accessibility & Performance — report

**Branch:** `mission-fe-07-polish`  
**Date:** 2026-04-19  

## Summary

This pass **refines** FE-01–FE-06 without adding product features: motion and **reduced-motion** handling, **dialog** transitions, **input/textarea** focus timing, **offline** and **global error** copy, **404** navigation, **dashboard** card hover with reduced-motion fallbacks, **Studio** generation feedback (dot stagger + empty-state **aria-live**), **list row highlight** duration (800ms), **Recharts** lazy loading (already split), and **bundle analyzer** wiring in `next.config.ts`. Documentation for Lighthouse, axe, and bundles lives under **`docs/polish/`**.

## What changed (code)

| Area | Change |
|------|--------|
| `next.config.ts` | `@next/bundle-analyzer` when `ANALYZE=true`. |
| `lib/motion.ts` | `MOTION_MAX_DURATION_S`, `listStaggerReducedMotion` for stagger-free lists when using reduced motion. |
| `components/ui/dialog.tsx` | `motion-reduce:duration-0` on overlay/content; no scale jump when reduced. |
| `Input` / `Textarea` | 200ms transition on focus ring (box-shadow / border). |
| `OfflineBanner` | Clearer, actionable offline copy + retry. |
| `not-found.tsx` | Link to **Dashboard** alongside Home / Sign in. |
| `global-error.tsx` | Support-oriented copy; selectable digest / Sentry-style reference. |
| `dashboard-page-card.tsx` | 240ms ease-out hover; `motion-reduce` disables lift. |
| `globals.css` | New row **highlight pulse** = **800ms** (was 2s). |
| `studio-workspace.tsx` | Dot stagger 0.2s steps; `aria-live` on empty-state generation. |

## Already aligned before this pass

- **Button** — `whileTap` scale `0.97` + `SPRINGS.snappy`, respects `useReducedMotion`.
- **Card** — `hoverable` translate + shadow + `motion-reduce`.
- **App shell** — skip link, offline banner, error boundary, command palette (`cmdk`), route fade, mobile **Sheet** nav.
- **Confetti** — `canvas-confetti`, gated by `prefers-reduced-motion`.
- **Studio dots** — `studio-dot-wave` keyframes + reduced-motion static opacity.

## Verification

```bash
cd apps/web
pnpm exec tsc --noEmit
pnpm run lint
pnpm exec vitest run
```

**Not run in-repo for this report:** full Lighthouse matrix, axe on every authenticated route, visual regression, device smoke tests — follow **`docs/polish/LIGHTHOUSE.md`**, **`ACCESSIBILITY.md`**, **`BUNDLES.md`**.

## Follow-up (highest impact)

1. Extend Playwright axe with **auth storageState** for all `(app)` routes.
2. Run **`ANALYZE=true pnpm run build`** and archive bundle table in `docs/polish/BUNDLES.md`.
3. Optionally swap `listStagger` for `listStaggerReducedMotion` where lists use Framer stagger + `useReducedMotion()`.
