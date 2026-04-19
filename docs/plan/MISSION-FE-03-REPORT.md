# Mission FE-03 — App shell, auth flow & onboarding — report

**Branch:** `mission-fe-03-app-shell`  
**Date:** 2026-04-19  

## Summary

Implemented the authenticated **spine**: one sidebar + top bar, workspace switcher with **Create workspace** (`POST /api/v1/org/workspaces`), account menu, usage meter, persisted collapse, settings **horizontal tabs** (no second sidebar), onboarding gate + **one-screen** onboarding polish, dashboard tip banner, keyboard help dialog (`?`), and route stubs. Added **`PATCH /auth/me/preferences`** field `dashboard_tip_dismissed`, **`POST /auth/signout`** stub, and **`export const useSession`** as an alias for `useForgeSession`.

## Backend

| Change | Location |
|--------|----------|
| `POST /org/workspaces` — create additional org + owner membership + brand kit | `app/api/v1/organization.py`, `app/services/bootstrap.py#create_additional_workspace` |
| `UserPreferencesPatch.dashboard_tip_dismissed` | `app/schemas/auth.py`, `app/api/v1/auth.py` |
| `POST /auth/signout` — no-op OK for client-side Clerk sign-out | `app/api/v1/auth.py` |
| `CreateWorkspaceBody` | `app/schemas/org.py` |

## Frontend

| Area | Notes |
|------|--------|
| **Sidebar** | Order: Dashboard, Studio (primary styling), Analytics, Settings (`/settings/*`). Workspace switcher at top; usage bar; account email + Profile/Billing/Sign out; `postAuthSignOut` then Clerk `signOut`. |
| **Session** | `setActiveOrganizationId` defaults to `router.push("/dashboard")`; `{ navigateTo: "/onboarding" }` after creating a workspace. |
| **Top bar** | Removed duplicate account dropdown; account is sidebar-only. |
| **Toasts** | `AppToaster`: `bottom-right` desktop, `bottom-center` mobile (`useMediaQuery`). |
| **Settings** | `settings/layout.tsx` — tab links with Framer `layoutId="settings-tab-indicator"`; `settings/page.tsx` redirects to `/settings/profile`; new stubs: profile, workspace, integrations, notifications. |
| **Routes** | Stubs: `pages/[pageId]/submissions`, `automations`, `analytics`. |
| **Onboarding** | Serif headline “Let’s get you set up”; 8 curated swatches + custom color; “Finish setup” CTA. Gate uses **brand primary missing** and **zero pages**. |
| **Dashboard** | `DashboardTipBanner` with dismiss → preferences. |

## Verification

| Check | Command / note |
|--------|----------------|
| Web typecheck | `cd apps/web && pnpm run typecheck` ✅ |
| Web lint | `cd apps/web && pnpm run lint` ✅ |
| API lint | `cd apps/api && uv run ruff check …` (if `uv` env healthy on host) |

## Not automated here

- Full E2E (Clerk keys, Playwright) — same constraints as FE-02; run with `.env.local` Clerk keys.
- Axe/Lighthouse on app shell — run manually after Clerk is configured.

## Acceptance mapping

- **One primary navigation** — single sidebar; settings use a **horizontal** tab strip only.
- **Workspace switcher** — list + create + switch + cache invalidation + navigate to dashboard (or onboarding for new workspace).
- **Onboarding** — single screen, optional fields except workspace name (required in form).
- **Shortcuts** — `G` chords + `?` + ⌘K via existing command palette provider.
