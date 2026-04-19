"""arq worker entry — job bodies filled in Mission 05."""

import logging
import os

from arq import cron
from arq.connections import RedisSettings

logger = logging.getLogger(__name__)


async def run_automations(ctx, submission_id: str) -> str:
    """Mission 05 will run rules + notifications; Mission 04 only acknowledges the job."""
    del ctx
    logger.info("run_automations stub submission_id=%s", submission_id)
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
