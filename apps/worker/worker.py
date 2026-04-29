"""arq worker — automations, email/calendar stubs, billing, and scheduled jobs (BI-03)."""

from __future__ import annotations

import logging
import os
from datetime import UTC, datetime
from uuid import UUID

from app.db.models import (
    AvailabilityCalendar,
    CreditLedger,
    Deck,
    Invitation,
    Organization,
    OrchestrationRun,
    Proposal,
    SlotHold,
    Submission,
    User,
)
from app.db.session import AsyncSessionLocal
from app.services.automations import AutomationEngine
from app.services.proposal_service import (
    assign_signed_proposal_pdf_storage_placeholder,
    expire_due_proposals,
)
from arq import cron
from arq.connections import RedisSettings
from sqlalchemy import delete, func, select, text, update

logger = logging.getLogger(__name__)


async def run_automations(ctx: object, submission_id: str) -> str:
    """Execute automation pipeline for a submission (notify, confirm, calendar, webhooks)."""
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

        from app.db.models import Page
        from app.services.webhook_dispatch import dispatch_webhook_event

        page = await db.get(Page, sub.page_id)
        try:
            await dispatch_webhook_event(
                db,
                organization_id=sub.organization_id,
                event_type="submission.created",
                payload={
                    "submission_id": str(sub.id),
                    "page_id": str(sub.page_id),
                    "page_slug": page.slug if page else None,
                    "submitted_at": sub.created_at.isoformat() if sub.created_at else None,
                    "payload": sub.payload,
                },
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("run_automations: webhook dispatch error %s", e)
    return "ok"


async def email_notify(ctx: object, submission_id: str) -> str:
    """Send notify-owner email for a submission (direct call path)."""
    del ctx
    from app.db.models import BrandKit, Organization, Page
    from app.services.email import email_service

    sid = UUID(submission_id)
    async with AsyncSessionLocal() as db:
        sub = (await db.execute(select(Submission).where(Submission.id == sid))).scalar_one_or_none()
        if sub is None:
            return "missing"
        await db.execute(text("SELECT set_config('app.current_tenant_id', :t, true)"), {"t": str(sub.organization_id)})
        page = await db.get(Page, sub.page_id)
        org = await db.get(Organization, sub.organization_id)
        if page is None or org is None:
            return "missing"
        bk = (await db.execute(select(BrandKit).where(BrandKit.organization_id == org.id))).scalar_one_or_none()
        from app.db.models import AutomationRule
        rule = (await db.execute(select(AutomationRule).where(AutomationRule.page_id == page.id))).scalar_one_or_none()
        notify_addrs = [e.strip() for e in (rule.notify_emails if rule else []) if e and e.strip()]
        if not notify_addrs:
            return "skipped"
        summary = "\n".join(f"{k}: {v}" for k, v in sorted(sub.payload.items())) or "(empty)"
        for addr in notify_addrs:
            try:
                await email_service.send_notification(
                    to_email=addr,
                    org_name=org.name,
                    page_title=page.title,
                    submission_summary=summary,
                    primary_color=bk.primary_color if bk else None,
                    logo_url=bk.logo_url if bk else None,
                    voice_note=bk.voice_note if bk else None,
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("email_notify %s: %s", addr, e)
    return "ok"


async def email_confirm(ctx: object, submission_id: str) -> str:
    """Send submitter confirmation email (direct call path)."""
    del ctx
    from app.db.models import AutomationRule, BrandKit, Organization, Page
    from app.services.email import email_service

    sid = UUID(submission_id)
    async with AsyncSessionLocal() as db:
        sub = (await db.execute(select(Submission).where(Submission.id == sid))).scalar_one_or_none()
        if sub is None or not sub.submitter_email:
            return "missing"
        await db.execute(text("SELECT set_config('app.current_tenant_id', :t, true)"), {"t": str(sub.organization_id)})
        page = await db.get(Page, sub.page_id)
        org = await db.get(Organization, sub.organization_id)
        if page is None or org is None:
            return "missing"
        bk = (await db.execute(select(BrandKit).where(BrandKit.organization_id == org.id))).scalar_one_or_none()
        rule = (await db.execute(select(AutomationRule).where(AutomationRule.page_id == page.id))).scalar_one_or_none()
        subj = (rule.confirm_template_subject if rule else None) or "Thanks for your message"
        body = (rule.confirm_template_body if rule else None) or f"We received your submission for «{page.title}». We'll be in touch soon."
        try:
            await email_service.send_confirmation(
                to_email=sub.submitter_email,
                subject_line=subj,
                body_plain=body,
                primary_color=bk.primary_color if bk else None,
                logo_url=bk.logo_url if bk else None,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("email_confirm %s: %s", sub.submitter_email, e)
            return "error"
    return "ok"


async def email_reply(ctx: object, submission_id: str) -> str:
    """Send owner reply to submitter — payload must be pre-staged on the submission row."""
    del ctx
    from app.db.models import BrandKit, Organization, Page
    from app.services.email import email_service

    sid = UUID(submission_id)
    async with AsyncSessionLocal() as db:
        sub = (await db.execute(select(Submission).where(Submission.id == sid))).scalar_one_or_none()
        if sub is None or not sub.submitter_email:
            return "missing"
        reply_body = (sub.reply_text or "").strip() if hasattr(sub, "reply_text") else ""
        if not reply_body:
            return "skipped"
        await db.execute(text("SELECT set_config('app.current_tenant_id', :t, true)"), {"t": str(sub.organization_id)})
        page = await db.get(Page, sub.page_id)
        org = await db.get(Organization, sub.organization_id)
        if page is None or org is None:
            return "missing"
        bk = (await db.execute(select(BrandKit).where(BrandKit.organization_id == org.id))).scalar_one_or_none()
        subj = f"Re: {page.title}"
        try:
            await email_service.send_reply(
                to_email=sub.submitter_email,
                subject_line=subj,
                body_text=reply_body,
                primary_color=bk.primary_color if bk else None,
                logo_url=bk.logo_url if bk else None,
                in_reply_to=sub.notification_message_id if hasattr(sub, "notification_message_id") else None,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("email_reply %s: %s", sub.submitter_email, e)
            return "error"
    return "ok"


async def email_invitation(ctx: object, invitation_id: str) -> str:
    """Send team invitation email via worker (alternative to synchronous path in team.py)."""
    del ctx
    from app.config import settings
    from app.db.models import Organization
    from app.services.email import email_service

    iid = UUID(invitation_id)
    async with AsyncSessionLocal() as db:
        inv = await db.get(Invitation, iid)
        if inv is None or inv.accepted_at is not None:
            return "skipped"
        org = await db.get(Organization, inv.organization_id)
        if org is None:
            return "missing"
        accept_url = f"{settings.APP_PUBLIC_URL.rstrip('/')}/invite/accept?token={inv.token}"
        try:
            await email_service.send_invitation(
                to_email=str(inv.email),
                org_name=org.name,
                cta_url=accept_url,
                primary_color=None,
                logo_url=None,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("email_invitation %s: %s", inv.email, e)
            return "error"
    return "ok"


async def email_billing_failed(ctx: object, organization_id: str) -> str:
    """Notify org owner of a billing failure."""
    del ctx
    from app.config import settings
    from app.db.models import Membership, Organization, User
    from app.services.email import email_service

    oid = UUID(organization_id)
    async with AsyncSessionLocal() as db:
        org = await db.get(Organization, oid)
        if org is None:
            return "missing"
        owner_row = (
            await db.execute(
                select(User)
                .join(Membership, Membership.user_id == User.id)
                .where(Membership.organization_id == oid, Membership.role == "owner")
                .limit(1)
            )
        ).scalar_one_or_none()
        if owner_row is None:
            return "no_owner"
        billing_url = f"{settings.APP_PUBLIC_URL.rstrip('/')}/settings/billing"
        try:
            await email_service.send_billing_alert(
                to_email=str(owner_row.email),
                org_name=org.name,
                message="Your recent payment could not be processed. Please update your payment method to keep your account active.",
                billing_url=billing_url,
                primary_color=None,
                logo_url=None,
            )
        except Exception as e:  # noqa: BLE001
            logger.warning("email_billing_failed %s: %s", organization_id, e)
            return "error"
    return "ok"


async def calendar_create_event(ctx: object, submission_id: str) -> str:
    """Defer to ICS + automations for now; persists id when upstream Google integrations land."""
    del ctx
    sid = UUID(submission_id)
    async with AsyncSessionLocal() as db:
        sub = await db.get(Submission, sid)
        if sub is None:
            logger.warning("calendar_create_event submission missing %s", submission_id)
            return "missing"
        await db.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(sub.organization_id)},
        )
        if sub.calendar_event_id:
            return "already_recorded"
    return "calendar_worker_noop_until_google_calendar_wiring"


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
    """Rendered thumbnail capture — Playwright enqueue lives with publish automation."""
    logger.info("page_screenshot_placeholder page_id=%s ctx=%s", page_id, type(ctx).__name__)
    del ctx
    _ = UUID(page_id)  # validate shape
    return "noop_playwright_enqueue_pending"


async def ai_cost_aggregate(ctx: object) -> str:
    """Hourly reconciliation hook — counts orch rows for observability."""

    window_start = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    async with AsyncSessionLocal() as db:
        cnt = (
            await db.execute(
                select(func.count()).select_from(OrchestrationRun).where(OrchestrationRun.created_at >= window_start),
            )
        ).scalar_one()
        logger.info("ai_cost_aggregate hour_started=%s orch_rows_since=%s", window_start.isoformat(), cnt)
    return "ok"


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


async def flush_stripe_credit_meters(ctx: object) -> str:
    """POST pending credit-ledger overage units to Stripe Billing Meters (AL-02)."""
    del ctx
    import asyncio

    from app.services.billing.stripe_meter import meter_sent_timestamp, submit_meter_overage_units

    processed = 0
    async with AsyncSessionLocal() as db:
        q = (
            select(CreditLedger, Organization)
            .join(Organization, CreditLedger.organization_id == Organization.id)
            .where(CreditLedger.meter_overage_units > 0)
            .where(CreditLedger.stripe_meter_sent_at.is_(None))
            .limit(120)
        )
        batch = (await db.execute(q)).all()
        for row, org in batch:
            cid = (org.stripe_customer_id or "").strip()
            if not cid:
                continue
            ok, _ = await asyncio.to_thread(
                submit_meter_overage_units,
                stripe_customer_id=cid,
                credit_units=int(row.meter_overage_units),
                ledger_id=int(row.id),
            )
            if ok:
                row.stripe_meter_sent_at = meter_sent_timestamp()
                processed += 1
        await db.commit()
    return f"ok:{processed}"


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
        generate_template_preview,
        proposal_pdf_render,
        deck_export,
        flush_stripe_credit_meters,
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
        cron(flush_stripe_credit_meters, minute={0, 10, 20, 30, 40, 50}),
    ]
    redis_settings = RedisSettings.from_dsn(
        os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    )
    max_jobs = 20
    job_timeout = 120
    keep_result = 3600
    poll_delay = 0.5
    timezone = UTC
