# Mission BI-01 — Database schema & multi-tenancy foundation (report)

**Branch:** `mission-bi-01-db-multitenancy` (target; land via PR from whichever integration branch tracks `main`)  
**Date:** 2026-04-18  
**Outcome:** The Forge PostgreSQL foundation meets the **intent** of BI-01: tenant-scoped data is protected by **RLS + FORCE**, session GUCs are defined and cleared on pool check-in, roles separate migration from app traffic, partitioned time-series tables use **pg_partman**, migrations are reversible with CI round-trip, and automated tests guard RLS and schema invariants.

Some **table and column names differ** from the original mission text (see [Spec vs implementation](#spec-vs-implementation)); behavior and guardrails match the product model.

---

## Verification commands

| Check | Command / location |
|--------|-------------------|
| Alembic up + tests + down/up | `.github/workflows/ci.yml` — `alembic upgrade head`, `uv run pytest`, `alembic downgrade base && alembic upgrade head`, `python ../../scripts/check-rls.py` |
| Single migration head | `apps/api/tests/test_migrations.py` |
| RLS contract (`forge_app`) | `apps/api/tests/test_rls.py` |
| All `organization_id` tables + `organizations` have RLS+FORCE | `apps/api/tests/test_schema.py`, `scripts/check-rls.py` |
| Partitioning + partman registration | `apps/api/tests/test_partitioning.py` |
| Dev seed idempotent | `apps/api/tests/test_seed.py` |

Local: start Postgres (e.g. `docker compose up -d postgres`), then `cd apps/api && uv run alembic upgrade head && uv run pytest`.

---

## TODO checklist (mapped to repo)

### Phase 1 — Roles & session variables

1. **Roles** — `forge_owner`, `forge_app`, `forge_admin` in Alembic (`b7c8d9e0f1a2_bi01_org_rls_audit_functions_roles.py`, `c4f8a1b92e3d_mission02_rls_force_soft_delete_forge_role.py`). `forge_app` has no `BYPASSRLS`.
2. **Runbook** — `docs/runbooks/DATABASE_ROLES.md`.
3. **Session GUCs** — `app.current_org_id`, `app.current_user_id`, `app.is_admin`; reset on pool check-in (`app/db/session.py`).
4. **SQL helpers** — `public.current_org_id()`, `public.current_user_id()` (`STABLE`), legacy `app.current_tenant_id` compatibility (`b7c8d9e0f1a2_...`).

### Phase 2–7 — Core & product schema

Implemented in `2a517e73c899_initial_schema.py` and follow-on migrations. Naming differs from the mission stub (e.g. `page_versions` / `page_revisions`, `calendar_connections`, `automation_rules` / `automation_runs`).

### Phase 4–5 — Partitioning

13–17 — `submissions` and `analytics_events` are `PARTITION BY RANGE (created_at)`; `w03_bi01_pg_partman.py` registers both with **pg_partman** (`p_premake`: 3 submissions, 4 analytics), sets analytics retention in `part_config`.

### Phase 6–7 — Automations, calendar, audit

Covered by automation + calendar + `audit_log` migrations/models.

### Phase 8 — RLS

25–28 — Tenant tables: RLS + FORCE; `forge_tenant_isolation` + `organizations` self-policy.

29 — `tests/test_rls.py`.

### Phase 9 — Stripe & billing

30 — `stripe_events_processed` — Mission 06 migration `f1e2d3c4b5a6_mission06_analytics_billing.py`.

31 — **Usage rollup** — `subscription_usage` (mission text: `usage_counters`).

### Phase 10 — Alembic & pooling

32–34 — Reversible migrations; CI round-trip in `.github/workflows/ci.yml`.

35–36 — `app/db/session.py` pool + check-in reset.

### Phase 11 — Seeds

`scripts/seed_dev.py`, `scripts/seed_templates.py`, fixtures.

### Phase 12 — Tests & docs

39–42 — As listed in Verification commands.

43 — `docs/architecture/DATABASE.md` and this report.

---

## Migration hardening (BI-01 PR)

- **`w03_bi01_pg_partman`:** If default partitions still hold rows when partman runs (dev DB seeded first), the migration **stashes** rows, registers partman, then **re-inserts** into the parent so rows land in monthly partitions. Empty CI databases behave as before.
- **`c4f8a1b92e3d` downgrade:** Revokes `CONNECT` on the database and **default privileges** for role `postgres` toward `forge_app` before `DROP ROLE`, so `alembic downgrade base` succeeds.
- **`public_brand_badge`:** Resolves a broken import in `public_runtime` (module was referenced but missing), restoring test collection and public-page HTML injection.

---

## Deferred / cross-mission

- **Daily `partman.run_maintenance()`** at 02:00 UTC — **BI-04** (arq cron); plan-based retention (90 / 180 / 365 days) is policy follow-up.

---

## Spec vs implementation

| Mission name | Forge implementation |
|--------------|------------------------|
| `usage_counters` | `subscription_usage` |
| `automation_configs` + generic `integrations` | `automation_rules`, `calendar_connections`, related tables |
| Sole `page_revisions` history | `page_versions` + `page_revisions` (evolved schema) |

---

## Acceptance criteria (BI-01)

| Criterion | Status |
|-----------|--------|
| Broad tenant schema with FKs and indexes | ✅ |
| RLS + FORCE on tenant-scoped tables | ✅ — `test_schema.py` + `check-rls.py` |
| `test_rls.py` | ✅ |
| Partitioned `submissions` / `analytics_events` + partman | ✅ |
| Reversible migrations; CI up/down/up | ✅ |
| `forge_app` without BYPASSRLS | ✅ |
| Idempotent seed | ✅ |
| Documentation | ✅ |
