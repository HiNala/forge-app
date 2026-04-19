"""BI-02 — end-to-end RLS: list pages only for the active org."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import Membership, Organization, Page, User
from app.db.session import AsyncSessionLocal
from app.main import app


@pytest.mark.asyncio
async def test_pages_list_scoped_to_active_org_header() -> None:
    ua = uuid.uuid4()
    org_a, org_b = uuid.uuid4(), uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@rls.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_a, name="OrgA", slug=f"oa-{ua.hex[:8]}"),
                Organization(id=org_b, name="OrgB", slug=f"ob-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add_all(
            [
                Membership(user_id=ua, organization_id=org_a, role="owner"),
                Membership(user_id=ua, organization_id=org_b, role="viewer"),
            ]
        )
        s.add_all(
            [
                Page(
                    organization_id=org_a,
                    slug="only-a",
                    page_type="landing",
                    title="A",
                ),
                Page(
                    organization_id=org_b,
                    slug="only-b",
                    page_type="landing",
                    title="B",
                ),
            ]
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        ra = await client.get(
            "/api/v1/pages",
            headers={
                "x-forge-test-user-id": str(ua),
                "x-forge-active-org-id": str(org_a),
            },
        )
        rb = await client.get(
            "/api/v1/pages",
            headers={
                "x-forge-test-user-id": str(ua),
                "x-forge-active-org-id": str(org_b),
            },
        )
    assert ra.status_code == 200
    assert rb.status_code == 200
    sa = {p["slug"] for p in ra.json()}
    sb = {p["slug"] for p in rb.json()}
    assert sa == {"only-a"}
    assert sb == {"only-b"}
