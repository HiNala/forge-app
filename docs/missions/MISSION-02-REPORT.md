# Mission 02 — Foundation: Auth, Multi-Tenancy, Brand Kit — Report

**Status:** Complete (Mission 02 acceptance + security tests 34–36)  
**Branch:** `mission-02-foundation`  
**Date:** 2026-04-19  
**Re-verified:** 2026-04-20 — codebase audit against mission TODO 1–40; no functional gaps found. README onboarding path corrected (`/onboarding`); `app/middleware/auth.py` documents JWT entry points.

## Summary

Mission 02 wires **Clerk** (ADR-002) on the Next.js app, **JWT verification** and **tenant-scoped RLS** on the FastAPI API, **organization / team / brand / pages** endpoints needed for isolation and product flows, **Redis-backed** team-invite rate limiting, **S3/MinIO** logo upload, **Resend** invitation email, **`forge_app`** database role with **FORCE ROW LEVEL SECURITY**, CI **`scripts/check-rls.py`**, and integration tests for **cross-tenant page access** plus **RLS checks** using the non-superuser role.

## Authentication

- **Frontend:** `@clerk/nextjs`, `ClerkProvider`, `middleware.ts` protecting configured prefixes (`PROTECTED_PREFIXES`), sign-in/up routes, `SessionProvider` + **`useForgeSession()`** (React Query + `getMe` / `postSwitchOrg` in `apps/web/src/lib/api.ts`).
- **Backend:** `app/security/clerk_jwt.py` (JWKS / RS256), `require_user`, optional/required tenant resolution via **`x-forge-active-org-id`** (alias `x-forge-tenant-id`), `get_db` sets `app.current_user_id` and `app.current_tenant_id` for RLS.
- **Signup:** `POST /api/v1/auth/signup` creates User + Organization + Owner membership + BrandKit (idempotent paths) using `get_db_no_auth` + session vars inside `ensure_user_org_signup` for membership RLS.
- **Webhooks:** `POST /api/v1/auth/webhook` with **Svix** verification (`401` on bad signature).

## Multi-tenancy & RLS

- **Migration** `c4f8a1b92e3d_mission02_rls_force_soft_delete_forge_role.py`: `organizations` / `users` soft-delete columns, **FORCE ROW LEVEL SECURITY** on tenant tables, **split membership policies** (self-list + tenant admin), **invitation token SELECT** policy, **`forge_app`** role + grants.
- **`scripts/check-rls.py`:** Asserts every `public` table with `organization_id` (excluding **partition children**) has RLS enabled and **FORCE**. CI runs it after Alembic.
- **Docs:** `docs/architecture/MULTI_TENANCY.md`, `docs/runbooks/TENANT_ISOLATION.md` (operational story for new tables).

## Team & RBAC

- **Endpoints:** invites, accept, list members, patch/remove member; **`require_role("owner")`** on owner-only actions; last-owner demotion/removal rules enforced in handlers.
- **Rate limit:** `rate_limit_team_invite` uses **Redis** from `app.state.redis` (10/min default; 11th returns **429**).

## Brand kit

- **`GET/PUT /api/v1/org/brand`**, **`POST /api/v1/org/brand/logo`** (validation + MinIO key `org/{org_id}/brand/logo.{ext}`).
- **Frontend:** `settings/page.tsx` hub; **`settings/team/page.tsx`** (members, owner-gated invite/remove/role); **`settings/brand/page.tsx`** (colors, Google Fonts list, logo drag-drop, voice note; save on blur / select). **`BrandThemeProvider`** + **`[data-forge-tenant]`** CSS map tenant **BrandKit** to app-shell accent + fonts (not generated pages). **`OnboardingGate`** redirects to `/onboarding` when `primary_color` is unset until the user completes onboarding or chooses **Skip** (`sessionStorage` key per org).

## Tests

- **`tests/test_tenant_isolation.py`:** API list/get/patch cross-tenant **404**; SQL count **0** for wrong tenant as **`forge_app`**.
- **`tests/test_team_security.py`:** Last owner cannot demote to non-owner (**400**); expired invitation cannot be accepted (**400**); team-invite rate limit (**429** on 11th request) with in-memory Redis stub on `app.state.redis`.

## Configuration

Set at minimum:

- **Clerk:** `CLERK_JWKS_URL`, `CLERK_JWT_ISSUER`, optional `CLERK_AUDIENCE`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_*` (web).
- **API:** `APP_PUBLIC_URL`, `BACKEND_CORS_ORIGINS`, storage and Resend vars for full flows.

## Design / external assets

- The linked **Anthropic design export** (`api.anthropic.com/v1/design/...`) returned **404** from this environment (likely auth-gated or internal). UI follows existing Forge tokens (`tokens.css`, app shell). If you export Figma/PDF or paste specs, we can align spacing and components in a follow-up.

## Follow-ups

- E2E with real Clerk keys in staging.
- Optional: tighten RLS policies to avoid `''::uuid` edge cases when session vars are cleared with empty strings.
- Partition **default** tables inherit parent RLS in Postgres 11+ — confirm behavior in your Postgres version if you add new partitions.

## Acceptance checklist (mission doc)

- [x] Clerk SDK + middleware + session hook pattern.
- [x] Backend JWT + `/auth/me` + `/auth/switch-org` + webhook verification.
- [x] Tenant middleware semantics + RLS session variables.
- [x] `forge_app` role documented; FORCE RLS migration.
- [x] Org/team/brand/pages endpoints for Mission 02 scope.
- [x] `check-rls.py` in CI.
- [x] Cross-tenant API + RLS-oriented tests; owner / expired invite / invite rate-limit tests.
- [x] Developer docs + seed script path.
