"""HTTP bridge for Model Context Protocol–style access (P-08)."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Page, User
from app.deps import get_db, require_tenant
from app.deps.api_scopes import require_api_scopes
from app.deps.auth import require_user
from app.deps.tenant import TenantContext

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcp/v1", tags=["mcp"])


class McpCallIn(BaseModel):
    tool: str = Field(..., min_length=3, max_length=64)
    arguments: dict[str, Any] = Field(default_factory=dict)


@router.get("/")
async def mcp_info() -> dict[str, Any]:
    return {
        "name": "forge",
        "protocol": "forge-mcp-http",
        "version": 1,
        "docs": "docs/integrations/MCP_USAGE.md",
        "tools": _TOOL_MANIFEST,
    }


_TOOL_MANIFEST: list[dict[str, Any]] = [
    {
        "name": "forge.list_pages",
        "description": "List pages in the active organization.",
        "input_schema": {"type": "object", "properties": {"limit": {"type": "integer", "default": 20}}},
    },
    {
        "name": "forge.get_analytics",
        "description": "Stub — wire to analytics in a follow-up.",
        "input_schema": {"type": "object", "properties": {"page_id": {"type": "string"}}},
    },
]


@router.post("/call")
async def mcp_call(
    body: McpCallIn,
    _scopes: None = Depends(require_api_scopes("read:pages")),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    _user: User = Depends(require_user),
) -> dict[str, Any]:
    """One-shot tool call (simplified MCP over HTTP; clients poll or use this synchronously)."""
    t = body.tool
    args = body.arguments
    if t == "forge.list_pages":
        limit = min(100, max(1, int(args.get("limit", 20))))
        q = await db.execute(
            select(Page)
            .where(Page.organization_id == ctx.organization_id)
            .order_by(Page.updated_at.desc())
            .limit(limit)
        )
        rows = q.scalars().all()
        return {
            "ok": True,
            "tool": t,
            "result": {
                "pages": [
                    {
                        "id": str(p.id),
                        "title": p.title,
                        "slug": p.slug,
                        "status": p.status,
                        "page_type": p.page_type,
                    }
                    for p in rows
                ]
            },
        }
    if t == "forge.get_analytics":
        return {
            "ok": True,
            "tool": t,
            "result": {
                "message": "Not implemented — use GET /v1 analytics routes from the app when wired.",
                "page_id": args.get("page_id"),
            },
        }
    raise HTTPException(status_code=400, detail=f"Unknown tool: {t}")
