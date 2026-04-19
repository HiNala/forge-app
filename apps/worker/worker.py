"""arq worker — automations + scheduled jobs (Mission 05)."""

import logging
import os
from uuid import UUID

from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import select, text

from app.db.models import Submission
from app.db.session import AsyncSessionLocal
from app.services.automations import AutomationEngine

logger = logging.getLogger(__name__)


async def run_automations(ctx, submission_id: str) -> str:
    """Execute automation pipeline for a submission (notify, confirm, calendar)."""
    del ctx
    sid = UUID(submission_id)
    async with AsyncSessionLocal() as db:
        sub = (
            await db.execute(select(Submission).where(Submission.id == sid))
        ).scalar_one_or_none()
        if sub is None:
            logger.warning("run_automations: submission not found %s", submission_id)
            return "missing"
        await db.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(sub.organization_id)},
        )
        eng = AutomationEngine(db)
        await eng.run_for_submission(sid)
    return "ok"


async def send_notify_email(ctx, submission_id: str) -> None:
    del ctx, submission_id


async def send_confirm_email(ctx, submission_id: str) -> None:
    del ctx, submission_id


async def create_calendar_event(ctx, submission_id: str) -> None:
    del ctx, submission_id


async def cleanup_old_revisions(ctx) -> None:
    del ctx


async def drop_old_analytics_partitions(ctx) -> None:
    del ctx


class WorkerSettings:
    functions = [
        run_automations,
        send_notify_email,
        send_confirm_email,
        create_calendar_event,
    ]
    cron_jobs = [
        cron(cleanup_old_revisions, hour=3, minute=0),
        cron(drop_old_analytics_partitions, hour=4, minute=0),
    ]
    redis_settings = RedisSettings.from_dsn(
        os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    )
