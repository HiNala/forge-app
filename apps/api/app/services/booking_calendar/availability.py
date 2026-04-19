"""Compute bookable slots from business hours minus busy blocks (W-01)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AvailabilityCalendar, CalendarBusyBlock


def _overlap(a0: datetime, a1: datetime, b0: datetime, b1: datetime) -> bool:
    return a0 < b1 and b0 < a1


def _parse_hhmm(s: str) -> tuple[int, int]:
    parts = s.strip().split(":")
    h = int(parts[0])
    m = int(parts[1]) if len(parts) > 1 else 0
    return h, m


def _windows_for_weekday(business_hours: dict[str, Any], wd: int) -> list[tuple[str, str]]:
    raw = business_hours.get(str(wd))
    if raw is None:
        return []
    if isinstance(raw, list):
        out: list[tuple[str, str]] = []
        for w in raw:
            if isinstance(w, (list, tuple)) and len(w) >= 2:
                out.append((str(w[0]), str(w[1])))
        return out
    return []


@dataclass(frozen=True)
class ComputeParams:
    date_from: date
    date_to: date
    duration_minutes: int
    slot_increment_minutes: int


async def load_busy_blocks(
    db: AsyncSession,
    *,
    calendar_id: UUID,
    range_start_utc: datetime,
    range_end_utc: datetime,
) -> list[tuple[datetime, datetime]]:
    q = await db.execute(
        select(CalendarBusyBlock.starts_at, CalendarBusyBlock.ends_at).where(
            CalendarBusyBlock.calendar_id == calendar_id,
            CalendarBusyBlock.ends_at > range_start_utc,
            CalendarBusyBlock.starts_at < range_end_utc,
        )
    )
    return [(r[0], r[1]) for r in q.all()]


async def compute_slots(
    db: AsyncSession,
    *,
    calendar: AvailabilityCalendar,
    params: ComputeParams,
) -> list[dict[str, Any]]:
    """Return slot dicts with UTC ISO start/end and calendar timezone id."""
    tz = ZoneInfo(calendar.timezone)
    now_utc = datetime.now(UTC)

    min_notice = timedelta(minutes=max(calendar.min_notice_minutes, 0))
    max_adv = timedelta(days=max(calendar.max_advance_days, 0))
    buf_b = timedelta(minutes=max(calendar.buffer_before_minutes, 0))
    buf_a = timedelta(minutes=max(calendar.buffer_after_minutes, 0))

    earliest = (now_utc + min_notice).astimezone(tz).date()
    latest = (now_utc + max_adv).astimezone(tz).date()

    d0 = max(params.date_from, earliest)
    d1 = min(params.date_to, latest)
    if d0 > d1:
        return []

    dur = timedelta(minutes=max(params.duration_minutes, 5))
    step = timedelta(minutes=max(params.slot_increment_minutes, 5))

    range_pad_start = datetime.combine(d0, datetime.min.time(), tzinfo=tz) - (buf_b + dur)
    range_pad_end = datetime.combine(d1, datetime.max.time(), tzinfo=tz) + (buf_a + dur)
    busy = await load_busy_blocks(
        db,
        calendar_id=calendar.id,
        range_start_utc=range_pad_start.astimezone(UTC),
        range_end_utc=range_pad_end.astimezone(UTC),
    )

    slots: list[dict[str, Any]] = []
    day = d0
    while day <= d1:
        for w_start, w_end in _windows_for_weekday(calendar.business_hours, day.weekday()):
            sh, sm = _parse_hhmm(w_start)
            eh, em = _parse_hhmm(w_end)
            day_start = datetime(
                day.year, day.month, day.day, sh, sm, tzinfo=tz
            )
            day_end = datetime(day.year, day.month, day.day, eh, em, tzinfo=tz)
            if day_end <= day_start:
                continue
            cursor = day_start
            while cursor + dur <= day_end:
                slot_start = cursor.astimezone(UTC)
                slot_end = (cursor + dur).astimezone(UTC)
                check_start = slot_start - buf_b
                check_end = slot_end + buf_a
                blocked = any(_overlap(check_start, check_end, b0, b1) for b0, b1 in busy)
                if not blocked:
                    slots.append(
                        {
                            "start": slot_start.isoformat().replace("+00:00", "Z"),
                            "end": slot_end.isoformat().replace("+00:00", "Z"),
                            "timezone": calendar.timezone,
                        }
                    )
                cursor = cursor + step
        day = day + timedelta(days=1)

    return slots
