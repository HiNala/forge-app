# PostgreSQL database roles — Forge

## Roles

| Role | Purpose |
|---|---|
| **`postgres` / platform admin** | Superuser in development (Docker). Bypasses RLS. Used for local debugging; **not** the application runtime identity in production. |
| **`forge_owner`** | Intended owner account for schema objects in managed Postgres. **`BYPASSRLS`**, can run migrations. **Never** use for online API traffic. Default dev password: `forge_owner_dev_change_me` (change in production). |
| **`forge_app`** | **Application role** used by the API. **No `BYPASSRLS`.** Row-Level Security policies enforce tenant isolation. Default dev password: `forge_app_dev_change_me`. |
| **`forge_admin`** | Optional break-glass role with `BYPASSRLS` for support queries (cross-tenant aggregates). **Never** wire this role into request-scoped FastAPI dependencies. |

## Connection strings

Development (`docker-compose`):

- API process: `postgresql+asyncpg://postgres:postgres@postgres:5432/forge_dev` (superuser; bypasses RLS).
- Test RLS as `forge_app`: `postgresql+psycopg://forge_app:forge_app_dev_change_me@localhost:5432/forge_dev`.

## Session variables (RLS)

Set per request by middleware (`app/deps/db.py`):

- `app.current_user_id` — authenticated user UUID.
- `app.current_org_id` — active organization (BI-01 canonical name).
- `app.current_tenant_id` — legacy mirror of `app.current_org_id` for existing `forge_tenant_isolation` policies.

Helper SQL functions: `public.current_org_id()`, `public.current_user_id()` (see migration `b7c8d9e0f1a2_bi01_org_rls_audit_functions_roles.py`).

## Password rotation (production)

1. `ALTER ROLE forge_app PASSWORD 'new-secret';` (repeat for `forge_owner` / `forge_admin` if used).
2. Update the deployment secret that backs `DATABASE_URL` / role-specific URLs.
3. Rolling restart application workers; no schema change required.

## Critical warning

**Do not** point production `DATABASE_URL` at `forge_owner` or any `BYPASSRLS` role. Migrations may run as `forge_owner` or superuser in CI/CD only.
