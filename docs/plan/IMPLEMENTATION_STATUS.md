# Forge — Implementation status vs. planning package

**Purpose:** Map the repository to [00_README.md](./00_README.md), the [PRD](./02_PRD.md), and missions **00–09**. Frontend-only detail: [FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md). Percentages are engineering judgment (“shippable depth,” not line count). Updated as the codebase evolves.

**Legend:** ✅ substantial · ⚠️ partial / stub · ❌ not started

**Last audited:** 2026-04-20 — `apps/api` **170** pytest tests (`uv run pytest tests/` with Postgres + `alembic upgrade head`); `apps/web` `pnpm run typecheck` + `pnpm run lint` + `pnpm run test` + `pnpm run build` clean. On Windows, if `uv` hits `.venv` lock errors, set `UV_PROJECT_ENVIRONMENT=.venv-forge` (see `tests/README.md`) before `uv sync` / `uv run`. Apply DB migrations before API tests: `cd apps/api && uv run alembic upgrade head`.

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
| **Mission 04 — Live pages** | ⚠️ 72% | Publish + public GET + submit (**arq `run_automations` enqueue** when Redis up) + list + CSV; idempotent job keys / presign upload / CSP / preview / custom domain still open |
| **Mission 05 — Automations** | ⚠️ 65% | Resend templates + `EmailService`; `AutomationEngine` (notify/confirm/calendar); Google OAuth + calendar events; worker runs engine; automations UI + reply endpoint; failure banner / digest / Apple / full E2E tests still open |
| **Mission 06 — Analytics, billing, teams** | ⚠️ 68% | Analytics aggregates + API routes; Stripe plan/portal/checkout + webhooks; team invites/roles; **FE-06** surfaces analytics + settings/billing in `apps/web` — E2E + hardening partial |
| **Mission 07 — Polish** | ⚠️ 42% | Backend/API + repo sweep partial (see `10_MISSION_07_POLISH.md`); global WCAG/Lighthouse proof still open (complementary **FE-07** polish in `apps/web` tracked in `ui/FRONTEND_STATUS.md`) |
| **Mission 08 — Railway deploy** | ⚠️ 20% | Docker/compose; Railway runbooks/CI breadth varies by branch |
| **Mission 09 — Templates** | ⚠️ 15% | Templates route placeholder; marketplace out of 1.0 scope per PRD |
| **W-02 — Contractor proposal** | ⚠️ partial | `proposals` + questions + templates + numbering + deterministic render + public view/Q&A/accept/decline + change orders; emails, signed PDF worker fidelity, Studio line editor, org analytics dashboard, expiration job + E2E still open — see `MISSION_W02_REPORT.md` |
| **W-03 — Pitch deck** | ⚠️ partial | Deck model + frameworks + builder + render + public runtime (present/keys/Chart.js) + API + `deck_edit` revisions + tests (`test_w03_*`); full LLM Stage A/B, image gen, PPTX/PDF bytes, Studio rail, E2E still open — see `MISSION_W03_REPORT.md` |

**Overall vs. PRD 1.0:** roughly **55–63%** — publish + public HTML + tenant analytics/billing UI path is much further along; **automations reliability**, **custom domain**, and **production polish / a11y proof** remain the largest gaps.

---

## PRD 1.0 checklist (condensed)

| PRD item | Status |
|---------|--------|
| Clerk auth + orgs + RBAC | ⚠️ |
| Brand kit | ✅ (app + API) |
| Studio chat + refine + section edit (API) | ⚠️ (backend streams; UI not complete) |
| Publish + live URL + custom domain | ⚠️ (publish + `/p/{org}/{slug}`; custom domain ❌) |
| Submissions + files + idempotency | ⚠️ (submit + **automation job enqueue** ✅; presigned files + Redis idempotency ❌) |
| Page admin (Overview / Submissions / Automations / Analytics) | ⚠️ (submissions + CSV ✅; **Analytics** + overview tabs ✅ in app; polish/E2E partial) |
| Automations (email + calendar) | ⚠️ engine + UI exist; failure digests / full E2E still thin |
| Analytics (tenant) | ⚠️ **API + app** for page/org analytics; advanced proposals/warehouse TBD |
| Stripe billing | ⚠️ Checkout + portal + usage UI; webhook-driven edge cases need monitoring |
| Team invites | ⚠️ API + settings UI; production invite E2E deferred |
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
- **Partitioning:** `submissions` / `analytics_events` via pg_partman; retention on analytics partitions ✅ (see `docs/architecture/PARTITIONING.md`)
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
- **Post-submit** `run_automations` **enqueued** (arq) when API Redis pool up; worker **stub** in `apps/worker` ✅
- Presigned upload, custom domain, strict CSP, preview token, **job idempotency (SET NX)** ❌ / partial

### [08 — Automations](./08_MISSION_05_AUTOMATIONS.md)
- Rule engine + Resend + Calendar ⚠️ substantial path; worker + OAuth + UI — tuning + monitoring ongoing

### [09 — Analytics & billing & teams](./09_MISSION_06_ANALYTICS_BILLING_TEAMS.md)
- Team endpoints + invites UI ⚠️
- Stripe plan/checkout/portal + usage ⚠️
- Analytics aggregations + **tenant dashboards in app** ⚠️ (see [ui/FRONTEND_STATUS.md](./ui/FRONTEND_STATUS.md))

### [10 — Polish](./10_MISSION_07_POLISH.md)
- Not complete repo-wide ❌

### [11 — Railway](./11_MISSION_08_RAILWAY_DEPLOY.md)
- Partial ❌

### [12 — Templates](./12_MISSION_09_TEMPLATES.md)
- Post-launch; placeholder UI only ⚠️

---

## What “done” means for the next milestones

1. **Mission 04 completion:** stable public URL ✅; **public submit** ✅; **CSV export** ✅; **automation enqueue** ✅ (stub worker); presigned uploads, **idempotent jobs**, CSP, custom domain remain.
2. **Mission 05 completion:** notify + confirm emails; OAuth + calendar create behind feature flags.
3. **Mission 06 completion:** usage-linked billing; analytics charts from real events.
4. **Mission 07 completion:** a11y audit, perf budget, security pass on public endpoints.

This file should be updated when a mission merges or when major stubs are replaced.
