"""Public (unauthenticated) routes used by generated HTML pages."""

from fastapi import APIRouter

from app.schemas.common import StubResponse

router = APIRouter(prefix="/p", tags=["public"])


@router.post("/{slug}/submit", response_model=StubResponse)
async def public_submit(slug: str) -> StubResponse:
    del slug
    return StubResponse()


@router.post("/{slug}/upload", response_model=StubResponse)
async def public_upload(slug: str) -> StubResponse:
    del slug
    return StubResponse()


@router.post("/{slug}/track", response_model=StubResponse)
async def public_track(slug: str) -> StubResponse:
    del slug
    return StubResponse()
