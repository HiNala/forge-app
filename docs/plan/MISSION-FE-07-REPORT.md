# Mission FE-07 — Polish, Micro-Interactions, Accessibility & Performance

**Branch:** `mission-fe-07-polish`  
**Date:** 2026-04-19  
**Status:** Partial — foundational polish merged; full route sweep remains manual/CI-dependent.

## What shipped

### Motion & feedback

- **Buttons:** Press scale `0.97` over **120ms**; **`motion-reduce:active:scale-100`** for accessibility.
- **Cards:** Hover lift uses **`duration-[var(--duration-base)]`** (~240ms territory); **`motion-reduce:hover`** removes translate lift.
- **App shell:** Main content uses **`fadeIn` / `fadeInReduced`** from `@/lib/motion` when **`prefers-reduced-motion`** is set.
- **Studio:** Generation footer uses **three-dot wave** (`studio-dot-wave` + `studio-dot-wave` keyframes) with **`role="status"`** + **`aria-live="polite"`** instead of a generic spinner; respects reduced-motion CSS.
- **First publish:** **`fireFirstPublishConfetti()`** (`canvas-confetti`, dynamic import) runs once per browser profile (existing `forge:first-page-live-celebration` key) and skips when reduced motion is requested.

### Shell & resilience

- **Skip link** — keyboard-only visible; targets **`#main-content`** on **`motion.main`**.
- **Offline banner** — **`useOnlineStatus`**, retry via React Query **`invalidateQueries`**.
- **`AppErrorBoundary`** — class boundary around app main children with friendly reload.
- **`global-error.tsx`** — root fallback with digest line for support correlation; imports **`globals.css`** + theme class on `<html>`.

### Command palette (Cmd/Ctrl+K)

- **Recent** items from **`localStorage`** (`forge:cmdk-recent-v1`).
- **Live data:** **`listPages`**, **`getTeamMembers`** when a workspace is active.
- **Settings** shortcuts for every tab; **Actions** (create page, invite, billing).
- Accessible naming: **`h2`**, **`aria-describedby`** description for the dialog.

### Performance

- **Recharts** split behind **`LazyOrgAnalyticsView` / `LazyPageAnalyticsView`** in **`analytics-views-lazy.tsx`** (`next/dynamic`, **`ssr: false`**).
- **`@next/bundle-analyzer`** optional via **`ANALYZE=1`** in **`next.config.mjs`**.

### Global CSS

- **`env(safe-area-inset-bottom)`** on **`body`**; main padding uses **`max(1.5rem, env(safe-area-inset-bottom))`**.
- **`webkit-tap-highlight-color: transparent`** on interactive controls.
- **`::selection`** already uses accent + white text (FE-07 item).

### Copy & errors

- **`(app)/error.tsx`** — support-oriented wording for digest line.
- **Shortcuts help** — clearer phrasing in **`SHORTCUTS_HELP`**.

### Bugfix during pass

- **`org-analytics-view`:** restored **`aiTokens`** binding for KPI card.

## Verification

| Check | Command |
|--------|---------|
| Types | `cd apps/web && pnpm exec tsc --noEmit` |
| Build | `cd apps/web && pnpm run build` |
| Unit tests | `cd apps/web && pnpm test` |

## Deferred / manual (mission checklist)

- Lighthouse scores per route — template in **`docs/polish/LIGHTHOUSE.md`**.
- Axe on every authenticated route — **`docs/polish/ACCESSIBILITY.md`**.
- Bundle numbers — **`docs/polish/BUNDLES.md`** after **`ANALYZE=1`**.
- Full mobile pass (375px), table→card audit on all tables, dialog focus restore audit on every Dialog.
- Published-page Lighthouse regression.
- Marketing layout skip link (optional parity).

## Removed / not added

- No service worker (per PRD).
- Sentry ID on **`error.tsx`** uses Next **digest** when present (full Sentry wiring is env-specific).
