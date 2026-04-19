# Mission BI-03 — API contracts, services & background jobs (report)

**Branch:** `mission-bi-03-api-services-jobs` (or equivalent).  
**Date:** 2026-04-19

## Completed in this iteration

- **Auth (Phase 1 subset):**
  - `PATCH /api/v1/auth/me` — updates `display_name`, `avatar_url`, and stores `timezone` / `locale` in the existing `users.preferences` JSONB (no separate migration; aligns with current schema).
  - `POST /api/v1/auth/preferences` — alias for the existing `PATCH /me/preferences` behavior; both now persist against the **route DB session** (fixes detached `User` instances from `require_user`).
  - `DELETE /api/v1/auth/me` — soft-delete with `deleted_at`; schedules `purge_deleted_user` via arq with **30-day deferral**, idempotent job id `purge_user_{user_id}`.
- **Queue:** `enqueue_purge_deleted_user` in `app/services/queue.py` (mirrors existing enqueue helpers).
- **Worker (`apps/worker/worker.py`):** BI-03 **settings** (`max_jobs`, `job_timeout`, `keep_result`, `poll_delay`, UTC timezone) and **registered jobs:** email/calendar/ICS/screenshot/cost stubs, **`purge_deleted_user`** (PII redaction), existing `run_automations` and `generate_template_preview`. **Crons:** prior revision/analytics cleanup; **partman** attempt (swallows missing extension); **`purge_expired_invitations`**; **`refresh_calendar_syncs`** stub every six hours.
- **Tests:** `tests/test_queue_unit.py` (purge enqueue contract), `tests/test_auth_bi03.py` (Postgres-backed patch/preferences/delete).
- **Docs:** `docs/runbooks/WORKER.md` updated; `docs/architecture/API_OVERVIEW.md` exists from earlier work.

## Verification

- `cd apps/api && uv run pytest tests/test_queue_unit.py tests/test_auth_bi03.py` — pass (with Postgres available).

## Follow-ups (mission vs repo)

The full BI-03 brief lists 60+ endpoints, ICS availability, Stripe event matrix, OpenAPI→`schema.ts` CI, and exhaustive `test_api_contracts.py`. Much of that **already lives** elsewhere in `app/api/v1/` (pages, org/team, billing, studio, etc.); this report does not re-audit every route line-by-line.

Recommended next passes:

1. **GET `/auth/me` Redis cache (60s)** and invalidation on membership/org mutation — not implemented here.
2. **Signup payload** `{org_name?, invitation_token?}` vs current `workspace_name`-only bootstrap — product alignment.
3. **ICS / availability tables** — confirm models and migrations match Phase 7 before claiming E2E.
4. **CI:** regenerate `apps/web/src/lib/api/schema.ts` from OpenAPI and add a drift check if not present.

## Honest scope note

This commit closes a **focused slice** (auth persistence semantics, purge scheduling, worker contract). Treat the checklist in the mission doc as the master list; use this file for what was **verified** in-repo for the slice above.
