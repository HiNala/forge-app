"""
JWT verification for Clerk (ADR-002).

The browser sends ``Authorization: Bearer <JWT>`` (from Clerk ``getToken()``).
Verification and :class:`~app.db.models.user.User` loading run in
:class:`fastapi.Depends` via :func:`app.deps.auth.require_user`; this module
re-exports the public entry points for Mission 02 / ADR-002 discoverability.
"""

from app.deps.auth import require_user
from app.security.clerk_jwt import verify_clerk_jwt

__all__ = ["require_user", "verify_clerk_jwt"]
