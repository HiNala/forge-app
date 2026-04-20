"""GL-01 — funnel engine returns structured results for a seeded journey."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from app.db.models import AnalyticsEvent, Organization, Page
from app.db.session import AsyncSessionLocal
from app.services.analytics.funnels import FunnelDefinition, FunnelStep, compute_funnel
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_compute_contact_funnel_single_session_journey() -> None:
    await require_postgres()
    oid = uuid.uuid4()
    pid = uuid.uuid4()
    vid = "visitor-funnel-test"
    sid = "sess-funnel-test"
    t0 = datetime.now(UTC) - timedelta(hours=1)

    async with AsyncSessionLocal() as s:
        s.add(Organization(id=oid, name="Funnel Test Org", slug=f"ft-{oid.hex[:8]}"))
        await s.flush()
        s.add(
            Page(
                id=pid,
                organization_id=oid,
                slug="contact",
                page_type="contact-form",
                title="C",
                status="live",
                current_html="<html><body>x</body></html>",
            )
        )
        await s.flush()
        base = {"organization_id": oid, "page_id": pid, "visitor_id": vid, "session_id": sid}
        seq = [
            "page_view",
            "form_view",
            "form_start",
            "form_submit_attempt",
            "form_submit_success",
        ]
        for i, et in enumerate(seq):
            s.add(
                AnalyticsEvent(
                    id=uuid.uuid4(),
                    event_type=et,
                    metadata_={"page_id": str(pid)},
                    created_at=t0 + timedelta(minutes=i),
                    **base,
                )
            )
        await s.commit()

    funnel = FunnelDefinition(
        id="default_contact_form",
        name="Contact form",
        steps=[
            FunnelStep(name="Page view", event_type="page_view"),
            FunnelStep(name="Form view", event_type="form_view"),
            FunnelStep(name="Form start", event_type="form_start"),
            FunnelStep(name="Submit attempt", event_type="form_submit_attempt"),
            FunnelStep(name="Submit success", event_type="form_submit_success"),
        ],
    )
    df = t0 - timedelta(minutes=5)
    dt = t0 + timedelta(hours=2)

    async with AsyncSessionLocal() as db:
        out = await compute_funnel(
            db, funnel, organization_id=oid, date_from=df, date_to=dt
        )

    assert out.funnel_id == "default_contact_form"
    assert len(out.steps) == 5
    assert out.steps[0].entrants >= 1
    assert out.steps[-1].completers >= 1
