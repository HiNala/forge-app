# Background worker (arq)

## What runs

- **Image / command:** same Python env as the API; `Dockerfile` in `apps/worker` runs:

  `uv run --no-dev arq worker.WorkerSettings`

- **Module:** `apps/worker/worker.py` defines `WorkerSettings` with:
  - **Redis:** `REDIS_URL` (same Redis as rate limiting / queue).
  - **Functions:** automation pipeline (`run_automations`), email/calendar/ICS/screenshot/cost **stubs**, `purge_deleted_user` (PII scrub after account deletion), `generate_template_preview`, plus partition cleanup helpers.
  - **Worker tuning:** `max_jobs=20`, `job_timeout=120`, `keep_result=3600`, `poll_delay=0.5`, `timezone=UTC` (cron alignment).
  - **Cron:** revision cleanup, analytics partition TTL, **partman** placeholder (no-op without `pg_partman`), expired invitation purge, calendar **refresh** hook every six hours.

## Configure

| Concern | Where |
|--------|--------|
| Redis DSN | `REDIS_URL` |
| Job timeout / result TTL | `WorkerSettings` class vars (`job_timeout`, `keep_result`) |
| Retries | Implement per-job; arq default `max_tries` applies when enqueueing |

## Deploy

- **Docker Compose:** `worker` service should track the API image; scale replicas only if jobs are CPU-bound and Redis can handle concurrent workers (watch duplicate cron).

## Debug stuck jobs

1. **Redis:** inspect keys under `arq:` (arq default prefix) — job id, results.
2. **Logs:** worker process stderr; search for `run_automations`, job name, submission id.
3. **Re-enqueue:** API or shell can call `enqueue_job("run_automations", submission_id=...)` via `arq` CLI or a small script using `create_pool`.

## Drain queue

- Stop publishing new work; scale worker to 0 after queue depth is 0, or pause producers.

## Idempotency

- **Automations:** engine should tolerate duplicate submissions (check automation run rows).
- **Stripe / webhooks:** use `stripe_events_processed` in the API path, not the generic worker queue for payment idempotency.
