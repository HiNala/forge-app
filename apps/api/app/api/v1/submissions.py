from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("/{submission_id}", response_model=StubResponse)
async def get_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.patch("/{submission_id}", response_model=StubResponse)
async def patch_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.post("/{submission_id}/reply", response_model=StubResponse)
async def reply_submission(
    submission_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/{submission_id}/files/{file_id}", response_model=StubResponse)
async def presign_submission_file(
    submission_id: UUID,
    file_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
