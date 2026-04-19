from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.deps.forge_operator import require_forge_operator
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse
from app.services.ai.metrics import snapshot_last_minute

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/organizations", response_model=StubResponse)
async def admin_orgs(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> StubResponse:
    return StubResponse()


@router.get("/usage", response_model=StubResponse)
async def admin_usage(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> StubResponse:
    return StubResponse()


@router.get("/llm-stats")
async def admin_llm_stats(
    _db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> dict:
    """In-memory LLM metrics (tokens/min, cache hits) — Mission 03."""
    del _db, _ctx
    return snapshot_last_minute()


@router.post("/templates", response_model=StubResponse)
async def admin_create_template(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_forge_operator),
) -> StubResponse:
    return StubResponse()
