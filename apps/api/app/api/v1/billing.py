from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_tenant
from app.deps.tenant import TenantContext
from app.schemas.common import StubResponse
from app.services.stripe_webhook import StripeWebhookError, verify_stripe_webhook_payload

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plan", response_model=StubResponse)
async def billing_plan(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.post("/checkout", response_model=StubResponse)
async def billing_checkout(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.post("/portal", response_model=StubResponse)
async def billing_portal(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()


@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict[str, bool]:
    """Stripe push endpoint — raw body required for signature verification."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        verify_stripe_webhook_payload(payload=payload, stripe_signature=sig)
    except StripeWebhookError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"ok": True}


@router.get("/usage", response_model=StubResponse)
async def billing_usage(
    db: AsyncSession = Depends(get_db),
    _ctx: TenantContext = Depends(require_tenant),
) -> StubResponse:
    return StubResponse()
