"""Mission 06 — analytics batch ingest, summaries, funnel math, quotas, ownership."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.db.models import AnalyticsEvent, Membership, Organization, Page, Submission, User
from app.db.rls_context import set_active_organization
from app.db.session import AsyncSessionLocal
from app.services.analytics_service import page_funnel
from tests.support.headers import forge_test_headers
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_public_track_batch_persists_ten_events() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@t.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="T", slug=f"t-{uid.hex[:8]}", plan="pro"))
        await s.flush()
        s.add(
            Page(
                organization_id=oid,
                slug="live",
                page_type="contact-form",
                title="CF",
                status="live",
                current_html="<html><head><meta name='viewport' content='w'/></head><body><p>x</p></body></html>",
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        org = await s2.get(Organization, oid)
        assert org is not None
        oslug = org.slug

    transport = ASGITransport(app=app)
    evs = []
    for i in range(10):
        evs.append(
            {
                "event_type": "page_view",
                "visitor_id": f"v{i}",
                "session_id": "s1",
                "metadata": {"i": i},
            }
        )
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            f"/p/{oslug}/live/track",
            json={"events": evs},
        )
        assert r.status_code == 200
        assert r.json()["accepted"] == 10

    async with AsyncSessionLocal() as s3:
        await set_active_organization(s3, oid)
        n = (
            await s3.execute(
                select(func.count()).select_from(AnalyticsEvent).where(AnalyticsEvent.page_id == p.id)
            )
        ).scalar_one()
        assert int(n) >= 10


@pytest.mark.asyncio
async def test_page_analytics_summary_zero_for_new_page() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    pid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(User(id=uid, email=f"{uid.hex}@z.example.com", auth_provider_id=f"clerk_{uid}"))
        s.add(Organization(id=oid, name="Z", slug=f"z-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                id=pid,
                organization_id=oid,
                slug="zpage",
                page_type="landing",
                title="Z",
                status="live",
                current_html="<html><head><meta name='viewport' content='w'/></head><body><p>ok</p></body></html>",
            )
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            f"/api/v1/pages/{pid}/analytics/summary?range=7d",
            headers=forge_test_headers(uid, oid),
        )
        assert r.status_code == 200
        data = r.json()
        assert data["unique_visitors"] == 0
        assert data["total_views"] == 0
        assert data.get("avg_time_on_page_ms") == 0
        assert data.get("section_dwell_total_ms") == 0


@pytest.mark.asyncio
async def test_funnel_submit_rate_handcrafted() -> None:
    await require_postgres()
    oid = uuid.uuid4()
    pid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(Organization(id=oid, name="Funnel Org", slug=f"fn-{oid.hex[:8]}"))
        await s.flush()
        s.add(
            Page(
                id=pid,
                organization_id=oid,
                slug="fpage",
                page_type="contact-form",
                title="F",
                status="live",
                current_html="<html><head><meta name='viewport' content='w'/></head><body><p>x</p></body></html>",
            )
        )
        await s.flush()
        now = datetime.now(UTC)
        base = {"organization_id": oid, "page_id": pid, "created_at": now}
        for _ in range(3):
            s.add(
                AnalyticsEvent(
                    id=uuid.uuid4(),
                    event_type="form_start",
                    visitor_id="x",
                    session_id=uuid.uuid4().hex,
                    **base,
                )
            )
        for _ in range(2):
            s.add(
                AnalyticsEvent(
                    id=uuid.uuid4(),
                    event_type="form_field_touch",
                    visitor_id="x",
                    session_id=uuid.uuid4().hex,
                    metadata_={"field": "email"},
                    **base,
                )
            )
        s.add(
            AnalyticsEvent(
                id=uuid.uuid4(),
                event_type="form_submit_success",
                visitor_id="x",
                session_id=uuid.uuid4().hex,
                **base,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as db:
        out = await page_funnel(db, organization_id=oid, page_id=pid, range_key="7d")
        assert out["form_starts"] == 3
        assert out["form_submits"] == 1
        assert abs(out["submit_rate_among_starters"] - (1 / 3)) < 0.01


@pytest.mark.asyncio
async def test_submission_quota_402_skips_write(monkeypatch: pytest.MonkeyPatch) -> None:
    """At-limit org must get 402 and no new submission row (usage pre-seeded)."""
    await require_postgres()
    monkeypatch.setattr(
        "app.services.billing_gate.monthly_submissions_limit",
        lambda _plan, trial_ends_at=None: 2,
    )
    from app.db.models import SubscriptionUsage
    from app.main import app
    from app.services.ai.usage import _month_start

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    period = _month_start()
    async with AsyncSessionLocal() as s:
        s.add(User(id=uid, email=f"{uid.hex}@q.example.com", auth_provider_id=f"clerk_{uid}"))
        s.add(Organization(id=oid, name="Q", slug=f"q-{uid.hex[:8]}", plan="starter"))
        await s.flush()
        s.add(
            Page(
                organization_id=oid,
                slug="form",
                page_type="contact-form",
                title="F",
                status="live",
                current_html=(
                    "<html><head><meta name='viewport' content='w'/>"
                    "</head><body><form action='/p/x/form/submit'></form></body></html>"
                ),
                form_schema={"fields": [{"name": "email", "label": "Email", "type": "email"}]},
            )
        )
        s.add(
            SubscriptionUsage(
                organization_id=oid,
                period_start=period,
                submissions_received=2,
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        org = await s2.get(Organization, oid)
        assert org is not None
        oslug = org.slug

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r402 = await client.post(
            f"/p/{oslug}/form/submit",
            json={"email": "blocked@e.com"},
        )
        assert r402.status_code == 402
        body = r402.json()
        assert body["code"] == "quota_exceeded"
        assert body["extra"]["metric"] == "submissions"

    async with AsyncSessionLocal() as s3:
        await set_active_organization(s3, oid)
        n = (
            await s3.execute(
                select(func.count()).select_from(Submission).where(Submission.organization_id == oid)
            )
        ).scalar_one()
        assert int(n) == 0


@pytest.mark.asyncio
async def test_transfer_ownership_swaps_roles() -> None:
    await require_postgres()
    from app.db.models import Membership
    from app.main import app

    owner_id = uuid.uuid4()
    editor_id = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=owner_id,
                email=f"{owner_id.hex}@o.example.com",
                auth_provider_id=f"clerk_{owner_id}",
            )
        )
        s.add(
            User(
                id=editor_id,
                email=f"{editor_id.hex}@e.example.com",
                auth_provider_id=f"clerk_{editor_id}",
            )
        )
        s.add(Organization(id=oid, name="O", slug=f"o-{owner_id.hex[:8]}"))
        await s.flush()
        mo = Membership(user_id=owner_id, organization_id=oid, role="owner")
        me = Membership(user_id=editor_id, organization_id=oid, role="editor")
        s.add(mo)
        s.add(me)
        await s.commit()
        mid_editor = me.id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/team/transfer-ownership",
            json={"target_membership_id": str(mid_editor)},
            headers=forge_test_headers(owner_id, oid),
        )
        assert r.status_code == 200
        assert r.json()["role"] == "owner"

    async with AsyncSessionLocal() as s2:
        mo2 = (
            await s2.execute(
                select(Membership).where(
                    Membership.user_id == owner_id,
                    Membership.organization_id == oid,
                )
            )
        ).scalar_one()
        me2 = (
            await s2.execute(
                select(Membership).where(
                    Membership.user_id == editor_id,
                    Membership.organization_id == oid,
                )
            )
        ).scalar_one()
        assert mo2.role == "editor"
        assert me2.role == "owner"
