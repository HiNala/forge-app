"""GL-03 — gated E2E seed endpoints (disabled unless :attr:`FORGE_E2E_TOKEN` is set)."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.secret_compare import constant_time_str_equal
from app.deps.db import get_db_no_auth
from app.services.bootstrap import ensure_user_org_signup

router = APIRouter(prefix="/__e2e__", tags=["e2e-bootstrap"])


def _require_e2e_token(x_forge_e2e_token: str | None = Header(default=None)) -> None:
    expected = (settings.FORGE_E2E_TOKEN or "").strip()
    if not expected:
        raise HTTPException(status_code=404, detail="Not found")
    # Constant-time comparison (handles unequal lengths; avoids compare_digest ValueError).
    if not x_forge_e2e_token or not constant_time_str_equal(x_forge_e2e_token, expected):
        raise HTTPException(status_code=404, detail="Not found")


@router.post("/seed-org")
async def seed_org(
    _auth: None = Depends(_require_e2e_token),
    db: AsyncSession = Depends(get_db_no_auth),
) -> dict[str, Any]:
    """Create a fresh user + workspace (owner) for isolated Playwright runs."""
    uid = uuid4()
    auth_id = f"e2e_{uid.hex}"
    user, org = await ensure_user_org_signup(
        db,
        auth_provider_id=auth_id,
        email=f"{uid.hex[:12]}@e2e.forge.local",
        display_name="E2E User",
        avatar_url=None,
        workspace_name=f"E2E {uid.hex[:8]}",
    )
    await db.commit()
    return {
        "user_id": str(user.id),
        "organization_id": str(org.id),
        "slug": org.slug,
    }
