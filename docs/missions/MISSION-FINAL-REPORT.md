# Mission Final — Smoke Test & Polish (report)

**Branch:** `mission-final-smoke-test-polish`  
**Date:** 2026-04-20  
**Scope:** This document records what was **verified in automation** during this pass, what was **fixed in code/docs**, and what **still requires human review, credentials, or staging** to satisfy the full mission checklist.

## Executive summary

The mission brief asks for a multi-day, human-driven walkthrough (signup → all workflows → billing → accessibility → Lighthouse → a second tester → demo recording). **That full matrix is not completed in a single agent session.** What *is* delivered here is: **correct onboarding documentation**, **more reliable Docker env wiring**, a **user-friendly `/app` redirect**, and **green automated tests/build** on `main` at the time of the branch.

## Fixes shipped on this branch (categorized)

### Documentation & onboarding

- **`README.md`**: Documented Docker **web port 3001** (not 3000), MinIO ports, seed command matching `scripts/seed_dev.py`, test commands for api/web in Compose, clarified that Caddy is not in root `docker-compose.yml`, added Option B for local dev, smoke-check table, prerequisite that `.env` must exist for Compose.

### Docker Compose

- **`env_file: .env`** on `web`, `api`, and `worker` so keys from `.env` (Clerk, `OPENAI_API_KEY`, storage, etc.) are available inside containers. **Prerequisite:** `cp .env.example .env` before `docker compose up` (Compose errors if the `env_file` path is missing).

### Web

- **`next.config.ts`**: Redirect **`/app` → `/dashboard`** (temporary redirect) so shorthand URLs and docs match user expectations.

## Automated verification (this environment)

| Check | Result | Notes |
|--------|--------|--------|
| `pytest` (`apps/api`) | **176 passed** | One `PendingDeprecationWarning` from Starlette/python_multipart (upstream). |
| `pnpm run build` (`apps/web`) | **Pass** | Occasional **Windows `EBUSY`** during `standalone` output copy; delete `.next` and retry if needed. |
| `pnpm run lint` / `typecheck` (`apps/web`) | **Pass** | |

## Not verified here (defer to humans / CI / staging)

The following mission phases need **manual browser use**, **real accounts**, or **third-party dashboards**:

- Phases 2–7, 9–12, 14–17, 19–22: full product flows, mobile devices, cross-browser, second human, demo recording, Lighthouse/axe targets, Stripe/Resend/Google live verification.
- Phase 13: fault injection (stop Postgres/Redis) against a running Compose stack.
- Phase 20: Sentry test event, worker queue inspection, MinIO object listing with real uploads.
- **Lighthouse scores**, **axe violation counts**, and **coverage %** were not re-collected for this report — run in CI or locally and paste into a follow-up revision.

## Known issues / follow-ups

1. **Next.js `pnpm` in Compose** uses `corepack prepare pnpm@9`; lockfile is compatible — bump if the monorepo standardizes on pnpm 10.
2. **Middleware → proxy** deprecation (Next 16): plan a codemod when supported.
3. **Full E2E** (`playwright`) not run in this pass; execute before release tagging.

## Subjective quality note

Automated tests and a clean production build are **necessary** but not **sufficient** for “Forge feels done.” Closing the mission still requires the **human walkthrough** described in the mission brief, especially Studio SSE behavior, public `/p/*` flows, and billing.

## Suggested next steps

1. Run `docker compose up --build` on a clean machine and follow the updated README; adjust docs for any new friction.
2. Execute Playwright E2E and attach Lighthouse/axe numbers to a **v1.0.0** release checklist.
3. Tag `v1.0.0` only after product sign-off + CI green on `main`.
