"""arq worker — automations, email/calendar stubs, billing, and scheduled jobs (BI-03)."""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime
from uuid import UUID

from app.db.models import (
    AvailabilityCalendar,
    Deck,
    Invitation,
    Organization,
    Proposal,
    SlotHold,
    Submission,
    User,
)
from app.db.session import AsyncSessionLocal
from app.services.automation_transient import TransientAutomationError
from app.services.automations import AutomationEngine
from app.services.proposal_service import (
    assign_signed_proposal_pdf_storage_placeholder,
    expire_due_proposals,
)
from arq import cron
from arq.connections import RedisSettings
from arq.worker import Retry
from sqlalchemy import delete, select, text, update

logger = logging.getLogger(__name__)

_redis_client = None


async def _worker_redis():
    """Shared async Redis for idempotent automation sends (Mission 05)."""
    global _redis_client
    if _redis_client is None:
        import redis.asyncio as redis

        _redis_client = redis.from_url(
            os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True,
        )
    return _redis_client


_BACKOFF_SEC = (5, 30, 120, 600)


async def run_automations(ctx: object, submission_id: str) -> str:
    """Execute automation pipeline for a submission (notify, confirm, calendar)."""
    ctxd = ctx if isinstance(ctx, dict) else {}
    job_try = int(ctxd.get("job_try", 1))
    sid = UUID(submission_id)
    r = await _worker_redis()
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
        eng = AutomationEngine(db, redis=r)
        try:
            await eng.run_for_submission(sid)
        except TransientAutomationError as e:
            defer_s = _BACKOFF_SEC[min(job_try - 1, len(_BACKOFF_SEC) - 1)]
            logger.warning("run_automations transient, retry in %ss: %s", defer_s, e)
            raise Retry(defer=defer_s) from e
    return "ok"


async def email_notify(ctx: object, submission_id: str) -> str:
    """Resend notify-owner (orchestration may call this directly)."""
    del ctx, submission_id
    return "stub"


async def email_confirm(ctx: object, submission_id: str) -> str:
    del ctx, submission_id
    return "stub"


async def email_reply(ctx: object, submission_id: str) -> str:
    del ctx, submission_id
    return "stub"


async def email_invitation(ctx: object, invitation_id: str) -> str:
    del ctx, invitation_id
    return "stub"


async def email_billing_failed(ctx: object, organization_id: str) -> str:
    del ctx, organization_id
    return "stub"


async def calendar_create_event(ctx: object, submission_id: str) -> str:
    """Optional: ICS attachment path — primary Google path runs in automations after submit."""
    del ctx, submission_id
    return "stub"


async def ics_calendar_sync(ctx: object, calendar_id: str) -> str:
    """Sync one availability calendar (ICS URL upload path uses replace_busy_blocks from API)."""
    redis = ctx.get("redis") if isinstance(ctx, dict) else None
    cid = UUID(calendar_id)
    async with AsyncSessionLocal() as db:
        cal = await db.get(AvailabilityCalendar, cid)
        if cal is None:
            return "missing"
        await db.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(cal.organization_id)},
        )
        if cal.source_type != "ics_url" or not (cal.source_ref or "").strip():
            return "skipped"
        from app.services.booking_calendar.sync_calendar import fetch_and_sync_ics_url

        try:
            await fetch_and_sync_ics_url(db, calendar=cal, redis=redis)
            await db.commit()
        except Exception as e:  # noqa: BLE001
            logger.warning("ics_calendar_sync failed %s: %s", calendar_id, e)
            await db.rollback()
            return "error"
    return "ok"


async def expire_pending_holds(ctx: object) -> None:
    """Mark stale soft reservations as expired (W-01)."""
    del ctx
    now = datetime.now(UTC)
    async with AsyncSessionLocal() as db:
        oids = (await db.execute(select(Organization.id))).scalars().all()
        for oid in oids:
            await db.execute(
                text("SELECT set_config('app.current_tenant_id', :t, true)"),
                {"t": str(oid)},
            )
            await db.execute(
                update(SlotHold)
                .where(
                    SlotHold.organization_id == oid,
                    SlotHold.status == "pending",
                    SlotHold.expires_at < now,
                )
                .values(status="expired")
            )
        await db.commit()


async def page_screenshot(ctx: object, page_id: str) -> str:
    """Playwright thumbnail after publish (full impl in orchestration polish)."""
    del ctx, page_id
    return "stub"


async def ai_cost_aggregate(ctx: object) -> str:
    del ctx
    return "stub"


async def purge_deleted_user(ctx: object, user_id: str) -> str:
    """Remove PII after the mandatory retention window (account was soft-deleted earlier)."""
    del ctx
    uid = UUID(user_id)
    async with AsyncSessionLocal() as db:
        u = await db.get(User, uid)
        if u is None:
            return "missing"
        if u.deleted_at is None:
            logger.info("purge_deleted_user: user %s not deleted, skipping", user_id)
            return "not_deleted"

        redacted = f"deleted+{user_id}@redacted.invalid"
        u.email = redacted
        u.display_name = None
        u.avatar_url = None
        u.auth_provider_id = None
        u.user_preferences = None
        await db.execute(
            text(
                """
                UPDATE analytics_events
                SET user_id = NULL,
                    metadata = COALESCE(metadata, '{}'::jsonb)
                        || jsonb_build_object('pii_scrubbed', true)
                WHERE user_id = CAST(:uid AS uuid)
                """
            ),
            {"uid": str(uid)},
        )
        await db.commit()
    return "scrubbed"


async def generate_template_preview(ctx: object, template_id: str) -> str:
    """PNG screenshot of template HTML → S3 (Mission 09)."""
    del ctx
    from app.services.template_preview import generate_template_preview_image

    await generate_template_preview_image(UUID(template_id))
    return "ok"


async def cleanup_old_revisions(ctx: object) -> None:
    del ctx


async def drop_old_analytics_partitions(ctx: object) -> None:
    """Delete analytics rows past per-plan retention (default partition)."""
    del ctx

    async with AsyncSessionLocal() as db:
        await db.execute(
            text(
                """
                DELETE FROM analytics_events AS ae
                USING organizations AS o
                WHERE ae.organization_id = o.id
                  AND ae.created_at < NOW() - (
                    CASE o.plan
                      WHEN 'enterprise' THEN INTERVAL '365 days'
                      WHEN 'pro' THEN INTERVAL '180 days'
                      ELSE INTERVAL '90 days'
                    END
                  )
                """
            )
        )
        await db.commit()


async def purge_old_analytics(ctx: object) -> None:
    """Mission 06 name — same retention delete as ``drop_old_analytics_partitions``."""
    await drop_old_analytics_partitions(ctx)


async def refresh_retention_views(ctx: object) -> None:
    """Nightly refresh of GL-01 retention materialized view."""
    del ctx
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("REFRESH MATERIALIZED VIEW retention_signup_weekly"))
            await db.commit()
        except Exception as e:  # noqa: BLE001
            logger.debug("refresh_retention_views: %s", e)
            await db.rollback()


async def partman_maintenance(ctx: object) -> None:
    """pg_partman maintenance window (no-op when extension not installed)."""
    del ctx
    async with AsyncSessionLocal() as db:
        try:
            await db.execute(text("SELECT partman.run_maintenance()"))
            await db.commit()
        except Exception as e:  # noqa: BLE001
            logger.debug("partman_maintenance skipped: %s", e)
            await db.rollback()


async def purge_expired_invitations(ctx: object) -> None:
    del ctx
    async with AsyncSessionLocal() as db:
        await db.execute(
            delete(Invitation).where(
                Invitation.expires_at < datetime.now(UTC),
                Invitation.accepted_at.is_(None),
            )
        )
        await db.commit()


async def refresh_calendar_syncs(ctx: object) -> None:
    """Poll subscribed ICS URLs (hourly schedule through cron)."""
    redis = ctx.get("redis") if isinstance(ctx, dict) else None
    async with AsyncSessionLocal() as db:
        cals = (
            await db.execute(
                select(AvailabilityCalendar).where(
                    AvailabilityCalendar.source_type == "ics_url",
                    AvailabilityCalendar.source_ref.isnot(None),
                )
            )
        ).scalars().all()
        from app.services.booking_calendar.sync_calendar import fetch_and_sync_ics_url

        for cal in cals:
            await db.execute(
                text("SELECT set_config('app.current_tenant_id', :t, true)"),
                {"t": str(cal.organization_id)},
            )
            try:
                await fetch_and_sync_ics_url(db, calendar=cal, redis=redis)
                await db.commit()
            except Exception as e:  # noqa: BLE001
                logger.warning("refresh_calendar_syncs %s: %s", cal.id, e)
                await db.rollback()


async def deck_export(ctx: object, page_id: str, export_format: str) -> str:
    """Placeholder: PPTX/python-pptx or Playwright PDF (W-03). Tracks export on deck row."""
    del ctx
    pid = UUID(page_id)
    now = datetime.now(UTC)
    async with AsyncSessionLocal() as db:
        row = await db.get(Deck, pid)
        if row is None:
            return "missing"
        await db.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(row.organization_id)},
        )
        row.last_exported_at = now
        row.last_exported_format = export_format[:48]
        await db.commit()
    return "ok"


async def proposal_pdf_render(ctx: object, page_id: str) -> str:
    """Placeholder: Playwright PDF render + S3 upload (W-02). Sets a deterministic storage key."""
    del ctx
    pid = UUID(page_id)
    async with AsyncSessionLocal() as db:
        prop = await db.get(Proposal, pid)
        if prop is None:
            return "missing"
        await assign_signed_proposal_pdf_storage_placeholder(db, page_id=pid)
        await db.commit()
    return "ok"


async def expire_proposals(ctx: object) -> None:
    """Mark open proposals past expires_at as expired (W-02)."""
    del ctx
    async with AsyncSessionLocal() as db:
        await expire_due_proposals(db)
        await db.commit()


class WorkerSettings:
    """arq CLI: `arq worker.WorkerSettings` (see apps/worker/Dockerfile)."""

    functions = [
        run_automations,
        email_notify,
        email_confirm,
        email_reply,
        email_invitation,
        email_billing_failed,
        calendar_create_event,
        ics_calendar_sync,
        page_screenshot,
        ai_cost_aggregate,
        purge_deleted_user,
        purge_old_analytics,
        generate_template_preview,
        proposal_pdf_render,
        deck_export,
    ]
    cron_jobs = [
        cron(cleanup_old_revisions, hour=3, minute=0),
        cron(drop_old_analytics_partitions, hour=4, minute=0),
        cron(partman_maintenance, hour=2, minute=0),
        cron(purge_expired_invitations, hour=5, minute=15),
        cron(refresh_calendar_syncs, hour={0, 6, 12, 18}, minute=0),
        cron(expire_pending_holds, minute=list(range(0, 60, 2))),
        cron(expire_proposals, hour=7, minute=30),
        cron(refresh_retention_views, hour=6, minute=30),
    ]
    redis_settings = RedisSettings.from_dsn(
        os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    )
    max_jobs = 20
    job_timeout = 300
    max_tries = 5
    retry_jobs = True
    keep_result = 3600
    poll_delay = 0.5
    timezone = UTC
