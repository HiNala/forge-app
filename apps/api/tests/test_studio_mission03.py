"""Mission 03 — Studio pipeline, quota, section splice."""

from __future__ import annotations

import uuid
from datetime import date

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import Membership, Organization, SubscriptionUsage, User
from app.db.session import AsyncSessionLocal
from app.services.orchestration.section_editor import extract_section_html, splice_section


def test_section_splice_preserves_other_sections() -> None:
    full = """<!DOCTYPE html><html><body>
<section data-forge-section="a-0"><p>A</p></section>
<section data-forge-section="b-0"><p>B</p></section>
</body></html>"""
    new_b = '<section data-forge-section="b-0"><p>B2</p></section>'
    out = splice_section(full, "b-0", new_b)
    assert "A</p>" in out
    assert "B2" in out
    assert "B</p>" not in out


def test_extract_section() -> None:
    html = '<section data-forge-section="x-1"><div>inner</div></section>'
    assert extract_section_html(html, "x-1") is not None
    assert extract_section_html(html, "missing") is None


@pytest.mark.asyncio
async def test_studio_quota_returns_402(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.config import settings
    from app.main import app

    monkeypatch.setattr(settings, "PAGE_GENERATION_QUOTA_TRIAL", 1)
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@q.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Q", slug=f"q-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.flush()
        today = date.today()
        period_start = date(today.year, today.month, 1)
        s.add(
            SubscriptionUsage(
                organization_id=oid,
                period_start=period_start,
                pages_generated=1,
            )
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/studio/generate",
            json={"prompt": "test", "provider": "openai"},
            headers={
                "x-forge-test-user-id": str(uid),
                "x-forge-active-org-id": str(oid),
            },
        )
    assert r.status_code == 402
    body = r.json()
    assert body["code"] == "quota_exceeded"
