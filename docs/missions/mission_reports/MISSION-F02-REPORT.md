# Mission F02 — App shell, auth & onboarding (report)

## Summary

Frontend Mission F02 wraps Forge in **Clerk** (per ADR-002), protects `apps/web` app routes with **`middleware.ts`**, and delivers sign-in / sign-up marketing surfaces, a **one-screen onboarding** wizard (workspace + brand), and a cohesive **app shell**: **`Sidebar`** (collapse with localStorage + `PATCH /api/v1/auth/me/preferences`), **`TopBar`** (breadcrumb for nested routes, ⌘K command palette via `cmdk`, notifications bell stub), **workspace switcher** (`POST /api/v1/auth/switch-org` + TanStack Query invalidation), Gmail-style **`G` then letter** navigation, **Framer** `fadeIn` on main content by route, mobile **Sheet** drawer, and **error / not-found / global-error** boundaries. Placeholder routes exist for **Studio**, **Templates**, **Analytics**, and **Settings** so navigation never 404s inside the shell.

## Delivered (acceptance mapping)

| Area | Status |
| ---- | ------ |
| Auth provider + `AppProviders` | **Done** — `@clerk/nextjs`; `SessionProvider` + React Query for `/auth/me`. |
| Middleware → `/signin?next=` | **Done** — `clerkMiddleware` + `createRouteMatcher` driven by `PROTECTED_PREFIXES` in `src/lib/protected-routes.ts`. |
| `useSession()` + typed API + org header | **Done** — `src/lib/auth.ts` re-exports `useForgeSession` as `useSession`; `src/lib/api.ts` sends Bearer token + `x-forge-active-org-id`; 401/402/403/429 handling. |
| Sign-in / sign-up | **Done** — `(marketing)/signin`, `(marketing)/signup`, `signup/continue` → Forge `POST /auth/signup`. |
| Onboarding | **Done** — `(app)/onboarding` — PATCH org, PUT brand, optional logo POST; `successSpring` + teal live preview. |
| Sidebar / TopBar / command palette | **Done** — `src/components/chrome/*`; tooltips `data-tip` when collapsed; active nav bar + accent styles. |
| Workspace switch + query refresh | **Done** — switch + invalidate `["me"]` and `["notifications-unread"]` (`src/lib/query-keys.ts`). |
| Mobile shell | **Done** — `AppShell` + `TopBar` hamburger + `Sheet` + `Sidebar`. |
| Notifications stub | **Done** — `GET /org/notifications/unread-count` + bell + Sheet placeholder. |
| Error surfaces | **Done** — `(app)/error.tsx` (shows Next **digest** as reference until Sentry), `(app)/not-found.tsx`, `global-error.tsx`. |
| Tests | **Done** — `vitest` in `apps/web`: route protection, UI store, query-key contract. |
| axe / Lighthouse | **Manual** — run on `signin`, `signup`, `onboarding` in CI or locally when Clerk env is set. |
| PR / branch | **Contributor** — branch **`mission-f02-shell-auth-onboarding`**; open PR when ready. |

## Deferred / follow-ups

- **Second workspace for existing users** — UI explains API milestone; backend signup idempotency blocks duplicate orgs; full **Create workspace** POST when backend exposes a dedicated route.
- **Leave workspace** — destructive row in switcher shows a placeholder toast until `DELETE`/leave API exists.
- **Sentry** — `error.tsx` / `global-error.tsx` log to console and show `error.digest`; swap to Sentry event ID when `@sentry/nextjs` is added.
- **Command palette “Pages”** — stub row until page list API (F03).
- **E2E** — full “unauthenticated → `/dashboard` → redirect” and Clerk happy-path are best verified with Playwright + test Clerk or preview deploy.

## Verification run (local)

- `pnpm --filter web build`
- `pnpm --filter web test`
- `pnpm --filter web lint`

## Git

Commit from branch **`mission-f02-shell-auth-onboarding`** so F01/F02/backend tracks stay reviewable.
