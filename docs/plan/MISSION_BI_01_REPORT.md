# Mission BI-01 — Database schema & multi-tenancy foundation (report)

**Branch:** `mission-bi-01-db-multitenancy`  
**Status:** Complete — pg_partman wired in Docker/CI, RLS contract tests expanded, seeds and docs aligned.

## What shipped

### Roles & session GUCs

- **`forge_app`** (no `BYPASSRLS`), **`forge_owner`** / **`forge_admin`** (`BYPASSRLS`, dev passwords) — see [docs/runbooks/DATABASE_ROLES.md](../runbooks/DATABASE_ROLES.md).
- Session variables: `app.current_org_id`, `app.current_tenant_id` (legacy policies), `app.current_user_id`, `app.is_admin`, `app.invitation_token` (invitation flow).
- SQL helpers `public.current_org_id()` / `public.current_user_id()` — migration `b7c8d9e0f1a2_bi01_org_rls_audit_functions_roles.py`.

### Pooling & RLS safety

- `create_async_engine` uses `pool_size=20`, `max_overflow=10`, `pool_recycle=1800`, `pool_pre_ping=True`.
- **Check-in** clears `app.current_org_id`, `app.current_user_id`, `app.is_admin` via `RESET` (fallback `set_config` to empty), plus legacy GUCs cleared with `set_config` — `apps/api/app/db/session.py`.

### Schema & RLS

- Existing Mission 01–09 schema retained; **tenant tables** use `ENABLE` + **`FORCE` RLS** and `forge_tenant_isolation` / membership policies as before.
- **`organizations`** self-policy: `id = current_org_id()`; **`audit_log`** tenant-scoped.
- Regression: **`tests/test_schema.py`**, **`scripts/check-rls.py`** (excludes partition children and pg_partman `template_public_%` template tables).

### pg_partman (BI-01 acceptance)

- Migration **`w03_bi01_pg_partman.py`** (revises **`w03_pitch_decks`**): `CREATE EXTENSION pg_partman`, drop empty `*_default` partitions, `create_parent` for `submissions` (premake 3) and `analytics_events` (premake 4), analytics retention **90 days** in `part_config`, `GRANT` refresh for `forge_app`.
- **Docker / CI** Postgres image: **`ghcr.io/dbsystel/postgresql-partman:16`** (`docker-compose.yml`, `.github/workflows/ci.yml`).
- Tests: **`tests/test_partitioning.py`** (range partitions, `part_config` rows, monthly children count).

### Seeds

- **`scripts/seed_dev.py`** — idempotent on **`lucy@reds.example`**; Reds Construction (`reds-construction`), warm cream + teal brand kit, three demo pages, two sample submissions; documents local E2E password convention (not stored in DB).
- **`scripts/seed_templates.py`** — loads **`apps/api/fixtures/templates/*.yml`** (six BI-01 fixtures) and merges **`curated_templates()`**; dependency **PyYAML**.

### Tests & CI

- **`tests/test_rls.py`** — `forge_app`: no tenant context → 0 rows; wrong tenant → 0 rows; cross-tenant INSERT/UPDATE blocked; org isolation.
- **`tests/test_migrations.py`** — single Alembic head (no divergent branches).
- **`tests/test_seed.py`** — runs `seed_dev.py` twice (idempotent).
- CI: `alembic upgrade head` → pytest → `alembic downgrade base` → `alembic upgrade head` → `scripts/check-rls.py`.

### Documentation

- [docs/architecture/DATABASE.md](../architecture/DATABASE.md), [docs/architecture/PARTITIONING.md](../architecture/PARTITIONING.md), this report.

## Verification

```bash
cd apps/api
uv sync
uv run pytest tests/test_rls.py tests/test_schema.py tests/test_partitioning.py \
  tests/test_migrations.py tests/test_seed.py
uv run python ../../scripts/check-rls.py
# Same sequence as CI:
uv run alembic downgrade base && uv run alembic upgrade head
```

Requires PostgreSQL with **pg_partman** (Docker image above or equivalent).

## Follow-ups (non-blocking)

- **Object ownership:** transfer table ownership to `forge_owner` in production cutover (roles and grants already documented).
- **Policy unification:** migrate remaining `app.current_tenant_id`-only policies to `current_org_id()` when BI-02 middleware standardizes exclusively on `app.current_org_id`.
