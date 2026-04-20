"""W-01 — availability computation and public hold conflicts (Postgres)."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.db.models import AvailabilityCalendar, CalendarBusyBlock, Organization, Page
from app.db.session import AsyncSessionLocal
from app.main import app
from app.services.booking_calendar.availability import ComputeParams, compute_slots
from tests.support.postgres import require_postgres


def _next_monday_not_too_soon() -> date:
    """A Monday at least 3 days out to satisfy min_notice defaults when not patched."""
    today = date.today()
    days_to_mon = (7 - today.weekday()) % 7
    if days_to_mon == 0:
        days_to_mon = 7
    mon = today + timedelta(days=days_to_mon)
    if mon < today + timedelta(days=3):
        mon += timedelta(days=7)
    return mon


@pytest.mark.asyncio
async def test_compute_slots_no_busy_weekday_window() -> None:
    await require_postgres()
    org_id = uuid.uuid4()
    mon = _next_monday_not_too_soon()
    async with AsyncSessionLocal() as s:
        await s.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(org_id)},
        )
        s.add(Organization(id=org_id, name="W01", slug=f"w01-{org_id.hex[:8]}"))
        await s.flush()
        cal = AvailabilityCalendar(
            organization_id=org_id,
            name="Test",
            source_type="ics_file",
            business_hours={"0": [["09:00", "12:00"]]},
            timezone="UTC",
            min_notice_minutes=0,
            max_advance_days=90,
            slot_duration_minutes=60,
            slot_increment_minutes=30,
        )
        s.add(cal)
        await s.commit()
        await s.refresh(cal)

    async with AsyncSessionLocal() as s:
        await s.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(org_id)},
        )
        c = await s.get(AvailabilityCalendar, cal.id)
        assert c is not None
        params = ComputeParams(
            date_from=mon,
            date_to=mon,
            duration_minutes=60,
            slot_increment_minutes=30,
        )
        slots = await compute_slots(s, calendar=c, params=params)
    # 09:00–10:00, 09:30–10:30, 10:00–11:00, 10:30–11:30, 11:00–12:00
    assert len(slots) == 5


@pytest.mark.asyncio
async def test_compute_slots_busy_plus_buffer_blocks_overlapping_slots() -> None:
    await require_postgres()
    org_id = uuid.uuid4()
    mon = _next_monday_not_too_soon()
    async with AsyncSessionLocal() as s:
        await s.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(org_id)},
        )
        s.add(Organization(id=org_id, name="W01b", slug=f"w01b-{org_id.hex[:8]}"))
        await s.flush()
        cal = AvailabilityCalendar(
            organization_id=org_id,
            name="Buf",
            source_type="ics_file",
            business_hours={"0": [["09:00", "12:00"]]},
            timezone="UTC",
            min_notice_minutes=0,
            max_advance_days=90,
            buffer_before_minutes=15,
            buffer_after_minutes=15,
            slot_duration_minutes=60,
            slot_increment_minutes=30,
        )
        s.add(cal)
        await s.flush()
        # Busy 10:00–10:45 UTC on that Monday — blocks slots whose buffered window overlaps
        busy_start = datetime(mon.year, mon.month, mon.day, 10, 0, tzinfo=UTC)
        busy_end = datetime(mon.year, mon.month, mon.day, 10, 45, tzinfo=UTC)
        s.add(
            CalendarBusyBlock(
                calendar_id=cal.id,
                starts_at=busy_start,
                ends_at=busy_end,
                source_uid="t",
            )
        )
        await s.commit()
        cid = cal.id

    async with AsyncSessionLocal() as s:
        await s.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(org_id)},
        )
        c = await s.get(AvailabilityCalendar, cid)
        assert c is not None
        params = ComputeParams(
            date_from=mon,
            date_to=mon,
            duration_minutes=60,
            slot_increment_minutes=30,
        )
        slots = await compute_slots(s, calendar=c, params=params)
    assert len(slots) < 5
    assert len(slots) >= 1


@pytest.mark.asyncio
async def test_public_hold_same_slot_twice_second_returns_409() -> None:
    await require_postgres()
    org_id = uuid.uuid4()
    page_id = uuid.uuid4()
    slug = f"w01h-{org_id.hex[:8]}"
    mon = _next_monday_not_too_soon()
    slot_start = datetime(mon.year, mon.month, mon.day, 9, 0, tzinfo=UTC)
    slot_end = datetime(mon.year, mon.month, mon.day, 10, 0, tzinfo=UTC)
    ss = slot_start.isoformat().replace("+00:00", "Z")
    se = slot_end.isoformat().replace("+00:00", "Z")

    async with AsyncSessionLocal() as s:
        await s.execute(
            text("SELECT set_config('app.current_tenant_id', :t, true)"),
            {"t": str(org_id)},
        )
        s.add(Organization(id=org_id, name="Hold", slug=slug))
        await s.flush()
        cal = AvailabilityCalendar(
            organization_id=org_id,
            name="H",
            source_type="ics_file",
            business_hours={"0": [["09:00", "12:00"]]},
            timezone="UTC",
            min_notice_minutes=0,
            max_advance_days=90,
            slot_duration_minutes=60,
            slot_increment_minutes=30,
        )
        s.add(cal)
        await s.flush()
        s.add(
            Page(
                id=page_id,
                organization_id=org_id,
                slug="book",
                page_type="contact_form",
                title="Book",
                status="live",
                intent_json={"booking": {"enabled": True, "calendar_id": str(cal.id)}},
            )
        )
        await s.commit()

    transport = ASGITransport(app=app)
    url = f"/p/{slug}/book/availability/hold"
    body = {"slot_start": ss, "slot_end": se}
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r1 = await client.post(url, json=body)
        r2 = await client.post(url, json=body)
    assert r1.status_code == 200
    assert r2.status_code == 409
