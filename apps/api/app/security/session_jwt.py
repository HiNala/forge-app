"""Issue and verify GlideDesign access tokens."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import jwt

from app.config import settings

ALGORITHM = "HS256"


def create_access_token(*, user_id: UUID, is_admin: bool = False) -> tuple[str, str, datetime]:
    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=settings.AUTH_ACCESS_TOKEN_TTL_SECONDS)
    jti = str(uuid4())
    payload = {
        "iss": settings.AUTH_JWT_ISSUER,
        "aud": settings.AUTH_JWT_AUDIENCE,
        "sub": str(user_id),
        "jti": jti,
        "typ": "access",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
        "admin": bool(is_admin),
    }
    return jwt.encode(payload, settings.auth_jwt_secret, algorithm=ALGORITHM), jti, expires_at


def verify_access_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.auth_jwt_secret,
        algorithms=[ALGORITHM],
        issuer=settings.AUTH_JWT_ISSUER,
        audience=settings.AUTH_JWT_AUDIENCE,
    )
    if payload.get("typ") != "access":
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload
