"""Retention cohort grid (GL-01) — reads ``retention_signup_weekly`` MV."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class RetentionGrid(BaseModel):
    cohort_event: str
    return_event: str
    cohort_size: str
    cells: list[dict[str, Any]] = Field(default_factory=list)


async def compute_retention_from_mv(
    db: AsyncSession,
    *,
    organization_id: UUID,
) -> list[dict[str, Any]]:
    """Rows from materialized view (refreshed nightly)."""
    rows = (
        await db.execute(
            text(
                """
                SELECT cohort_week::text, period::int,
                       returning_users::int, cohort_size::int
                FROM retention_signup_weekly
                WHERE organization_id = CAST(:oid AS uuid)
                ORDER BY cohort_week DESC, period ASC
                """
            ),
            {"oid": str(organization_id)},
        )
    ).all()
    out = []
    for r in rows:
        cs = int(r[3] or 0)
        ru = int(r[2] or 0)
        out.append(
            {
                "cohort_week": r[0],
                "period": int(r[1]),
                "returning_users": ru,
                "cohort_size": cs,
                "return_rate": (ru / cs) if cs else 0.0,
            }
        )
    return out


async def compute_retention(
    db: AsyncSession,
    *,
    org_id: UUID,
    cohort_event: str,
    return_event: str,
    cohort_size: str = "week",
    max_periods: int = 12,
) -> RetentionGrid:
    """Placeholder aggregation hook — MV is signup/week; extend for arbitrary cohorts."""
    del cohort_event, return_event, cohort_size, max_periods
    cells = await compute_retention_from_mv(db, organization_id=org_id)
    return RetentionGrid(
        cohort_event="signup_complete",
        return_event="mixed",
        cohort_size="week",
        cells=cells,
    )
