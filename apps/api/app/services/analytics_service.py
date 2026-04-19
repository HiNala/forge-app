"""Aggregations over ``analytics_events`` (Mission 06)."""

from __future__ import annotations

import base64
import json
import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AnalyticsEvent, Membership, Page, Submission, SubscriptionUsage

logger = logging.getLogger(__name__)

_RANGE_DAYS = {"7d": 7, "30d": 30, "90d": 90}


def range_start(range_key: str) -> datetime:
    days = _RANGE_DAYS.get(range_key, 7)
    return datetime.now(UTC) - timedelta(days=days)


def is_form_page_type(page_type: str) -> bool:
    return page_type in ("booking-form", "contact-form", "rsvp")


def is_proposal_page_type(page_type: str) -> bool:
    return page_type == "proposal"


def _device_expr() -> str:
    return """CASE
      WHEN user_agent IS NULL THEN 'unknown'
      WHEN user_agent ILIKE '%mobile%'
        OR user_agent ILIKE '%android%'
        OR user_agent ILIKE '%iphone%' THEN 'mobile'
      ELSE 'desktop'
    END"""


async def page_summary(
    db: AsyncSession,
    *,
    organization_id: UUID,
    page_id: UUID,
    range_key: str,
) -> dict[str, Any]:
    start = range_start(range_key)
    dev = _device_expr()
    # Unique visitors & views (page_view events)
    q_vis = (
        select(
            func.count(func.distinct(AnalyticsEvent.visitor_id)).label("uniq"),
            func.count().label("views"),
        )
        .where(
            AnalyticsEvent.organization_id == organization_id,
            AnalyticsEvent.page_id == page_id,
            AnalyticsEvent.event_type == "page_view",
            AnalyticsEvent.created_at >= start,
        )
    )
    vis = (await db.execute(q_vis)).one()
    subs_q = select(func.count()).where(
        Submission.page_id == page_id,
        Submission.organization_id == organization_id,
        Submission.created_at >= start,
    )
    subs = int((await db.execute(subs_q)).scalar_one() or 0)
    views = int(vis.views or 0)
    uniq = int(vis.uniq or 0)
    rate = (subs / uniq) if uniq else 0.0

    ref_sql = text(
        """
        SELECT COALESCE(referrer,'(direct)') AS ref, COUNT(*)::int AS c
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'page_view'
          AND created_at >= :start
        GROUP BY COALESCE(referrer,'(direct)')
        ORDER BY c DESC
        LIMIT 8
        """
    )
    ref_rows = (
        await db.execute(
            ref_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).all()

    dev_sql = text(
        f"""
        SELECT {dev} AS device, COUNT(*)::int AS c
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'page_view'
          AND created_at >= :start
        GROUP BY 1
        ORDER BY c DESC
        """
    )
    dev_rows = (
        await db.execute(
            dev_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).all()

    cta_clicks = int(
        (
            await db.execute(
                select(func.count()).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "cta_click",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )

    dwell_sum_sql = text(
        """
        SELECT COALESCE(SUM(COALESCE((metadata->>'dwell_ms')::bigint, 0)), 0)::bigint
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'section_dwell'
          AND created_at >= :start
        """
    )
    dwell_row = (
        await db.execute(
            dwell_sum_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).one()
    section_dwell_total_ms = int(dwell_row[0] or 0)
    avg_time_on_page_ms = int(section_dwell_total_ms // uniq) if uniq else 0

    day_sql = text(
        """
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS c
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'page_view'
          AND created_at >= :start
        GROUP BY 1
        ORDER BY 1
        """
    )
    day_rows = (
        await db.execute(
            day_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).all()
    views_by_day = [
        {
            "date": r[0].isoformat() if hasattr(r[0], "isoformat") else str(r[0]),
            "count": r[1],
        }
        for r in day_rows
    ]

    return {
        "range": range_key,
        "unique_visitors": uniq,
        "total_views": views,
        "submissions": subs,
        "submission_rate": round(rate, 4),
        "cta_clicks": cta_clicks,
        "section_dwell_total_ms": section_dwell_total_ms,
        "avg_time_on_page_ms": avg_time_on_page_ms,
        "views_by_day": views_by_day,
        "top_referrers": [{"referrer": r[0], "count": r[1]} for r in ref_rows],
        "devices": [{"device": r[0], "count": r[1]} for r in dev_rows],
    }


async def page_funnel(
    db: AsyncSession,
    *,
    organization_id: UUID,
    page_id: UUID,
    range_key: str,
) -> dict[str, Any]:
    start = range_start(range_key)
    starts = int(
        (
            await db.execute(
                select(func.count(func.distinct(AnalyticsEvent.session_id))).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "form_start",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    touch_sessions = int(
        (
            await db.execute(
                select(func.count(func.distinct(AnalyticsEvent.session_id))).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "form_field_touch",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    submits = int(
        (
            await db.execute(
                select(func.count()).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "form_submit",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    touch_sql = text(
        """
        SELECT COALESCE(metadata->>'field','(unknown)') AS field, COUNT(*)::int AS c
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'form_field_touch'
          AND created_at >= :start
        GROUP BY 1
        ORDER BY c DESC
        """
    )
    touches = (
        await db.execute(
            touch_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).all()
    fields = [
        {
            "field": r[0],
            "touches": r[1],
            "touch_rate_vs_starters": round((r[1] / starts) if starts else 0.0, 4),
        }
        for r in touches
    ]
    return {
        "range": range_key,
        "form_starts": starts,
        "sessions_with_field_touch": touch_sessions,
        "form_submits": submits,
        "submit_rate_among_starters": round((submits / starts) if starts else 0.0, 4),
        "fields": fields,
    }


async def page_engagement(
    db: AsyncSession,
    *,
    organization_id: UUID,
    page_id: UUID,
    range_key: str,
) -> dict[str, Any]:
    start = range_start(range_key)
    views = int(
        (
            await db.execute(
                select(func.count()).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "page_view",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    uniq = int(
        (
            await db.execute(
                select(func.count(func.distinct(AnalyticsEvent.visitor_id))).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "page_view",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    depth_sql = text(
        """
        SELECT ROUND((metadata->>'scroll_pct')::numeric)::int AS bucket, COUNT(*)::int AS c
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'scroll_depth'
          AND created_at >= :start
          AND metadata ? 'scroll_pct'
        GROUP BY 1
        ORDER BY 1
        """
    )
    depths = (
        await db.execute(
            depth_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).all()
    dwell_sql = text(
        """
        SELECT COALESCE(metadata->>'section_id','') AS sid,
               SUM(COALESCE((metadata->>'dwell_ms')::bigint,0))::bigint AS ms,
               COUNT(*)::int AS n
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'section_dwell'
          AND created_at >= :start
        GROUP BY 1
        ORDER BY ms DESC NULLS LAST
        LIMIT 24
        """
    )
    dwells = (
        await db.execute(
            dwell_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).all()
    acc = int(
        (
            await db.execute(
                select(func.count()).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "proposal_accept",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    dec = int(
        (
            await db.execute(
                select(func.count()).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "proposal_decline",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    mx_sql = text(
        """
        SELECT MAX((metadata->>'scroll_pct')::float) FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'scroll_depth'
          AND created_at >= :start
        """
    )
    mx = (
        await db.execute(
            mx_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).scalar()
    max_scroll = float(mx or 0)

    dev = _device_expr()
    dev_sql = text(
        f"""
        SELECT {dev} AS device, COUNT(*)::int AS c
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND page_id = CAST(:pid AS uuid)
          AND event_type = 'page_view'
          AND created_at >= :start
        GROUP BY 1
        """
    )
    dev_rows = (
        await db.execute(
            dev_sql,
            {"oid": str(organization_id), "pid": str(page_id), "start": start},
        )
    ).all()

    # Weighted time-on-page from section_dwell sums (proxy; no fake dwell)
    tot_dwell = sum(int(r[1] or 0) for r in dwells)

    return {
        "range": range_key,
        "views": views,
        "unique_visitors": uniq,
        "max_scroll_pct": round(max_scroll, 2),
        "scroll_depth_histogram": [{"scroll_pct": r[0], "count": r[1]} for r in depths],
        "section_dwell": [
            {"section_id": r[0], "dwell_ms_total": int(r[1] or 0), "events": r[2]}
            for r in dwells
        ],
        "proposal_accepts": acc,
        "proposal_declines": dec,
        "devices": [{"device": r[0], "count": r[1]} for r in dev_rows],
        "approx_engagement_ms": tot_dwell,
    }


async def org_summary(
    db: AsyncSession,
    *,
    organization_id: UUID,
    range_key: str,
) -> dict[str, Any]:
    start = range_start(range_key)
    views = int(
        (
            await db.execute(
                select(func.count()).where(
                    AnalyticsEvent.organization_id == organization_id,
                    AnalyticsEvent.event_type == "page_view",
                    AnalyticsEvent.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    subs = int(
        (
            await db.execute(
                select(func.count()).where(
                    Submission.organization_id == organization_id,
                    Submission.created_at >= start,
                )
            )
        ).scalar_one()
        or 0
    )
    live_pages = int(
        (
            await db.execute(
                select(func.count()).where(
                    Page.organization_id == organization_id,
                    Page.status == "live",
                )
            )
        ).scalar_one()
        or 0
    )
    team_members = int(
        (
            await db.execute(
                select(func.count())
                .select_from(Membership)
                .where(Membership.organization_id == organization_id)
            )
        ).scalar_one()
        or 0
    )

    today = datetime.now(UTC).date()
    month_start = date(today.year, today.month, 1)
    if month_start.month == 1:
        prev_month_start = date(month_start.year - 1, 12, 1)
    else:
        prev_month_start = date(month_start.year, month_start.month - 1, 1)

    month_start_dt = datetime(month_start.year, month_start.month, month_start.day, tzinfo=UTC)
    prev_month_start_dt = datetime(
        prev_month_start.year, prev_month_start.month, prev_month_start.day, tzinfo=UTC
    )

    subs_m = int(
        (
            await db.execute(
                select(func.count()).where(
                    Submission.organization_id == organization_id,
                    Submission.created_at >= month_start_dt,
                )
            )
        ).scalar_one()
        or 0
    )
    subs_prev = int(
        (
            await db.execute(
                select(func.count()).where(
                    Submission.organization_id == organization_id,
                    Submission.created_at >= prev_month_start_dt,
                    Submission.created_at < month_start_dt,
                )
            )
        ).scalar_one()
        or 0
    )
    trend_pct: float | None = None
    if subs_prev > 0:
        trend_pct = round((subs_m - subs_prev) / subs_prev * 100.0, 1)
    elif subs_m > 0:
        trend_pct = 100.0

    usage_row = (
        await db.execute(
            select(SubscriptionUsage).where(
                SubscriptionUsage.organization_id == organization_id,
                SubscriptionUsage.period_start == month_start,
            )
        )
    ).scalar_one_or_none()
    tokens_total = 0
    if usage_row is not None:
        tokens_total = int(usage_row.tokens_prompt or 0) + int(usage_row.tokens_completion or 0)

    top_pages_sql = text(
        """
        SELECT p.id, p.title, p.slug, COUNT(s.id)::int AS sc,
               COALESCE(v.uniq, 0) AS uv
        FROM submissions s
        INNER JOIN pages p ON p.id = s.page_id AND p.organization_id = s.organization_id
        LEFT JOIN (
          SELECT page_id, COUNT(DISTINCT visitor_id)::int AS uniq
          FROM analytics_events
          WHERE organization_id = CAST(:oid AS uuid)
            AND event_type = 'page_view'
            AND created_at >= :start
          GROUP BY page_id
        ) v ON v.page_id = s.page_id
        WHERE s.organization_id = CAST(:oid AS uuid)
          AND s.created_at >= :start
        GROUP BY p.id, p.title, p.slug, v.uniq
        ORDER BY sc DESC
        LIMIT 12
        """
    )
    tp_rows = (await db.execute(top_pages_sql, {"oid": str(organization_id), "start": start})).all()
    top_pages = []
    for r in tp_rows:
        sc, uv = int(r[3] or 0), int(r[4] or 0)
        top_pages.append(
            {
                "page_id": str(r[0]),
                "title": r[1],
                "slug": r[2],
                "submissions": sc,
                "unique_visitors": uv,
                "submission_rate": round((sc / uv) if uv else 0.0, 4),
            }
        )

    recent_sql = text(
        """
        SELECT s.id, s.page_id, p.title, s.status, s.submitter_email, s.created_at
        FROM submissions s
        INNER JOIN pages p ON p.id = s.page_id
        WHERE s.organization_id = CAST(:oid AS uuid)
          AND s.created_at >= :start
        ORDER BY s.created_at DESC
        LIMIT 20
        """
    )
    rr = (await db.execute(recent_sql, {"oid": str(organization_id), "start": start})).all()
    recent_submissions = [
        {
            "id": str(row[0]),
            "page_id": str(row[1]),
            "page_title": row[2],
            "status": row[3],
            "submitter_email": str(row[4]) if row[4] else None,
            "created_at": row[5].isoformat() if hasattr(row[5], "isoformat") else str(row[5]),
        }
        for row in rr
    ]

    org_day_sql = text(
        """
        SELECT date_trunc('day', created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int AS c
        FROM analytics_events
        WHERE organization_id = CAST(:oid AS uuid)
          AND event_type = 'page_view'
          AND created_at >= :start
        GROUP BY 1
        ORDER BY 1
        """
    )
    day_rows = (
        await db.execute(
            org_day_sql,
            {"oid": str(organization_id), "start": start},
        )
    ).all()
    views_by_day = [
        {
            "date": r[0].isoformat() if hasattr(r[0], "isoformat") else str(r[0]),
            "count": r[1],
        }
        for r in day_rows
    ]

    return {
        "range": range_key,
        "total_views": views,
        "total_submissions": subs,
        "submissions_this_month": subs_m,
        "submissions_prev_month": subs_prev,
        "submissions_month_trend_pct": trend_pct,
        "live_pages": live_pages,
        "team_members": team_members,
        "ai_tokens_this_month": tokens_total,
        "top_pages": top_pages,
        "recent_submissions": recent_submissions,
        "views_by_day": views_by_day,
    }


async def page_events_page(
    db: AsyncSession,
    *,
    organization_id: UUID,
    page_id: UUID,
    cursor: str | None,
    limit: int = 50,
) -> dict[str, Any]:
    lim = min(max(limit, 1), 100)
    q = (
        select(AnalyticsEvent)
        .where(
            AnalyticsEvent.organization_id == organization_id,
            AnalyticsEvent.page_id == page_id,
        )
        .order_by(AnalyticsEvent.created_at.desc(), AnalyticsEvent.id.desc())
    )
    if cursor:
        try:
            pad = "=" * ((4 - len(cursor) % 4) % 4)
            raw = base64.urlsafe_b64decode(cursor.encode("ascii") + pad.encode("ascii"))
            payload = json.loads(raw.decode("utf-8"))
            ts = datetime.fromisoformat(payload["t"])
            eid = UUID(payload["id"])
            q = q.where(
                or_(
                    AnalyticsEvent.created_at < ts,
                    (AnalyticsEvent.created_at == ts) & (AnalyticsEvent.id < eid),
                )
            )
        except Exception as e:
            logger.warning("page_events_page bad cursor: %s", e)

    rows = (await db.execute(q.limit(lim + 1))).scalars().all()
    has_more = len(rows) > lim
    rows = rows[:lim]
    out_items = []
    for r in rows:
        out_items.append(
            {
                "id": str(r.id),
                "event_type": r.event_type,
                "visitor_id": r.visitor_id[:16] + "…",
                "session_id": r.session_id[:12] + "…",
                "metadata": r.metadata_,
                "created_at": r.created_at.isoformat(),
            }
        )
    next_cursor = None
    if has_more and rows:
        last = rows[-1]
        next_cursor = base64.urlsafe_b64encode(
            json.dumps({"t": last.created_at.isoformat(), "id": str(last.id)}).encode("utf-8")
        ).decode("ascii").rstrip("=")
    return {"items": out_items, "next_cursor": next_cursor}
