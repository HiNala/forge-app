# Mission FE-03 — App shell, auth flow & onboarding — report

**Branch:** `mission-fe-03-app-shell`  
**Date:** 2026-04-19  

## Summary

The authenticated experience is built around a single **AppShell**: **Sidebar** (collapse, workspace switcher, plan usage, account menu), **TopBar** (mobile nav sheet, search affordance, notifications), and a scrollable **main** region. **Session** comes from **`useForgeSession()` / `useSession()`** (`SessionProvider`) backed by `GET /auth/me` and `POST /auth/switch-org`. **Onboarding** is one screen (workspace name, brand color, optional logo with preview/remove). **Settings** use a **horizontal tab strip only** — no nested settings sidebar.

## Verification

| Check | Command / note |
|--------|----------------|
| Typecheck | `cd apps/web && pnpm run typecheck` |
| Lint | `pnpm run lint` |
| Build | `pnpm run build` |
| E2E (full) | Requires Clerk keys in `.env.local` — see `docs/plan/MISSION-FE-02-REPORT.md` |
| Axe (app) | `e2e/app-shell.spec.ts` runs axe on `/dashboard` when already authenticated; otherwise skips |

## Backend contracts used

- `PATCH /api/v1/auth/me/preferences` — `sidebar_collapsed`, `dashboard_tip_dismissed`, etc.
- `POST /api/v1/auth/switch-org`, `POST /api/v1/auth/signout`, `POST /api/v1/org/workspaces`
- `PUT/PATCH` brand/org from onboarding (`putBrand`, `patchOrg`, `postBrandLogo`)

## Deferred / manual

- Full Playwright flows (sign in → onboarding → dashboard → switch workspace) need **Clerk test users** or storage state.
- Studio “auto-collapse sidebar in active state” can be layered in a polish pass if not already in `StudioWorkspace`.

## Honesty

- **Theme toggle** in the account menu remains disabled (MVP), per prior product choice.
