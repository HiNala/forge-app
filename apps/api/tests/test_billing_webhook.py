"""Stripe webhook route — raw body + optional signature (dev: no secret)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings


@pytest.mark.asyncio
async def test_stripe_webhook_ok_when_webhook_secret_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/webhook",
            content=b'{"id":"evt_1"}',
            headers={"content-type": "application/json"},
        )
    assert r.status_code == 200
    assert r.json() == {"ok": True}
