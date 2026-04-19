# arq — Background Jobs — Reference for Forge

**Version:** 0.28.0
**Last researched:** 2026-04-19

## What Forge Uses

arq for async background jobs: email notifications, confirmation emails, calendar event creation, old revision cleanup, analytics partition management. Chosen per ADR-001.

## Job Definitions

```python
# apps/worker/worker.py
from arq import create_pool, cron
from arq.connections import RedisSettings
from app.config import settings

async def send_notify_email(ctx, submission_id: str, org_id: str):
    """Send notification email to page owner on new submission."""
    # Idempotency: check if notification already sent
    # Fetch submission, automation rules, send via Resend
    pass

async def send_confirm_email(ctx, submission_id: str):
    """Send confirmation email to the form submitter."""
    pass

async def create_calendar_event(ctx, submission_id: str, connection_id: str):
    """Create a Google Calendar event for a submission."""
    pass

async def cleanup_old_revisions(ctx):
    """Delete PageRevision rows older than 30 days."""
    pass

async def drop_old_analytics_partitions(ctx):
    """Drop analytics_events partitions older than retention policy."""
    pass

async def startup(ctx):
    """Worker startup — initialize DB pool."""
    pass

async def shutdown(ctx):
    """Worker shutdown — cleanup."""
    pass

class WorkerSettings:
    functions = [
        send_notify_email,
        send_confirm_email,
        create_calendar_event,
    ]
    cron_jobs = [
        cron(cleanup_old_revisions, hour=3, minute=0),     # Daily at 3am
        cron(drop_old_analytics_partitions, hour=4, minute=0),  # Daily at 4am
    ]
    on_startup = startup
    on_shutdown = shutdown
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    max_jobs = 10
    job_timeout = 300  # 5 minutes max per job
```

## Enqueuing Jobs from FastAPI

```python
# app/services/automation.py
from arq import create_pool
from arq.connections import RedisSettings
from app.config import settings

async def get_arq_pool():
    return await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))

async def enqueue_submission_automations(submission_id: str, org_id: str):
    pool = await get_arq_pool()

    # Enqueue in sequence with delays
    await pool.enqueue_job("send_notify_email", submission_id, org_id)
    await pool.enqueue_job("send_confirm_email", submission_id)
    # Calendar creation depends on automation rules — checked in the job itself
    await pool.enqueue_job("create_calendar_event", submission_id, org_id)
```

## Retry with Backoff

```python
from arq import Retry

async def send_notify_email(ctx, submission_id: str, org_id: str):
    try:
        await resend_client.send_email(...)
    except Exception as e:
        if ctx.get("job_try", 0) < 3:
            raise Retry(defer=ctx["job_try"] * 30)  # 30s, 60s, 90s
        # Log permanent failure
        raise
```

## Running the Worker

```bash
# Development
uv run arq apps.worker.worker.WorkerSettings

# Docker
CMD ["uv", "run", "arq", "worker.WorkerSettings"]
```

## Known Pitfalls

1. **Maintenance mode**: arq is stable but not actively adding features. Fine for our use case.
2. **Redis required**: No alternative broker support.
3. **Idempotency**: Jobs can be retried. Every job must check if its work was already done.
4. **Job serialization**: Arguments must be JSON-serializable (strings, numbers, lists, dicts).
5. **No built-in dashboard**: Use structured logging + Sentry for monitoring.

## Links
- [arq Docs](https://arq-docs.helpmanual.io/)
- [GitHub](https://github.com/python-arq/arq)
