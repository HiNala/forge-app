"""Stripe webhook route — raw body + optional signature (dev: no secret)."""

from __future__ import annotations

import json
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings


@pytest.mark.asyncio
async def test_stripe_webhook_ok_when_webhook_secret_not_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    from app.main import app

    eid = f"evt_{uuid.uuid4().hex}"
    payload = {
        "id": eid,
        "type": "customer.subscription.trial_will_end",
        "data": {"object": {}},
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            "/api/v1/billing/webhook",
            content=json.dumps(payload).encode("utf-8"),
            headers={"content-type": "application/json"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body.get("ok") is True
