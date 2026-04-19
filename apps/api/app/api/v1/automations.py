from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse

router = APIRouter(tags=["automations"])


@router.get("/pages/{page_id}/automations", response_model=StubResponse)
async def get_automations(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.put("/pages/{page_id}/automations", response_model=StubResponse)
async def put_automations(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/pages/{page_id}/automations/runs", response_model=StubResponse)
async def list_automation_runs(
    page_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
