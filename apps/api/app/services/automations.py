"""Automation rule engine — runs after each form submission (Mission 05)."""

from __future__ import annotations

import hashlib
import logging
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.models import (
    AutomationRule,
    AutomationRun,
    BrandKit,
    CalendarConnection,
    Organization,
    Page,
    Submission,
)
from app.services.automation_transient import TransientAutomationError
from app.services.calendar import create_event_for_submission
from app.services.email import email_service

logger = logging.getLogger(__name__)

_SENT_TTL = 30 * 24 * 3600


def _ns() -> str:
    return (settings.FORGE_CACHE_NS or "forge").strip() or "forge"


def _redis_notify_key(submission_id: UUID, email: str) -> str:
    h = hashlib.sha256(email.lower().strip().encode()).hexdigest()[:20]
    return f"{_ns()}:auto:notify:{submission_id}:{h}"


def _redis_confirm_key(submission_id: UUID) -> str:
    return f"{_ns()}:auto:confirm:{submission_id}"


def _redis_calendar_key(submission_id: UUID) -> str:
    return f"{_ns()}:auto:calendar:{submission_id}"


async def get_or_create_rule(
    db: AsyncSession, *, page_id: UUID, organization_id: UUID
) -> AutomationRule:
    row = (
        await db.execute(select(AutomationRule).where(AutomationRule.page_id == page_id))
    ).scalar_one_or_none()
    if row is not None:
        return row
    rule = AutomationRule(
        page_id=page_id,
        organization_id=organization_id,
        notify_emails=[],
        confirm_submitter=True,
    )
    db.add(rule)
    await db.flush()
    return rule


async def _has_successful(
    db: AsyncSession, *, submission_id: UUID, step: str
) -> bool:
    q = await db.execute(
        select(AutomationRun.id).where(
            AutomationRun.submission_id == submission_id,
            AutomationRun.step == step,
            AutomationRun.status == "success",
        )
    )
    return q.first() is not None


async def _record_run(
    db: AsyncSession,
    *,
    rule_id: UUID,
    organization_id: UUID,
    submission_id: UUID,
    step: str,
    status: str,
    error_message: str | None = None,
    result_json: dict[str, Any] | None = None,
) -> None:
    run = AutomationRun(
        automation_rule_id=rule_id,
        organization_id=organization_id,
        submission_id=submission_id,
        step=step,
        status=status,
        error_message=error_message,
        result_json=result_json,
    )
    db.add(run)
    await db.flush()


class AutomationEngine:
    """Executes notify → confirm → calendar for one submission."""

    def __init__(self, db: AsyncSession, redis: Any | None = None) -> None:
        self.db = db
        self.redis = redis

    async def run_for_submission(self, submission_id: UUID) -> dict[str, Any]:
        sub = (
            await self.db.execute(
                select(Submission)
                .where(Submission.id == submission_id)
                .options(selectinload(Submission.page))
            )
        ).scalar_one_or_none()
        if sub is None:
            logger.warning("automation: submission not found %s", submission_id)
            return {"ok": False, "reason": "no_submission"}

        page = sub.page
        if page is None:
            p2 = await self.db.get(Page, sub.page_id)
            if p2 is None:
                return {"ok": False, "reason": "no_page"}
            page = p2

        org = await self.db.get(Organization, sub.organization_id)
        if org is None:
            return {"ok": False, "reason": "no_org"}

        rule = await get_or_create_rule(
            self.db, page_id=page.id, organization_id=sub.organization_id
        )
        bk = (
            await self.db.execute(
                select(BrandKit).where(BrandKit.organization_id == org.id)
            )
        ).scalar_one_or_none()

        primary_color = bk.primary_color if bk else None
        logo_url = bk.logo_url if bk else None
        voice_note = bk.voice_note if bk else None

        summary_lines = [f"{k}: {v}" for k, v in sorted(sub.payload.items())]
        submission_summary = "\n".join(summary_lines) if summary_lines else "(empty)"

        r = self.redis

        # --- notify ---
        if not await _has_successful(self.db, submission_id=sub.id, step="notify"):
            notify_addrs = [e.strip() for e in (rule.notify_emails or []) if e and e.strip()]
            mids: list[str] = []
            last_err: str | None = None
            for addr in notify_addrs:
                if r is not None:
                    try:
                        if await r.get(_redis_notify_key(sub.id, addr)):
                            continue
                    except Exception as e:
                        logger.warning("automation redis notify check: %s", e)
                try:
                    mid = await email_service.send_notification(
                        to_email=addr,
                        org_name=org.name,
                        page_title=page.title,
                        submission_summary=submission_summary,
                        primary_color=primary_color,
                        logo_url=logo_url,
                        voice_note=voice_note,
                    )
                    if mid:
                        mids.append(mid)
                    if sub.notification_message_id is None and mid:
                        sub.notification_message_id = mid
                    if r is not None and mid:
                        try:
                            await r.setex(_redis_notify_key(sub.id, addr), _SENT_TTL, "1")
                        except Exception as e:
                            logger.warning("automation redis notify set: %s", e)
                except TransientAutomationError:
                    raise
                except Exception as e:
                    logger.exception("notify %s", e)
                    last_err = str(e)

            if not notify_addrs:
                n_status = "skipped"
            elif last_err:
                n_status = "failed"
            else:
                n_status = "success"

            await _record_run(
                self.db,
                rule_id=rule.id,
                organization_id=org.id,
                submission_id=sub.id,
                step="notify",
                status=n_status,
                error_message=last_err,
                result_json={"resend_message_ids": mids} if mids else None,
            )
            await self.db.commit()
            await self.db.refresh(sub)

        # --- confirm ---
        if not await _has_successful(self.db, submission_id=sub.id, step="confirm"):
            confirm_done = False
            if r is not None:
                try:
                    if await r.get(_redis_confirm_key(sub.id)):
                        await _record_run(
                            self.db,
                            rule_id=rule.id,
                            organization_id=org.id,
                            submission_id=sub.id,
                            step="confirm",
                            status="success",
                            result_json={"recovered": True},
                        )
                        confirm_done = True
                except Exception as e:
                    logger.warning("automation redis confirm: %s", e)

            if not confirm_done:
                if rule.confirm_submitter and sub.submitter_email:
                    subj = rule.confirm_template_subject or "Thanks for your message"
                    body = rule.confirm_template_body or (
                        f"We received your submission for «{page.title}». We'll be in touch soon."
                    )
                    try:
                        mid = await email_service.send_confirmation(
                            to_email=sub.submitter_email,
                            subject_line=subj,
                            body_plain=body,
                            primary_color=primary_color,
                            logo_url=logo_url,
                        )
                        if r is not None and mid:
                            await r.setex(_redis_confirm_key(sub.id), _SENT_TTL, "1")
                        await _record_run(
                            self.db,
                            rule_id=rule.id,
                            organization_id=org.id,
                            submission_id=sub.id,
                            step="confirm",
                            status="success",
                            result_json={"resend_message_id": mid} if mid else {},
                        )
                    except TransientAutomationError:
                        raise
                    except Exception as e:
                        logger.exception("confirm %s", e)
                        await _record_run(
                            self.db,
                            rule_id=rule.id,
                            organization_id=org.id,
                            submission_id=sub.id,
                            step="confirm",
                            status="failed",
                            error_message=str(e),
                        )
                else:
                    await _record_run(
                        self.db,
                        rule_id=rule.id,
                        organization_id=org.id,
                        submission_id=sub.id,
                        step="confirm",
                        status="skipped",
                    )
            await self.db.commit()
            await self.db.refresh(sub)

        # --- calendar ---
        if not await _has_successful(self.db, submission_id=sub.id, step="calendar"):
            if (
                rule.calendar_sync_enabled
                and rule.calendar_connection_id is not None
            ):
                conn = await self.db.get(CalendarConnection, rule.calendar_connection_id)
                if conn is None:
                    await _record_run(
                        self.db,
                        rule_id=rule.id,
                        organization_id=org.id,
                        submission_id=sub.id,
                        step="calendar",
                        status="failed",
                        error_message="calendar_connection_missing",
                    )
                else:
                    calendar_recovered = False
                    if r is not None:
                        try:
                            if await r.get(_redis_calendar_key(sub.id)):
                                await _record_run(
                                    self.db,
                                    rule_id=rule.id,
                                    organization_id=org.id,
                                    submission_id=sub.id,
                                    step="calendar",
                                    status="success",
                                    result_json={"recovered": True},
                                )
                                calendar_recovered = True
                        except Exception as e:
                            logger.warning("automation redis calendar: %s", e)
                    if calendar_recovered:
                        pass
                    else:
                        try:
                            meta = await create_event_for_submission(
                                self.db,
                                conn=conn,
                                page_title=page.title,
                                submitter_name=sub.submitter_name,
                                submitter_email=sub.submitter_email,
                                payload=sub.payload,
                                submitted_at=sub.created_at,
                                duration_min=rule.calendar_event_duration_min,
                                send_invite=rule.calendar_send_invite,
                            )
                            ev_id = meta.get("event_id") if isinstance(meta, dict) else None
                            if isinstance(ev_id, str) and ev_id and sub.calendar_event_id is None:
                                sub.calendar_event_id = ev_id
                            if r is not None:
                                await r.setex(_redis_calendar_key(sub.id), _SENT_TTL, "1")
                            await _record_run(
                                self.db,
                                rule_id=rule.id,
                                organization_id=org.id,
                                submission_id=sub.id,
                                step="calendar",
                                status="success",
                                result_json=meta,
                            )
                        except TransientAutomationError:
                            raise
                        except Exception as e:
                            logger.exception("calendar %s", e)
                            await _record_run(
                                self.db,
                                rule_id=rule.id,
                                organization_id=org.id,
                                submission_id=sub.id,
                                step="calendar",
                                status="failed",
                                error_message=str(e),
                            )
            else:
                await _record_run(
                    self.db,
                    rule_id=rule.id,
                    organization_id=org.id,
                    submission_id=sub.id,
                    step="calendar",
                    status="skipped",
                )
            await self.db.commit()

        await self.db.refresh(sub)
        return {"ok": True, "submission_id": str(submission_id)}
