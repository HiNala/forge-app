# Row-level security audit (GL-03)

## Structural check (CI)

`scripts/check-rls.py` runs in `.github/workflows/ci.yml` and fails if any tenant-scoped table with `organization_id` lacks RLS + `FORCE ROW LEVEL SECURITY`.

## Cross-tenant audit (deep)

`scripts/rls_cross_tenant_audit.py` wraps the structural check and reserves hooks for **cross-tenant** INSERT/SELECT/UPDATE probes using the `forge_app` role (no `BYPASSRLS`).

Set:

```text
FORGE_RLS_AUDIT_DATABASE_URL=postgresql+psycopg://forge_app:PASSWORD@host:5432/dbname
```

The migration-created dev password is documented in Alembic (rotate for non-dev environments). Deep matrix expansion should iterate every table from `information_schema` (or a shared registry) and run the org-context probes described in mission GL-03 § Phase 8.

## Worker context

Worker jobs must call `SET LOCAL app.current_org_id` (via session helpers) before tenant writes — add integration tests under `apps/api/tests/` when worker paths are enumerated.
