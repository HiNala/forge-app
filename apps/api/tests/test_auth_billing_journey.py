from __future__ import annotations

from collections.abc import AsyncIterator
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1 import auth as auth_module
from app.api.v1 import billing as billing_module
from app.api.v1 import studio as studio_module
from app.config import settings
from app.db.models import Membership, User
from app.db.session import AsyncSessionLocal
from app.main import app
from tests.support.postgres import require_postgres


def _token_from_verify_url(url: str) -> str:
    token = parse_qs(urlparse(url).query).get("token", [""])[0]
    assert token
    return token


@pytest.mark.asyncio
async def test_signup_verify_first_generation_and_paid_checkout_journey(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    await require_postgres()
    monkeypatch.setattr(settings, "AUTH_TEST_BYPASS", False)
    monkeypatch.setattr(settings, "USE_PRODUCT_ORCHESTRATOR", True)

    sent_verify_urls: list[str] = []

    async def fake_send_email_verification(*, to_email: str, display_name: str | None, verify_url: str) -> str:
        del to_email, display_name
        sent_verify_urls.append(verify_url)
        return "email_test_verification"

    async def fake_stream_product_page_generation(**_: object) -> AsyncIterator[bytes]:
        yield b'event: intent\ndata: {"workflow":"landing","confidence":1}\n\n'
        yield b'event: html.complete\ndata: {"page_id":"00000000-0000-4000-8000-000000000001"}\n\n'

    async def fake_checkout_url(**_: object) -> str:
        return "https://checkout.stripe.test/session"

    monkeypatch.setattr(auth_module.email_service, "send_email_verification", fake_send_email_verification)
    monkeypatch.setattr(studio_module, "stream_product_page_generation", fake_stream_product_page_generation)
    monkeypatch.setattr(billing_module, "_create_checkout_url", fake_checkout_url)

    email = f"journey-{uuid4().hex}@example.com"
    password = "JourneyPass!2026"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        registered = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "display_name": "Journey User",
                "workspace_name": "Journey Workspace",
            },
        )
        assert registered.status_code == 200
        reg_body = registered.json()
        assert reg_body["user"]["email_verified"] is False
        assert sent_verify_urls
        owner_token = reg_body["access_token"]
        org_id = reg_body["organization_id"]

        unverified_generate = await client.post(
            "/api/v1/studio/generate",
            headers={
                "Authorization": f"Bearer {owner_token}",
                "x-forge-active-org-id": org_id,
            },
            json={"prompt": "A simple launch page", "provider": "openai"},
        )
        assert unverified_generate.status_code == 403
        assert unverified_generate.json()["code"] == "email_verification_required"

        verified = await client.post(
            "/api/v1/auth/email/verify",
            json={"token": _token_from_verify_url(sent_verify_urls[-1])},
        )
        assert verified.status_code == 200

        me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {owner_token}"})
        assert me.status_code == 200
        assert me.json()["user"]["email_verified"] is True

        generated = await client.post(
            "/api/v1/studio/generate",
            headers={
                "Authorization": f"Bearer {owner_token}",
                "x-forge-active-org-id": org_id,
            },
            json={"prompt": "A simple launch page", "provider": "openai"},
        )
        assert generated.status_code == 200
        assert "html.complete" in generated.text

        checkout = await client.post(
            "/api/v1/billing/checkout",
            headers={
                "Authorization": f"Bearer {owner_token}",
                "x-forge-active-org-id": org_id,
            },
            json={"plan": "pro", "billing_interval": "monthly"},
        )
        assert checkout.status_code == 200
        assert checkout.json()["url"].startswith("https://checkout.stripe.test/")

        editor_email = f"journey-editor-{uuid4().hex}@example.com"
        editor_registered = await client.post(
            "/api/v1/auth/register",
            json={
                "email": editor_email,
                "password": password,
                "display_name": "Journey Editor",
                "workspace_name": "Editor Workspace",
            },
        )
        assert editor_registered.status_code == 200
        editor_token = editor_registered.json()["access_token"]
        editor_user_id = editor_registered.json()["user"]["id"]

    async with AsyncSessionLocal() as session:
        editor = await session.get(User, UUID(editor_user_id))
        assert editor is not None
        session.add(Membership(user_id=editor.id, organization_id=org_id, role="editor"))
        await session.commit()

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        editor_checkout = await client.post(
            "/api/v1/billing/checkout",
            headers={
                "Authorization": f"Bearer {editor_token}",
                "x-forge-active-org-id": org_id,
            },
            json={"plan": "pro", "billing_interval": "monthly"},
        )
        assert editor_checkout.status_code == 403


@pytest.mark.asyncio
async def test_resend_verification_is_rate_limited(monkeypatch: pytest.MonkeyPatch) -> None:
    await require_postgres()
    monkeypatch.setattr(settings, "AUTH_TEST_BYPASS", False)
    sent_verify_urls: list[str] = []

    async def fake_send_email_verification(*, to_email: str, display_name: str | None, verify_url: str) -> str:
        del to_email, display_name
        sent_verify_urls.append(verify_url)
        return "email_test_verification"

    monkeypatch.setattr(auth_module.email_service, "send_email_verification", fake_send_email_verification)
    email = f"resend-{uuid4().hex}@example.com"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        registered = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "ResendPass!2026",
                "display_name": "Resend User",
                "workspace_name": "Resend Workspace",
            },
        )
        assert registered.status_code == 200
        token = registered.json()["access_token"]
        too_soon = await client.post(
            "/api/v1/auth/email/verification/resend",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert too_soon.status_code == 429

        verified = await client.post(
            "/api/v1/auth/email/verify",
            json={"token": _token_from_verify_url(sent_verify_urls[-1])},
        )
        assert verified.status_code == 200
        already = await client.post(
            "/api/v1/auth/email/verification/resend",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert already.status_code == 200
        assert already.json()["already_verified"] is True
