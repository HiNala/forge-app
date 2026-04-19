"""Verify Clerk-issued JWTs using JWKS (RS256)."""

from __future__ import annotations

import jwt
from jwt import PyJWKClient

from app.config import settings

_jwk_client: PyJWKClient | None = None


def _client() -> PyJWKClient:
    global _jwk_client
    if not settings.CLERK_JWKS_URL:
        msg = "CLERK_JWKS_URL is not set"
        raise RuntimeError(msg)
    if _jwk_client is None:
        _jwk_client = PyJWKClient(
            settings.CLERK_JWKS_URL,
            cache_keys=True,
            max_cached_keys=16,
        )
    return _jwk_client


def verify_clerk_jwt(token: str) -> dict:
    """Validate Bearer token; returns JWT payload (includes ``sub`` = Clerk user id)."""
    client = _client()
    signing_key = client.get_signing_key_from_jwt(token)
    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "options": {"verify_aud": bool(settings.CLERK_AUDIENCE)},
    }
    if settings.CLERK_JWT_ISSUER:
        decode_kwargs["issuer"] = settings.CLERK_JWT_ISSUER
    if settings.CLERK_AUDIENCE:
        decode_kwargs["audience"] = settings.CLERK_AUDIENCE
    return jwt.decode(
        token,
        signing_key.key,
        **decode_kwargs,
    )
