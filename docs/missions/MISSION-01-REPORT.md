# Mission 01 — API Contracts, Database Schema & Application Scaffold — Report

**Status:** Complete  
**Branch:** `mission-f01-design-foundation` (Mission 01 scaffold landed on this branch)  
**Date:** 2026-04-18

## Summary

This mission delivers the full PostgreSQL schema (including range partitioning and RLS), an initial Alembic migration, FastAPI route stubs for every endpoint in the mission brief, Pydantic scaffolding (including `StubResponse` and Studio request bodies), service and AI adapter stubs, an arq worker skeleton, Docker Compose wiring, and automated checks (Ruff, Mypy, Pytest, web `tsc`).

## Database

- **Models:** All tables from Part A under `apps/api/app/db/models/` with SQLAlchemy 2 `Mapped` annotations.
- **Migration:** `alembic/versions/2a517e73c899_initial_schema.py` — `citext` extension, tables, composite PKs for `submissions` and `analytics_events`, **range partitioning** with `DEFAULT` child partitions, `pages.published_version_id` FK added after `page_versions` exists, composite indexes, **RLS** enabled with policy `forge_tenant_isolation` on all `organization_id` tables.
- **Session variable:** `get_db` sets `app.current_tenant_id` when `X-Forge-Tenant-Id` is present (pairs with `TenantMiddleware`).

## API

- **Versioned JSON API:** `apps/api/app/api/v1/` — auth, org/brand, team, pages, studio (SSE stub via `StreamingResponse`), submissions, automations, calendar, analytics, billing, templates, admin.
- **Public HTML endpoints:** `apps/api/app/api/public_api.py` — `/p/{slug}/submit`, `/upload`, `/track` (no `/api/v1` prefix).
- **OpenAPI:** Served at `/api/v1/openapi.json`; all stubs return `StubResponse` or SSE placeholder where noted.

## Tooling

- **Backend:** `uv` + `ruff` + `mypy` + `pytest` + `pytest-asyncio` (auto mode). `litellm` added per ADR-003 with `requires-python = ">=3.12,<3.13"` and `pydantic` aligned to LiteLLM’s pin. Ruff excludes `alembic/versions/` (verbose migration SQL) while still linting `alembic/env.py`.
- **Frontend:** `apps/web` includes `typecheck` script (`tsc --noEmit`). Marketing home remains `/`; the studio shell moved to **`/dashboard`** so Next does not register two parallel pages for `/`. `next.config.mjs` sets `turbopack.root` to the monorepo root to avoid picking a parent lockfile.
- **Shared types:** `packages/types` with placeholder `src/index.ts` and `openapi-typescript` build script (run against a live API).

## Docker

- **Compose:** Postgres (healthy), Redis (healthy), API (migrations + uvicorn `--reload`), optional web dev via Node image + root `pnpm`, MinIO, worker image built from repo root `Dockerfile` in `apps/worker/`.
- **Note:** Browser calls from the host should use `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`; server-side fetch from inside containers may need an internal URL in later missions.

## Tests

- `tests/test_health.py` — `/health` returns 200.
- `tests/test_rls.py` — asserts RLS policy `forge_tenant_isolation` exists on `pages` (requires Postgres; same `DATABASE_URL` as migration).

## Deferred / follow-ups

- **Env naming:** `.env.example` uses `BACKEND_CORS_ORIGINS` to match `app/config.py` (not `CORS_ORIGINS` alone).
- **Stripe/Clerk/Resend** secrets: wired via env only; handlers are stubs.
- **OpenAPI → TypeScript:** Run `pnpm --filter @forge/types build` when `apps/api` is listening on port 8000 to regenerate `packages/types/src/index.ts`.
- **Worker:** Job bodies and idempotency in Mission 05; **pg_partman** automation in later ops work (see `docs/architecture/PARTITIONING.md`).
- **Web production Docker:** Multi-stage `apps/web/Dockerfile` assumes monorepo layout; validated further in Mission 08.

## Acceptance checklist (mission doc)

- [x] Tables and relationships match Part A; partitioned tables + RLS in migration.
- [x] Down-migration present (Alembic `downgrade`).
- [x] All Part B routes stubbed with correct paths and methods.
- [x] Pydantic strategy (`StubResponse`, examples on Studio bodies).
- [x] FastAPI + Next scaffolds present; official tooling (`uv`, `pnpm create` history reflected in repo evolution).
- [x] `docker compose` definitions with healthchecks (API uses Python urllib healthcheck).
- [x] CI: lint/typecheck/test for web + api.
