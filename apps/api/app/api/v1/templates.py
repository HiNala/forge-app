from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, get_db_public, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=StubResponse)
async def list_templates(_db: AsyncSession = Depends(get_db_public)) -> StubResponse:
    return StubResponse()


@router.get("/{template_id}", response_model=StubResponse)
async def get_template(
    template_id: UUID, _db: AsyncSession = Depends(get_db_public)
) -> StubResponse:
    return StubResponse()


@router.post("/{template_id}/use", response_model=StubResponse)
async def use_template(
    template_id: UUID,
    _db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
