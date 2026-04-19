# Forge — Backend Planning Package

**Project:** Forge — AI-Powered Mini-App Builder  
**Purpose:** Entry point for backend work: reference docs, sequential backend missions (BE-00–BE-09), how they unlock the frontend, stack facts, and non-negotiable API/data invariants. User case reports and the PRD live alongside this folder; mission files are in the parent `docs/plan/` directory.

**Related:** [Frontend missions](../ui/00_README.md) · [Root plan index](../00_README.md)

---

## Where it lives in the repo

| Area | Path |
|------|------|
| FastAPI app (routes, deps, services) | `apps/api/app/` |
| Alembic | `apps/api/alembic/` |
| API tests | `apps/api/tests/` |
| Background worker (arq) | `apps/worker/` |
| Local orchestration | `docker-compose.yml` (root) |
| Env template | `.env.example` (root) |
| Mission completion notes | `docs/missions/` |

---

## Architecture docs (deeper than the PRD)

Read these when touching the subsystem; they complement [02_PRD.md](../02_PRD.md).

| Doc | Topic |
|-----|--------|
| [DECISIONS.md](../../architecture/DECISIONS.md) | ADRs (auth, queue, RLS, AI routing) |
| [MULTI_TENANCY.md](../../architecture/MULTI_TENANCY.md) | RLS, session GUCs, `forge_app` role |
| [DATA_MODEL_OVERVIEW.md](../../architecture/DATA_MODEL_OVERVIEW.md) | Entities and relationships |
| [PARTITIONING.md](../../architecture/PARTITIONING.md) | Time-partitioned tables |
| [AI_ORCHESTRATION.md](../../architecture/AI_ORCHESTRATION.md) | Intent → compose → validate flow |
| [OBSERVABILITY.md](../../architecture/OBSERVABILITY.md) | Logging, metrics, Sentry |
| [STACK_VERSIONS.md](../../architecture/STACK_VERSIONS.md) | Pinned runtime versions |

---

## Reading Order

### Reference documents (read first)

1. **[01_USER_CASE_REPORTS.md](../01_USER_CASE_REPORTS.md)** — User flows, entity list, principles, mission sequencing.
2. **[02_PRD.md](../02_PRD.md)** — Architecture, env vars, invariants, scope, mission map.

### Backend missions (BE-00 — BE-09)

Run **sequentially**. Each mission file is one level up:

3. **[03_MISSION_00_DOCS_RESEARCH.md](../03_MISSION_00_DOCS_RESEARCH.md)** — Compile external docs into `docs/external/`.
4. **[04_MISSION_01_CONTRACTS_SCAFFOLD.md](../04_MISSION_01_CONTRACTS_SCAFFOLD.md)** — Schema, API contracts, FastAPI + Alembic scaffold, OpenAPI stubs.
5. **[05_MISSION_02_FOUNDATION.md](../05_MISSION_02_FOUNDATION.md)** — Clerk (or Auth.js), tenants, RLS, `app.current_tenant_id`, brand kit.
6. **[06_MISSION_03_STUDIO_AI.md](../06_MISSION_03_STUDIO_AI.md)** — Intent parser, page composer, section editor, SSE (`/studio/generate`, `/studio/refine`).
7. **[07_MISSION_04_LIVE_PAGES.md](../07_MISSION_04_LIVE_PAGES.md)** — Publish, `/p/{slug}/submit`, uploads, submissions admin.
8. **[08_MISSION_05_AUTOMATIONS.md](../08_MISSION_05_AUTOMATIONS.md)** — Resend, Google Calendar OAuth, automation rules + worker jobs.
9. **[09_MISSION_06_ANALYTICS_BILLING_TEAMS.md](../09_MISSION_06_ANALYTICS_BILLING_TEAMS.md)** — Analytics ingestion, Stripe + webhooks, teams/RBAC polish.
10. **[10_MISSION_07_POLISH.md](../10_MISSION_07_POLISH.md)** — PRD sweep, security, tests, performance, observability.
11. **[11_MISSION_08_RAILWAY_DEPLOY.md](../11_MISSION_08_RAILWAY_DEPLOY.md)** — Railway, Redis/Postgres, workers, Caddy, runbooks.
12. **[12_MISSION_09_TEMPLATES.md](../12_MISSION_09_TEMPLATES.md)** — Curated global templates (post-launch).

---

## Execution mapping (what backend unlocks)

| Backend milestone | Unlocks (high level) |
|---|---|
| BE-01 Contracts + scaffold | OpenAPI, DB migrations, stub routes in `apps/api` |
| BE-02 Foundation | Auth deps, tenant middleware, RLS session vars, org/brand/team APIs |
| BE-03 Studio + AI | SSE generation, orchestration services, section edits |
| BE-04 Live pages | Public submit/track routes, presigned uploads, page publish |
| BE-05 Automations | Email + calendar services, arq workers, idempotent jobs |
| BE-06 Analytics / billing / teams | Event ingestion, Stripe lifecycle, quotas, invitations |
| BE-07 Polish | Hardening, CI, load/rate-limit tuning |
| BE-08 Deploy | Production config, secrets, monitoring |
| BE-09 Templates | Admin + public template APIs |

**Frontend pairing** (detail): [Execution mapping in the UI package](../ui/00_README.md#execution-mapping).

**Inverse view** (which backend work each frontend mission needs):

| Frontend mission | Backend prerequisite |
|------------------|----------------------|
| FE-01 Design System | BE-01 scaffold |
| FE-02 Marketing | BE-01 scaffold |
| FE-03 App Shell + Auth + Onboarding | BE-02 auth + orgs |
| FE-04 Studio | BE-03 AI + SSE |
| FE-05 Dashboard + Page Detail | BE-04, BE-05 |
| FE-06 Analytics + Settings | BE-06 analytics / billing / teams |
| FE-07 Polish | All prior FE milestones |

---

## Stack at a glance (backend)

- **Runtime:** Python 3.12 · **FastAPI** · **SQLAlchemy 2.0** (async) · **Alembic** · **Pydantic v2** · **uv** · **Ruff** · **pytest-asyncio** · **arq**
- **Data:** PostgreSQL 16 · **RLS** on all tenant-scoped tables · monthly partitions for high-volume tables · **Redis** (rate limits, queue, cache)
- **Object storage:** MinIO (dev) / S3 or R2 (prod)
- **Auth:** Clerk JWT verification · alignment with Next.js session / org switcher via `Authorization` + active-org header
- **Integrations:** Resend · Google Calendar · Stripe webhooks · Sentry (optional)
- **AI:** LiteLLM-style routing / provider adapters; dual-tier models (compose vs section-edit)
- **App code:** `apps/api/app/` — `api/v1`, `api/public_api`, `deps`, `middleware`, `services`, `schemas`, `db`

---

## Non-negotiable backend invariants

1. **Multi-tenant by default.** Any row with tenant data has `organization_id` and is covered by RLS; app session sets `app.current_user_id` and (when present) `app.current_tenant_id` before queries.
2. **Contracts are the product boundary.** Mission 01 Part B paths and methods stay the source of truth until an intentional versioned revision (document in PRD/mission report).
3. **No fake metrics.** API responses and health checks report real state; stubs must be clearly named or gated by env.
4. **Secrets and webhooks.** Stripe and Clerk webhooks verify signatures when secrets are configured; raw body for Stripe before JSON parse.
5. **Operational hygiene.** Structured logging in production (no stray `print`); external calls have timeouts; background jobs are idempotent.

---

## Expert lenses (backend review)

Use these as **checklists** during polish and PR review — not as extra scope creep.

- **Kleppmann / Hellerstein** — data isolation, exactly-once vs at-least-once jobs, partition strategy
- **Fowler / Vernon** — boundaries: API vs domain vs integration adapters
- **OWASP API / ASVS** — authn/z, rate limits, injection, SSRF on outbound integrations
- **SRE (Google)** — SLOs for submit latency, job backlog depth, error budgets
- **Postgres** — RLS policy review, index usage on `(organization_id, …)`, migration reversibility

---

## Three rules for every backend mission

1. Read the PRD and user case reports before changing schema or contracts.
2. Land migrations and API changes together when possible; keep OpenAPI accurate.
3. **Do not stop until every item on the mission TODO list is verified complete. Do not stop until every item on the mission TODO list is verified complete. Do not stop until every item on the mission TODO list is verified complete.**

---

## Local verification (backend)

From `apps/api/` with dependencies installed (`uv sync`):

- **Lint:** `uv run ruff check app tests`
- **Tests:** `uv run pytest`
- **Migrations:** `uv run alembic upgrade head` (Postgres must match `DATABASE_URL`)

With Docker: `docker compose up` from the repo root, then hit `GET http://localhost:8000/health` and `http://localhost:8000/api/v1/openapi.json`.
