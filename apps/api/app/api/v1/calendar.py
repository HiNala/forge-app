from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_tenant
from app.deps.db import get_db_no_auth
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.post("/connect/google", response_model=StubResponse)
async def connect_google(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/callback/google", response_model=StubResponse)
async def callback_google(db: AsyncSession = Depends(get_db_no_auth)) -> StubResponse:
    """OAuth redirect target (no org header — state will carry tenant in a later mission)."""
    return StubResponse()


@router.delete("/connections/{connection_id}", response_model=StubResponse)
async def delete_connection(
    connection_id: UUID,
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.get("/connections", response_model=StubResponse)
async def list_connections(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
