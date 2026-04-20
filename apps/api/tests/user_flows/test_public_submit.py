"""
Public POST /p/{org}/{page}/submit — visitor submits a live page form.

Requires PostgreSQL.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.db.models import AnalyticsEvent, Membership, Organization, Page, Submission, User
from app.db.session import AsyncSessionLocal
from tests.support.headers import forge_test_headers
from tests.support.html_samples import VALID_PUBLISHABLE_HTML
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_submit_json_stores_submission_and_analytics_event() -> None:
    """After publish, a visitor POSTs JSON; row appears in submissions + analytics_events."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@sub.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Sub Org", slug=f"so-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="contact",
                page_type="landing",
                title="Contact",
                current_html=VALID_PUBLISHABLE_HTML,
                form_schema={"required": ["message"]},
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        page_id = p.id
        org = await s2.get(Organization, oid)
        assert org is not None
        org_slug = org.slug

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pub = await client.post(
            f"/api/v1/pages/{page_id}/publish",
            headers=forge_test_headers(uid, oid),
        )
        assert pub.status_code == 200

        sub = await client.post(
            f"/p/{org_slug}/contact/submit",
            json={"message": "Need a quote", "email": "lead@example.com", "name": "Alex"},
            headers={"X-Forwarded-For": "203.0.113.50"},
        )
        assert sub.status_code == 200
        assert sub.json().get("ok") is True

    async with AsyncSessionLocal() as s3:
        rows = (
            await s3.execute(select(Submission).where(Submission.page_id == page_id))
        ).scalars().all()
        assert len(rows) == 1
        assert rows[0].payload.get("message") == "Need a quote"
        assert rows[0].submitter_email == "lead@example.com"
        assert str(rows[0].source_ip) == "203.0.113.0"

        n_ev = (
            await s3.execute(
                select(func.count())
                .select_from(AnalyticsEvent)
                .where(
                    AnalyticsEvent.page_id == page_id,
                    AnalyticsEvent.event_type == "form_submit_success",
                )
            )
        ).scalar_one()
        assert int(n_ev) >= 1


@pytest.mark.asyncio
async def test_submit_returns_422_when_required_field_missing() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@v.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="V", slug=f"v-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="p1",
                page_type="landing",
                title="P",
                current_html=VALID_PUBLISHABLE_HTML,
                form_schema={"required": ["message"]},
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        pid = p.id
        org = await s2.get(Organization, oid)
        assert org is not None
        oslug = org.slug

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(f"/api/v1/pages/{pid}/publish", headers=forge_test_headers(uid, oid))
        r = await client.post(f"/p/{oslug}/p1/submit", json={"email": "x@y.com"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_submit_urlencoded_works_without_javascript() -> None:
    """A plain HTML form posts x-www-form-urlencoded; same outcome as JSON for the visitor."""
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@form.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Form Org", slug=f"fo-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Page(
                organization_id=oid,
                slug="plain",
                page_type="landing",
                title="Plain",
                current_html=VALID_PUBLISHABLE_HTML,
                form_schema={"required": ["message"]},
            )
        )
        await s.commit()

    async with AsyncSessionLocal() as s2:
        p = (await s2.execute(select(Page).where(Page.organization_id == oid))).scalars().first()
        assert p is not None
        page_id = p.id

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        pub = await client.post(f"/api/v1/pages/{page_id}/publish", headers=h)
        assert pub.status_code == 200
        org = pub.json()["public_url"].split("/p/")[1].split("/")[0]

        r = await client.post(
            f"/p/{org}/plain/submit",
            data={"message": "No JS", "email": "plain@example.com", "name": "Sam"},
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

    async with AsyncSessionLocal() as s3:
        rows = (
            await s3.execute(select(Submission).where(Submission.page_id == page_id))
        ).scalars().all()
        assert len(rows) == 1
        assert rows[0].payload.get("message") == "No JS"
        assert rows[0].submitter_email == "plain@example.com"
