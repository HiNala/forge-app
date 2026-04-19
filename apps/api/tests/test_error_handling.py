"""BI-02 — structured error JSON (ForgeError, validation, no stack in prod paths)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, Field

from app.core.errors import NotFound, QuotaExceeded
from app.core.exception_handlers import request_validation_handler
from app.main import forge_error_handler


@pytest.mark.asyncio
async def test_validation_error_flattens_fields() -> None:
    """Same handler as production — flattened ``fields`` for 422 bodies."""

    from fastapi.exceptions import RequestValidationError

    class _Body(BaseModel):
        prompt: str = Field(..., min_length=1)

    vapp = FastAPI()
    vapp.add_exception_handler(RequestValidationError, request_validation_handler)

    @vapp.post("/demo")
    async def _demo(body: _Body) -> dict[str, str]:
        return {"ok": "true"}

    transport = ASGITransport(app=vapp)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post("/demo", json={})
    assert r.status_code == 422
    body = r.json()
    assert body.get("code") == "validation_error"
    extra = body.get("extra") or {}
    assert "fields" in extra
    assert isinstance(extra["fields"], list)


@pytest.mark.asyncio
async def test_forge_error_handler_serializes_quota() -> None:
    req = MagicMock()
    req.state.request_id = "err-req-1"
    exc = QuotaExceeded(
        "Monthly limit reached",
        extra={"metric": "pages", "current": 100, "limit": 100, "upgrade_url": "https://x"},
    )
    resp = await forge_error_handler(req, exc)
    assert resp.status_code == 402
    import json

    payload = json.loads(resp.body.decode())
    assert payload["code"] == "quota_exceeded"
    assert payload["message"] == "Monthly limit reached"
    assert payload["request_id"] == "err-req-1"
    assert payload["extra"]["metric"] == "pages"


@pytest.mark.asyncio
async def test_forge_error_handler_serializes_not_found() -> None:
    req = MagicMock()
    req.state.request_id = None
    resp = await forge_error_handler(req, NotFound("gone"))
    assert resp.status_code == 404
    import json

    payload = json.loads(resp.body.decode())
    assert payload["code"] == "not_found"
    assert payload["message"] == "gone"
    assert payload.get("request_id") is None
