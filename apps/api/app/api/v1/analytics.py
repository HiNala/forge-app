from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse

router = APIRouter(tags=["analytics"])


@router.get("/pages/{page_id}/analytics/summary", response_model=StubResponse)
async def page_analytics_summary(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/pages/{page_id}/analytics/funnel", response_model=StubResponse)
async def page_analytics_funnel(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/pages/{page_id}/analytics/events", response_model=StubResponse)
async def page_analytics_events(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/analytics/summary", response_model=StubResponse)
async def org_analytics_summary(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
