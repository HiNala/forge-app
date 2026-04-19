# Forge — Implementation status vs. planning package

**Purpose:** Map the repository to [00_README.md](./00_README.md), the [PRD](./02_PRD.md), and missions **00–09**. Frontend-only detail: [FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md). Percentages are engineering judgment (“shippable depth,” not line count). Updated as the codebase evolves.

**Legend:** ✅ substantial · ⚠️ partial / stub · ❌ not started

**Last audited:** 2026-04-19 — `apps/api` **48** pytest tests (`tests/README.md`); submissions **CSV export** (`GET …/submissions/export`) + list + public submit; Postgres-backed tests skip when DB is down. If `uv` cannot refresh `.venv` on Windows, use e.g. `UV_PROJECT_ENVIRONMENT=.venv-forge` before `uv sync`.

---

## Quick verification (local)

| Check | Command |
|--------|---------|
| API tests | `cd apps/api && uv run pytest tests/` |
| API lint/types | `cd apps/api && uv run ruff check . && uv run mypy app` |
| Web | `cd apps/web && pnpm run typecheck && pnpm run lint` |
| Web E2E (Playwright) | `cd apps/web && pnpm run test:e2e` — requires `.env.local` Clerk keys; see [MISSION-FE-02-REPORT.md](./MISSION-FE-02-REPORT.md) |

---

## Executive summary

| Area | Approx. done | Notes |
|------|----------------|--------|
| **Mission 00 — Docs research** | ✅ 85% | `docs/external/` + architecture decisions exist; ongoing curation |
| **Mission 01 — Contracts & scaffold** | ✅ 75% | Monorepo, Alembic schema, FastAPI routers, Next app; some endpoints still stubs |
| **Mission 02 — Foundation** | ⚠️ 60% | Clerk, orgs, RLS, brand API, middleware, tests; not every edge case hardened |
| **Mission 03 — Studio + AI** | ⚠️ 62% | **SSE** `/studio/generate` & `/refine`; **anonymous** `POST /api/v1/public/demo` (marketing hero); LiteLLM router + orchestration; `StudioWorkspace` + section edit; publish handoff and quota hardening still open — see [ui/FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md) |
| **Mission 04 — Live pages** | ⚠️ 70% | Publish + public GET + submit + list + **CSV export**; upload presign, CSP, preview token, custom domain still open |
| **Mission 05 — Automations** | ⚠️ 25% | Models/services sketched; Resend/Calendar/rule engine not end-to-end |
| **Mission 06 — Analytics, billing, teams** | ⚠️ 40% | Team/brand/billing routes; Stripe webhook path; analytics dashboards stub |
| **Mission 07 — Polish** | ⚠️ 35% | Lint/type/test for touched areas; WCAG/Lighthouse “green” not verified globally |
| **Mission 08 — Railway deploy** | ⚠️ 20% | Docker/compose; Railway runbooks/CI breadth varies by branch |
| **Mission 09 — Templates** | ⚠️ 15% | Templates route placeholder; marketplace out of 1.0 scope per PRD |

**Overall vs. PRD 1.0:** roughly **52–60%** — publish + public HTML path exists; **submissions on live pages**, **automations**, and **commercial hardening** remain the largest gaps.

---

## PRD 1.0 checklist (condensed)

| PRD item | Status |
|---------|--------|
| Clerk auth + orgs + RBAC | ⚠️ |
| Brand kit | ✅ (app + API) |
| Studio chat + refine + section edit (API) | ⚠️ (backend streams; UI not complete) |
| Publish + live URL + custom domain | ⚠️ (publish + `/p/{org}/{slug}`; custom domain ❌) |
| Submissions + files + idempotency | ⚠️ (public JSON/text submit ✅; files / worker idempotency ❌) |
| Page admin (Overview / Submissions / Automations / Analytics) | ⚠️ (submissions list + **CSV export** API ✅; UI wiring still partial) |
| Automations (email + calendar) | ❌ / stub |
| Analytics (tenant) | ⚠️ stub |
| Stripe billing | ⚠️ partial |
| Team invites | ⚠️ partial |
| Multi-provider LLM | ⚠️ providers + router present |
| Docker / Railway / CI | ⚠️ |

---

## By mission document

### [03 — Docs research](./03_MISSION_00_DOCS_RESEARCH.md)
- External docs harvested under `docs/external/` ✅
- ADRs / stack decisions ⚠️ verify `docs/architecture/` on each release

### [04 — Contracts & scaffold](./04_MISSION_01_CONTRACTS_SCAFFOLD.md)
- DB tables + Alembic ✅
- Pydantic models for core resources ✅
- OpenAPI via FastAPI ✅
- Next + FastAPI apps ✅

### [05 — Foundation](./05_MISSION_02_FOUNDATION.md)
- RLS policies ✅ (with ongoing verification)
- Tenant header + session ✅
- Brand kit CRUD ✅

### [06 — Studio AI](./06_MISSION_03_STUDIO_AI.md)
- Provider abstraction + orchestration modules ✅
- SSE `/studio/generate`, `/refine`, section-edit persistence ✅ (with ongoing polish)
- **`POST /api/v1/public/demo`** — anonymous SSE for landing hero (rate-limited per IP) ✅
- Intent / composer / section editor ⚠️ (LLM-dependent; fallbacks + tests cover core paths)

### [07 — Live pages](./07_MISSION_04_LIVE_PAGES.md)
- Page CRUD ✅
- Publish → `PageVersion`, Redis `page:live:…`, public `GET /api/v1/public/pages/{org}/{slug}` ✅
- Next `(public)/p/[org]/[slug]` (iframe `srcDoc`) ✅
- **`POST /p/{org}/{slug}/submit`** — live page only, validates `form_schema.required`, stores anonymized IPv4 /24 ✅
- **`GET /api/v1/pages/{page_id}/submissions`** — cursor pagination (`before` / `next_before`) ✅
- **`GET …/submissions/export`** — streaming CSV (`text/csv`), `Content-Disposition` attachment ✅
- Presigned upload, custom domain, strict CSP, worker enqueue ❌ / partial

### [08 — Automations](./08_MISSION_05_AUTOMATIONS.md)
- Rule engine + Resend + Calendar ❌ / stub

### [09 — Analytics & billing & teams](./09_MISSION_06_ANALYTICS_BILLING_TEAMS.md)
- Team endpoints ⚠️
- Stripe ⚠️
- Analytics feeds ⚠️ stub

### [10 — Polish](./10_MISSION_07_POLISH.md)
- Not complete repo-wide ❌

### [11 — Railway](./11_MISSION_08_RAILWAY_DEPLOY.md)
- Partial ❌

### [12 — Templates](./12_MISSION_09_TEMPLATES.md)
- Post-launch; placeholder UI only ⚠️

---

## What “done” means for the next milestones

1. **Mission 04 completion:** stable public URL ✅; **public submit** ✅; **CSV export** ✅; presigned uploads, worker idempotency, CSP, custom domain remain.
2. **Mission 05 completion:** notify + confirm emails; OAuth + calendar create behind feature flags.
3. **Mission 06 completion:** usage-linked billing; analytics charts from real events.
4. **Mission 07 completion:** a11y audit, perf budget, security pass on public endpoints.

This file should be updated when a mission merges or when major stubs are replaced.
