"""Funnel definitions and SQL-backed computation (GL-01)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.analytics_cache import cache_get_json, cache_set_json

UniqueOn = Literal["visitor", "user", "session"]


@dataclass
class FunnelStep:
    name: str
    event_type: str
    filter: dict[str, Any] | None = None


@dataclass
class FunnelDefinition:
    id: str
    name: str
    steps: list[FunnelStep]
    conversion_window: timedelta = field(default_factory=lambda: timedelta(hours=24))
    exact_order: bool = True
    unique_on: UniqueOn = "session"


class FunnelStepResult(BaseModel):
    step_name: str
    event_type: str
    entrants: int
    completers: int
    drop_off_count: int
    drop_off_rate: float
    step_conversion_rate: float
    cumulative_conversion: float
    median_time_to_next_step_seconds: int | None = None
    p90_time_to_next_step_seconds: int | None = None
    field_drop_off: dict[str, int] = Field(default_factory=dict)


class FunnelResult(BaseModel):
    funnel_id: str
    steps: list[FunnelStepResult]
    last_seen_histogram: dict[str, int] = Field(default_factory=dict)


def _actor(unique_on: UniqueOn) -> str:
    if unique_on == "visitor":
        return "visitor_id"
    if unique_on == "user":
        return "COALESCE(user_id::text, visitor_id)"
    return "session_id"


async def compute_funnel(
    db: AsyncSession,
    funnel: FunnelDefinition,
    *,
    organization_id: UUID,
    date_from: Any,
    date_to: Any,
    segment_hash: str = "",
) -> FunnelResult:
    """Sequential funnel: step k must occur after step k-1 within ``conversion_window``."""
    del segment_hash
    actor = _actor(funnel.unique_on)
    wsec = int(funnel.conversion_window.total_seconds())
    oid = str(organization_id)
    if not funnel.steps:
        return FunnelResult(funnel_id=funnel.id, steps=[])

    steps_res: list[FunnelStepResult] = []

    entrants0 = (
        await db.execute(
            text(
                f"""
                SELECT COUNT(*)::int FROM (
                  SELECT DISTINCT {actor} FROM analytics_events
                  WHERE organization_id = CAST(:oid AS uuid)
                    AND created_at >= :df AND created_at < :dt
                    AND event_type = :et0
                ) s
                """
            ),
            {"oid": oid, "df": date_from, "dt": date_to, "et0": funnel.steps[0].event_type},
        )
    ).scalar_one()
    funnel_entrants = int(entrants0 or 0)

    for i, step in enumerate(funnel.steps):
        if i == 0:
            completers = (
                await db.execute(
                    text(
                        f"""
                        SELECT COUNT(*)::int FROM (
                          SELECT DISTINCT {actor} FROM analytics_events
                          WHERE organization_id = CAST(:oid AS uuid)
                            AND created_at >= :df AND created_at < :dt
                            AND event_type = :et
                        ) s
                        """
                    ),
                    {"oid": oid, "df": date_from, "dt": date_to, "et": step.event_type},
                )
            ).scalar_one()
            comp = int(completers or 0)
            steps_res.append(
                FunnelStepResult(
                    step_name=step.name,
                    event_type=step.event_type,
                    entrants=funnel_entrants,
                    completers=comp,
                    drop_off_count=max(0, funnel_entrants - comp),
                    drop_off_rate=((funnel_entrants - comp) / funnel_entrants) if funnel_entrants else 0.0,
                    step_conversion_rate=(comp / funnel_entrants) if funnel_entrants else 0.0,
                    cumulative_conversion=(comp / funnel_entrants) if funnel_entrants else 0.0,
                )
            )
            continue

        et_prev = funnel.steps[i - 1].event_type
        et_cur = step.event_type
        sql = f"""
        WITH prev_times AS (
          SELECT {actor} AS actor, MIN(created_at) AS t_prev
          FROM analytics_events
          WHERE organization_id = CAST(:oid AS uuid)
            AND created_at >= :df AND created_at < :dt
            AND event_type = :et_prev
          GROUP BY 1
        ),
        nxt AS (
          SELECT DISTINCT e.{actor} AS actor
          FROM analytics_events e
          INNER JOIN prev_times p ON p.actor = e.{actor}
          WHERE e.organization_id = CAST(:oid AS uuid)
            AND e.created_at >= :df AND e.created_at < :dt
            AND e.event_type = :et_cur
            AND e.created_at >= p.t_prev
            AND e.created_at <= p.t_prev + (CAST(:wsec AS int) * INTERVAL '1 second')
        )
        SELECT
          (SELECT COUNT(*)::int FROM prev_times) AS entrants,
          (SELECT COUNT(*)::int FROM nxt) AS completers
        """
        row = (
            await db.execute(
                text(sql),
                {
                    "oid": oid,
                    "df": date_from,
                    "dt": date_to,
                    "et_prev": et_prev,
                    "et_cur": et_cur,
                    "wsec": wsec,
                },
            )
        ).one()
        ent, comp = int(row[0] or 0), int(row[1] or 0)
        drop = max(0, ent - comp)
        steps_res.append(
            FunnelStepResult(
                step_name=step.name,
                event_type=step.event_type,
                entrants=ent,
                completers=comp,
                drop_off_count=drop,
                drop_off_rate=(drop / ent) if ent else 0.0,
                step_conversion_rate=(comp / ent) if ent else 0.0,
                cumulative_conversion=(comp / funnel_entrants) if funnel_entrants else 0.0,
            )
        )

    # Field-level drop-off for form funnels (best-effort)
    if any(s.event_type == "form_field_focus" for s in funnel.steps):
        fd_sql = text(
            """
            SELECT COALESCE(metadata->>'field_id', metadata->>'field', '(unknown)') AS fid, COUNT(*)::int AS c
            FROM analytics_events
            WHERE organization_id = CAST(:oid AS uuid)
              AND created_at >= :df AND created_at < :dt
              AND event_type = 'form_field_abandon'
            GROUP BY 1
            ORDER BY c DESC
            LIMIT 32
            """
        )
        rows = (await db.execute(fd_sql, {"oid": oid, "df": date_from, "dt": date_to})).all()
        fd = {str(r[0]): int(r[1]) for r in rows}
        for sr in steps_res:
            if sr.event_type == "form_field_focus":
                sr.field_drop_off = fd

    if len(steps_res) >= 2:
        s0, s1e = steps_res[0], steps_res[1]
        s0.completers = s1e.entrants
        s0.drop_off_count = max(0, s0.entrants - s0.completers)
        s0.drop_off_rate = (s0.drop_off_count / s0.entrants) if s0.entrants else 0.0
        s0.step_conversion_rate = (s0.completers / s0.entrants) if s0.entrants else 0.0
        fe = steps_res[0].entrants
        s0.cumulative_conversion = (s0.completers / fe) if fe else 0.0

    return FunnelResult(funnel_id=funnel.id, steps=steps_res)


async def compute_funnel_cached(
    db: AsyncSession,
    redis: Any,
    funnel: FunnelDefinition,
    *,
    organization_id: UUID,
    date_from: Any,
    date_to: Any,
) -> FunnelResult:
    key = f"funnel:{funnel.id}:{organization_id}:{date_from}:{date_to}"
    if redis is not None:
        hit = await cache_get_json(redis, key)
        if hit is not None:
            return FunnelResult.model_validate(hit)
    out = await compute_funnel(db, funnel, organization_id=organization_id, date_from=date_from, date_to=date_to)
    if redis is not None:
        await cache_set_json(redis, key, out.model_dump())
    return out
