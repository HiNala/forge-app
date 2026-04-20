"""Production metrics endpoint optional token gate."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_metrics_unconfigured_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "METRICS_TOKEN", "")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/metrics")
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_metrics_rejects_wrong_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "METRICS_TOKEN", "secret-metrics")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/metrics", headers={"X-Metrics-Token": "wrong"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_metrics_accepts_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "METRICS_TOKEN", "secret-metrics")
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/metrics", headers={"X-Metrics-Token": "secret-metrics"})
    assert r.status_code == 200
    assert "text/plain" in (r.headers.get("content-type") or "")
    assert len(r.content) > 0
