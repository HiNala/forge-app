from __future__ import annotations

import logging
from typing import Any, cast

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, StripeEventProcessed
from app.deps import get_db, require_tenant
from app.deps.db import get_db_public
from app.deps.tenant import TenantContext
from app.schemas.billing import (
    BillingPlanOut,
    BillingUsageOut,
    CheckoutBody,
    CheckoutOut,
    PortalOut,
)
from app.services import stripe_webhook_service as sws
from app.services.ai.usage import usage_snapshot
from app.services.product_analytics import capture
from app.services.stripe_webhook import StripeWebhookError, verify_stripe_webhook_payload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


def _stripe_ready() -> None:
    if not (settings.STRIPE_SECRET_KEY or "").strip():
        raise HTTPException(status_code=503, detail="Stripe is not configured")


@router.get("/plan", response_model=BillingPlanOut)
async def billing_plan(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> BillingPlanOut:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    last4 = None
    next_inv = None
    status = org.stripe_subscription_status
    if org.stripe_customer_id and (settings.STRIPE_SECRET_KEY or "").strip():
        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            cust = cast(
                Any,
                stripe.Customer.retrieve(org.stripe_customer_id, expand=["invoice_settings"]),
            )
            pm = cust.get("invoice_settings", {}).get("default_payment_method")
            if isinstance(pm, str):
                pm = stripe.PaymentMethod.retrieve(pm)
            if isinstance(pm, dict) and pm.get("card"):
                last4 = pm["card"].get("last4")
        except Exception as e:
            logger.warning("billing_plan stripe read: %s", e)
    return BillingPlanOut(
        plan=org.plan,
        status=status,
        trial_ends_at=org.trial_ends_at,
        next_invoice_at=next_inv,
        payment_method_last4=last4,
        payment_failed_at=org.payment_failed_at,
    )


@router.post("/checkout", response_model=CheckoutOut)
async def billing_checkout(
    body: CheckoutBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> CheckoutOut:
    _stripe_ready()
    price_id = (
        settings.STRIPE_PRICE_PRO if body.plan == "pro" else settings.STRIPE_PRICE_STARTER
    ).strip()
    if not price_id:
        raise HTTPException(status_code=503, detail="Missing Stripe price id for this plan")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    success = f"{settings.APP_PUBLIC_URL.rstrip('/')}/settings/billing?success=true"
    cancel = f"{settings.APP_PUBLIC_URL.rstrip('/')}/pricing?cancelled=true"
    await capture(str(ctx.organization_id), "checkout_started", {"plan": body.plan})
    session = cast(
        Any,
        stripe.checkout.Session.create(
            mode="subscription",
            client_reference_id=str(ctx.organization_id),
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=success,
            cancel_url=cancel,
            metadata={"forge_plan": body.plan},
        ),
    )
    url = session.get("url")
    if not url:
        raise HTTPException(status_code=500, detail="Stripe did not return a checkout URL")
    return CheckoutOut(url=url)


@router.post("/portal", response_model=PortalOut)
async def billing_portal(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> PortalOut:
    _stripe_ready()
    org = await db.get(Organization, ctx.organization_id)
    if org is None or not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer for this organization")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = cast(
        Any,
        stripe.billing_portal.Session.create(
            customer=org.stripe_customer_id,
            return_url=f"{settings.APP_PUBLIC_URL.rstrip('/')}/settings/billing",
        ),
    )
    url = session.get("url")
    if not url:
        raise HTTPException(status_code=500, detail="Stripe did not return a portal URL")
    return PortalOut(url=url)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db_public),
) -> dict[str, Any]:
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        verify_stripe_webhook_payload(payload=payload, stripe_signature=sig)
    except StripeWebhookError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    secret = (settings.STRIPE_WEBHOOK_SECRET or "").strip()
    if not secret:
        import json

        event = json.loads(payload.decode("utf-8"))
    else:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        event = cast(Any, stripe.Webhook.construct_event)(payload, sig or "", secret)

    eid = str(event.get("id", ""))
    if not eid:
        raise HTTPException(status_code=400, detail="Invalid event")

    dup = (
        await db.execute(
            select(StripeEventProcessed.id).where(
                StripeEventProcessed.stripe_event_id == eid,
            ),
        )
    ).scalar_one_or_none()
    if dup is not None:
        return {"ok": True, "duplicate": True}

    et = str(event.get("type") or "")
    data_object = (event.get("data") or {}).get("object") or {}

    try:
        if et == "checkout.session.completed":
            await sws.apply_checkout_session_completed(db, data_object)
        elif et == "customer.subscription.updated":
            await sws.apply_subscription_updated(db, data_object)
        elif et == "customer.subscription.deleted":
            await sws.apply_subscription_deleted(db, data_object)
        elif et == "invoice.payment_failed":
            await sws.apply_invoice_payment_failed(db, data_object)
        elif et == "invoice.payment_succeeded":
            await sws.apply_invoice_payment_succeeded(db, data_object)
        elif et == "customer.subscription.trial_will_end":
            pass  # email hook — optional Resend
        else:
            pass

        db.add(StripeEventProcessed(stripe_event_id=eid))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        return {"ok": True, "duplicate": True}
    except Exception as e:
        logger.exception("stripe_webhook %s", e)
        await db.rollback()
        raise HTTPException(status_code=500, detail="Webhook handler failed") from e

    return {"ok": True}


class InvoiceRow(BaseModel):
    id: str
    created: int
    amount_due: int
    currency: str
    status: str | None
    invoice_pdf: str | None = None
    hosted_invoice_url: str | None = None


class InvoiceListOut(BaseModel):
    items: list[InvoiceRow]


@router.get("/invoices", response_model=InvoiceListOut)
async def billing_invoices(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> InvoiceListOut:
    """Recent Stripe invoices for this organization (empty if not a Stripe customer)."""
    org = await db.get(Organization, ctx.organization_id)
    if org is None or not org.stripe_customer_id or not (settings.STRIPE_SECRET_KEY or "").strip():
        return InvoiceListOut(items=[])
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        lst = stripe.Invoice.list(customer=org.stripe_customer_id, limit=24)
        items = []
        for inv in lst.data or []:
            inv_d = cast(Any, inv)
            items.append(
                InvoiceRow(
                    id=str(inv_d.get("id") or ""),
                    created=int(inv_d.get("created") or 0),
                    amount_due=int(inv_d.get("amount_due") or 0),
                    currency=str(inv_d.get("currency") or "usd"),
                    status=inv_d.get("status"),
                    invoice_pdf=inv_d.get("invoice_pdf"),
                    hosted_invoice_url=inv_d.get("hosted_invoice_url"),
                )
            )
        return InvoiceListOut(items=items)
    except Exception as e:
        logger.warning("billing_invoices: %s", e)
        return InvoiceListOut(items=[])


@router.get("/usage", response_model=BillingUsageOut)
async def billing_usage(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> BillingUsageOut:
    snap = await usage_snapshot(db, ctx.organization_id)
    return BillingUsageOut(
        pages_generated=int(snap["pages_generated"]),
        pages_quota=int(snap["pages_quota"]),
        submissions_received=int(snap.get("submissions_received", 0)),
        submissions_quota=int(snap.get("submissions_quota", 0)),
        tokens_prompt=int(snap["tokens_prompt"]),
        tokens_completion=int(snap["tokens_completion"]),
        period_start=str(snap["period_start"]),
        period_end=str(snap["period_end"]),
        credits_tier=str(snap.get("credits_tier", "free")),
        credits_session_used=int(snap.get("credits_session_used", 0)),
        credits_session_cap=int(snap.get("credits_session_cap", 0)),
        credits_session_percent=float(snap.get("credits_session_percent", 0.0)),
        credits_week_used=int(snap.get("credits_week_used", 0)),
        credits_week_cap=int(snap.get("credits_week_cap", 0)),
        credits_week_percent=float(snap.get("credits_week_percent", 0.0)),
        credits_session_resets_at=snap.get("credits_session_resets_at"),
        credits_week_resets_at=snap.get("credits_week_resets_at"),
        extra_usage_enabled=bool(snap.get("extra_usage_enabled", False)),
        extra_usage_monthly_cap_cents=snap.get("extra_usage_monthly_cap_cents"),
        extra_usage_spent_period_cents=int(snap.get("extra_usage_spent_period_cents", 0)),
        raw=snap,
    )


class PlanChangeBody(BaseModel):
    plan: str


@router.post("/plan/upgrade")
async def billing_plan_upgrade_stub(
    body: PlanChangeBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    """BI-04 — upgrade stub; use checkout or Stripe update when wired."""
    del body, db, ctx
    raise HTTPException(
        status_code=501,
        detail="Use POST /billing/checkout or wire subscription update",
    )


@router.post("/plan/downgrade")
async def billing_plan_downgrade_stub(
    body: PlanChangeBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, Any]:
    del body, db, ctx
    raise HTTPException(status_code=501, detail="scheduled_plan_change not wired")


@router.post("/plan/downgrade/cancel")
async def billing_plan_downgrade_cancel_stub(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, bool]:
    del db, ctx
    raise HTTPException(status_code=501, detail="No pending downgrade")
