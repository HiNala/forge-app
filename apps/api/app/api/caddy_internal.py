"""Internal routes for Caddy on-demand TLS (Mission 08)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.deps.db import get_db_public

logger = logging.getLogger(__name__)

router = APIRouter(tags=["internal"])


@router.get("/internal/caddy/validate")
async def caddy_validate_domain(
    request: Request,
    domain: str = Query(..., description="Hostname from Caddy on_demand_tls ask"),
    db: AsyncSession = Depends(get_db_public),
) -> Response:
    """
    Return **200** if ``domain`` is a verified custom hostname; **404** otherwise.

    Caddy should call this over private networking. If ``CADDY_INTERNAL_TOKEN`` is set,
    require header ``X-Forge-Caddy-Token`` to match.
    """
    tok = (settings.CADDY_INTERNAL_TOKEN or "").strip()
    if tok and request.headers.get("x-forge-caddy-token") != tok:
        raise HTTPException(status_code=401, detail="Unauthorized")

    raw = (domain or "").strip().lower()
    host = raw.split(":")[0].strip(".")
    if not host or ".." in host:
        raise HTTPException(status_code=404, detail="Unknown host")

    try:
        ok = (
            await db.execute(
                text("SELECT public.forge_caddy_domain_allowed(:h)"),
                {"h": host},
            )
        ).scalar()
    except Exception as e:
        logger.exception("caddy_validate_domain: %s", e)
        raise HTTPException(status_code=500, detail="Validation failed") from e

    if bool(ok):
        return Response(status_code=200)
    raise HTTPException(status_code=404, detail="Unknown host")
