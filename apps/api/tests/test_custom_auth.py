from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.db.models import AuthSession, Membership, User
from app.db.session import AsyncSessionLocal
from app.main import app
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_register_login_refresh_and_me(monkeypatch: pytest.MonkeyPatch) -> None:
    await require_postgres()
    monkeypatch.setattr(settings, "AUTH_TEST_BYPASS", False)
    email = f"custom-auth-{uuid4().hex}@example.com"
    password = "CustomAuthPass!2026"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        registered = await client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": password,
                "display_name": "Custom Auth",
                "workspace_name": "Custom Auth Workspace",
            },
        )
        assert registered.status_code == 200
        reg_body = registered.json()
        assert reg_body["access_token"]
        assert reg_body["refresh_token"]
        assert reg_body["user"]["email"] == email

        me = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {reg_body['access_token']}"},
        )
        assert me.status_code == 200
        assert me.json()["memberships"][0]["role"] == "owner"

        login = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200
        login_body = login.json()

        refreshed = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": login_body["refresh_token"]},
        )
        assert refreshed.status_code == 200
        assert refreshed.json()["access_token"] != login_body["access_token"]

    async with AsyncSessionLocal() as session:
        user = (await session.execute(User.__table__.select().where(User.email == email))).first()
        assert user is not None
        memberships = (await session.execute(Membership.__table__.select())).all()
        auth_sessions = (await session.execute(AuthSession.__table__.select())).all()
        assert memberships
        assert auth_sessions
