"""BI-02 — request id header, tenant resolution, rate limit JSON shape."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.db.models import Membership, Organization, Page, User
from app.db.session import AsyncSessionLocal
from app.main import app


@pytest.mark.asyncio
async def test_request_id_echo_and_live() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/health/live", headers={"X-Request-ID": "fixed-id"})
    assert r.status_code == 200
    assert r.headers.get("x-request-id") == "fixed-id"


@pytest.mark.asyncio
async def test_metrics_not_rate_limited() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/metrics")
    assert r.status_code == 200
    assert "text/plain" in (r.headers.get("content-type") or "")


@pytest.mark.asyncio
async def test_metrics_gated_by_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """When METRICS_TOKEN is set, /metrics must require `Authorization: Bearer <token>`."""
    from app.config import settings

    monkeypatch.setattr(settings, "METRICS_TOKEN", "scrape-secret")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. no token → 401
        r_missing = await client.get("/metrics")
        # 2. wrong scheme → 401
        r_basic = await client.get("/metrics", headers={"authorization": "Basic scrape-secret"})
        # 3. wrong token → 401
        r_bad = await client.get("/metrics", headers={"authorization": "Bearer wrong"})
        # 4. correct token → 200
        r_ok = await client.get("/metrics", headers={"authorization": "Bearer scrape-secret"})

    assert r_missing.status_code == 401
    assert r_basic.status_code == 401
    assert r_bad.status_code == 401
    assert r_ok.status_code == 200
    assert "text/plain" in (r_ok.headers.get("content-type") or "")


@pytest.mark.asyncio
async def test_org_not_specified_when_two_memberships() -> None:
    ua = uuid.uuid4()
    org_a, org_b = uuid.uuid4(), uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@bi02.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_a, name="A", slug=f"a-{ua.hex[:8]}"),
                Organization(id=org_b, name="B", slug=f"b-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add_all(
            [
                Membership(user_id=ua, organization_id=org_a, role="owner"),
                Membership(user_id=ua, organization_id=org_b, role="viewer"),
            ]
        )
        s.add(
            Page(
                organization_id=org_a,
                slug="p1",
                page_type="landing",
                title="P",
            )
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/pages",
            headers={
                "x-forge-test-user-id": str(ua),
            },
        )
    assert r.status_code == 400
    body = r.json()
    assert body.get("code") == "org_not_specified"


@pytest.mark.asyncio
async def test_single_org_defaults_without_header() -> None:
    ua = uuid.uuid4()
    org_a = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add_all(
            [
                User(id=ua, email=f"{ua.hex}@bi02b.example.com", auth_provider_id=f"clerk_{ua}"),
                Organization(id=org_a, name="Single", slug=f"s-{ua.hex[:8]}"),
            ]
        )
        await s.flush()
        s.add(Membership(user_id=ua, organization_id=org_a, role="owner"))
        s.add(
            Page(
                organization_id=org_a,
                slug="alone",
                page_type="landing",
                title="P",
            )
        )
        await s.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get(
            "/api/v1/pages",
            headers={"x-forge-test-user-id": str(ua)},
        )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 1


def test_rate_limited_response_json_shape() -> None:
    from app.middleware.rate_limit import _rate_limited_response

    r = _rate_limited_response()
    assert r.status_code == 429
    import json

    body = json.loads(r.body.decode())
    assert body["code"] == "rate_limited"
    assert body["retry_after_seconds"] == 60
