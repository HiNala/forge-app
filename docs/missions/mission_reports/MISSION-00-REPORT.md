# Mission 00 — Documentation Research & Compilation — Report

**Status:** Complete  
**Branch:** `mission-00-docs` → merged to `main`  
**Date:** 2026-04-18

## Summary

Mission 00 delivers a single, searchable reference library under `docs/external/`, architecture narratives under `docs/architecture/`, a runbook placeholder for Mission 08, and locked **ADRs** so later missions do not re-debate tooling. The planning **PRD** (`docs/plan/02_PRD.md`) was updated to v1.1 to reflect decisions formerly marked “TBD.”

## What was researched

- **Frontend:** Next.js 16 App Router, React 19.2.x, Tailwind v4, TanStack Query, Zustand, Zod, shadcn/ui, Framer Motion, Lucide, `@microsoft/fetch-event-source`.
- **Backend:** FastAPI, SQLAlchemy 2 async, Alembic async, Pydantic v2, asyncpg, uv, Ruff, pytest-asyncio, arq (vs Celery), SSE (`sse-starlette` / `EventSourceResponse`).
- **Data:** PostgreSQL 16, RLS, pg_partman, Redis 7.
- **AI:** OpenAI, Anthropic, Gemini APIs; LiteLLM as unified SDK; prompt caching and token optimization notes.
- **Integrations:** Clerk (vs Auth.js), Resend, Google Calendar + OAuth setup, Stripe, Sentry.
- **Infrastructure & security:** Docker/Compose, Railway, Caddy, GitHub Actions; OWASP-oriented checklist, CSP, uploads, rate limiting.

## Decisions locked (see `docs/architecture/DECISIONS.md`)

| ADR | Decision |
|-----|----------|
| ADR-001 | **arq** for background jobs (not Celery) |
| ADR-002 | **Clerk** for auth (not Auth.js v5 for v1) |
| ADR-003 | **LiteLLM** SDK **1.83.10** (not hand-rolled adapter; not proxy mode) |
| ADR-004 | **pg_partman** for time partitioning (not manual-only Alembic partitions) |
| ADR-005–007 | pnpm, JSONB form schemas, Resend (confirmations from prior text) |

## File naming alignment

The mission spec required these filenames; they replace shorter names used in an earlier pass:

- `docs/external/backend/arq-or-celery.md` (was `arq.md`)
- `docs/external/ai/litellm-or-custom-adapter.md` (was `litellm.md`)
- `docs/external/integrations/clerk-or-authjs.md` (was `clerk.md`)

## Version verification (PyPI / npm spot-check, 2026-04-18)

Spot-checked against registries / vendor docs to avoid stale pins:

| Artifact | Checked | Result |
|----------|---------|--------|
| FastAPI | `pip index versions fastapi` | **0.136.0** — matches `docs/external/backend/fastapi.md` / STACK_VERSIONS |
| Next.js / React | `npm view next` / `npm view react` | next **16.2.4**; react **19.2.5** latest — `apps/web` pins **19.2.4** (documented in `react-19.md`) |
| LiteLLM | `pip index versions litellm` | Latest **1.83.10** — pinned in ADR-003 and `litellm-or-custom-adapter.md` |
| Clerk | `npm view @clerk/nextjs` | **7.2.3** — pinned in `clerk-or-authjs.md` and STACK_VERSIONS |

Additional manual checks: Next.js **Proxy** docs exist at [nextjs.org/docs/app/getting-started/proxy](https://nextjs.org/docs/app/getting-started/proxy) (confirms `proxy.ts` convention referenced in frontend docs).

## PRD updates

- `docs/plan/02_PRD.md` → **v1.1**: Clerk, arq, pg_partman, LiteLLM, FastAPI pin note; removed “to be decided” wording where Mission 00 locked a choice.

## Deferred / out of scope for Mission 00

- **Application code** and **monorepo app scaffolding** — Mission 01.
- **Concrete runbooks** — Mission 08 (`docs/runbooks/PLACEHOLDER.md` holds the slot).
- **Automated link checker in CI** — optional follow-up in Mission 07/08.

## Acceptance criteria checklist

- [x] All Phase 1–9 documentation deliverables present per mission doc (structure + content).
- [x] `docs/architecture/DECISIONS.md` contains ADR-001 through ADR-004 plus supplementary ADRs.
- [x] `docs/architecture/AI_ORCHESTRATION.md` is a full design (pipeline, budgets, fallback), not a stub.
- [x] `docs/external/README.md` is a navigable index with mission cross-references.
- [x] `docs/runbooks/PLACEHOLDER.md` exists for Mission 08 handoff.
- [x] This report filed at `docs/missions/MISSION-00-REPORT.md`.

## Git

- **Branch:** `mission-00-docs` — Mission 00 doc work (PRD v1.1, external index renames, this report).
- **Integration:** Merge to `main` preserves the commit history on the branch; the headline commit on `main` for the first doc drop was `docs: initial research compilation (Mission 00)` (`57dab42`), followed by follow-ups on `main` and the `mission-00-docs` branch as listed in `git log`.
