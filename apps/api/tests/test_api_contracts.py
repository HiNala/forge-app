"""BI-03 — OpenAPI contract smoke (paths + critical routes exist)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


def test_openapi_spec_contains_expected_groups() -> None:
    spec = app.openapi()
    paths = spec.get("paths") or {}
    assert len(paths) >= 60, "expecting large REST surface"
    assert "/api/v1/auth/me" in paths
    assert "/api/v1/pages" in paths
    assert "/api/v1/org/brand" in paths
    assert "/api/v1/team/members" in paths
    assert "/api/v1/billing/webhook" in paths
    assert "/api/v1/studio/generate" in paths
    tags = set()
    for ops in paths.values():
        for op in ops.values():
            if not isinstance(op, dict):
                continue
            for t in op.get("tags") or []:
                tags.add(t)
    assert "auth" in tags
    assert "pages" in tags


@pytest.mark.asyncio
async def test_openapi_route_list_is_json() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/api/v1/openapi.json")
    assert r.status_code == 200
    data = r.json()
    assert "openapi" in data
    assert "paths" in data


@pytest.mark.asyncio
async def test_health_and_metrics_exposed() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        live = await client.get("/health/live")
        metrics = await client.get("/metrics")
    assert live.status_code == 200
    assert metrics.status_code == 200
