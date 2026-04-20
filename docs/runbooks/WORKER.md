# arq background worker

Forge runs **arq** workers from `apps/worker/worker.py` (same Docker image as the API, different command — see `docker-compose.yml` `worker` service).

## Configuration

| Setting | Value | Purpose |
|---------|-------|---------|
| `REDIS_URL` | Same DSN as API | Queue + optional Redis in job handlers |
| `WorkerSettings` | `max_jobs=20`, `job_timeout=300`, `max_tries=5`, `keep_result=3600`, `poll_delay=0.5` | Throughput, automation retries, retention |
| Cron | See `WorkerSettings.cron_jobs` | Partman maintenance, invitation purge, calendar ICS refresh, holds, proposals, analytics partition cleanup |

## Deploy

- **Docker:** build `apps/worker/Dockerfile`; `CMD` runs `arq worker.WorkerSettings`.
- **Scale:** horizontally safe — jobs are single-consumer per Redis key; add replicas for throughput.
- **Env:** match API `DATABASE_URL`, `REDIS_URL`, AWS/S3 keys, email keys as needed for jobs that touch external services.

## Operations

- **Stuck jobs:** Inspect Redis keys or arq’s result backend; cancel via Redis CLI if needed (advanced).
- **Replay submission automations:** Enqueue `run_automations` with submission UUID (same helper as API `enqueue_run_automations`).
- **Manual calendar sync:** Enqueue `ics_calendar_sync` with `calendar_id`.
- **Partman:** Cron `partman_maintenance` at 02:00 UTC — no-op if `pg_partman` missing (logs debug).

## RLS in workers

Jobs that touch tenant data call `set_config('app.current_tenant_id', ...)` (and related helpers) on the session **before** queries so Row-Level Security matches API behavior.

## Local

```bash
# from repo root, with Redis + Postgres up
cd apps/api && uv sync
set PYTHONPATH=apps/api
cd ../worker && arq worker.WorkerSettings
```

On Windows, run `arq` from the same environment as `apps/api` so `app.*` imports resolve.

## Job inventory (non-exhaustive)

| Job | Role |
|-----|------|
| `run_automations` | Email/calendar pipeline for new submissions |
| `purge_deleted_user` | Deferred PII scrub (30 days after soft delete) |
| `ics_calendar_sync` / `refresh_calendar_syncs` | ICS URL → busy blocks |
| `generate_template_preview` | Template thumbnail |
| `partman_maintenance` | Monthly partition management |
| `deck_export` / `proposal_pdf_render` | Deck/proposal assets (stubs polish in W tracks) |

See `apps/worker/worker.py` for the full `functions` and `cron_jobs` lists.
