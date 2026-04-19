# Tenant isolation runbook

This document ties together **RLS**, **FastAPI dependencies**, and **CI** so new tables stay safe.

## How it fits together

1. **Clerk** authenticates the user; the API verifies the Bearer JWT (JWKS, RS256).
2. **`require_user`** loads the `User` row by `auth_provider_id`.
3. **`optional_tenant` / `require_tenant`** validate the active org from `x-forge-active-org-id` (or alias `x-forge-tenant-id`) against `Membership`.
4. **`get_db`** runs `set_config('app.current_user_id', ...)` and, when present, `set_config('app.current_tenant_id', ...)` so PostgreSQL RLS policies apply.
5. **`scripts/check-rls.py`** (CI) fails the build if any **non-partition-child** table with `organization_id` is missing RLS or **FORCE**.

## Adding a new tenant-scoped table

1. Add `organization_id` FK on the model.
2. In Alembic: `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and a policy consistent with existing tables (see latest migration under `apps/api/alembic/versions/`).
3. **Memberships** and **invitations** have special policies — copy patterns from `c4f8a1b92e3d_*` rather than inventing new semantics.
4. Run `uv run python scripts/check-rls.py` locally (with `DATABASE_URL` pointing at a migrated DB).
5. Add or extend API tests using `AUTH_TEST_BYPASS` + `x-forge-test-user-id` / `x-forge-active-org-id` headers.

## Production database role

Migrations create **`forge_app`** (password must be rotated in real environments). The app should use this role in production so **superuser bypass of RLS** never applies. Local dev often uses `postgres` for convenience; keep CI and staging on `forge_app` to catch RLS mistakes.

## When something goes wrong

- **Empty result sets everywhere:** Check headers (`x-forge-active-org-id`) and that `get_db` ran after `require_user`.
- **500 / invalid uuid in RLS:** Avoid clearing session vars with empty strings; use valid UUIDs or unset via transaction boundaries.
- **Partition tables:** Parent table holds RLS; `check-rls.py` ignores inheritance children (`pg_inherits`).
