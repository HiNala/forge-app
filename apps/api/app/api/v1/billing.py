from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime
from typing import Any, cast
from uuid import UUID

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, PlanRecommendation, ScheduledPlanChange, StripeEventProcessed, User
from app.deps import get_db, require_role, require_tenant, require_user
from app.deps.db import get_db_public
from app.deps.tenant import TenantContext
from app.schemas.billing import (
    BillingPlanOut,
    BillingUsageOut,
    CheckoutBody,
    CheckoutOut,
    DowngradeBody,
    DowngradeCancelOut,
    DowngradeScheduleOut,
    ExtraUsageCapBody,
    ExtraUsageCapOut,
    PlanRecommendationOut,
    PlanUpgradeBody,
    PlanUpgradeOut,
    PortalOut,
    RecommendationDismissBody,
    RecommendationDismissOut,
    SubscriptionStateOut,
)
from app.services import stripe_webhook_service as sws
from app.services.ai.usage import usage_snapshot
from app.services.audit_log import write_audit
from app.services.billing.pricing_catalog import (
    SELF_SERVE_PAYING,
    BillingInterval,
    is_downgrade,
    is_upgrade,
    normalize_plan_slug,
    stripe_price_id_for_plan,
)
from app.services.billing.stripe_subscription_ops import (
    stripe_subscription_cancel_at_period_end,
    stripe_subscription_fetch,
    stripe_subscription_modify_price,
    subscription_current_period_end,
)
from app.services.email import email_service
from app.services.product_analytics import capture
from app.services.stripe_webhook import StripeWebhookError, verify_stripe_webhook_payload

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])


def _stripe_ready() -> None:
    if not (settings.STRIPE_SECRET_KEY or "").strip():
        raise HTTPException(status_code=503, detail="Stripe is not configured")


def _stripe_return_url(path: str = "/settings/billing") -> str:
    return f"{settings.APP_PUBLIC_URL.rstrip('/')}{path}"


def _org_currency(org: Organization) -> str:
    cfg = org.org_settings if isinstance(org.org_settings, dict) else {}
    raw = cfg.get("currency") or cfg.get("billing_currency") or "usd"
    return str(raw).lower()[:12]


async def _create_checkout_url(
    *,
    organization_id: Any,
    plan_slug: str,
    interval: BillingInterval = "monthly",
) -> str:
    _stripe_ready()
    raw = plan_slug.strip().lower()
    # Legacy `starter` Checkout CTA → treat as Pro purchase path
    if raw == "starter":
        raw = "pro"
        logger.info("checkout: mapping legacy starter → pro for org %s", organization_id)
    slug = normalize_plan_slug(raw)
    if slug not in SELF_SERVE_PAYING:
        raise HTTPException(status_code=422, detail="Checkout requires a paid tier (pro, max_5x, max_20x)")
    price_id = stripe_price_id_for_plan(slug, interval)
    if not price_id:
        raise HTTPException(status_code=503, detail=f"Missing Stripe price id for plan={slug} interval={interval}")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    await capture(str(organization_id), "checkout_started", {"plan": slug, "interval": interval})
    idem = f"forge-checkout-{organization_id}-{slug}-{interval}"
    create_kwargs: dict[str, Any] = {
        "mode": "subscription",
        "client_reference_id": str(organization_id),
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": f"{_stripe_return_url()}?success=true",
        "cancel_url": f"{settings.APP_PUBLIC_URL.rstrip('/')}/pricing?cancelled=true",
        "metadata": {"forge_plan": slug, "forge_plan_slug": slug, "organization_id": str(organization_id)},
        "subscription_data": {
            "metadata": {
                "forge_plan_slug": slug,
                "organization_id": str(organization_id),
            }
        },
        "idempotency_key": idem[:255],
    }
    if settings.STRIPE_CHECKOUT_AUTOMATIC_TAX:
        create_kwargs["automatic_tax"] = {"enabled": True}
    session = cast(Any, stripe.checkout.Session.create(**create_kwargs))
    url = session.get("url")
    if not url:
        raise HTTPException(status_code=500, detail="Stripe did not return a checkout URL")
    return str(url)


async def _create_billing_portal_url(org: Organization) -> str:
    _stripe_ready()
    if not org.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No Stripe customer for this organization")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    session = cast(
        Any,
        stripe.billing_portal.Session.create(
            customer=org.stripe_customer_id,
            return_url=_stripe_return_url(),
        ),
    )
    url = session.get("url")
    if not url:
        raise HTTPException(status_code=500, detail="Stripe did not return a portal URL")
    return str(url)


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
        currency=_org_currency(org),
        status=status,
        trial_ends_at=org.trial_ends_at,
        next_invoice_at=next_inv,
        payment_method_last4=last4,
        payment_failed_at=org.payment_failed_at,
    )


@router.get("/plan-recommendation", response_model=PlanRecommendationOut)
async def billing_plan_recommendation(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> PlanRecommendationOut:
    """Latest persisted recommendation when the nightly worker inserts a row."""
    row = (
        await db.execute(
            select(PlanRecommendation)
            .where(
                PlanRecommendation.organization_id == ctx.organization_id,
                PlanRecommendation.dismissed_at.is_(None),
            )
            .order_by(PlanRecommendation.generated_at.desc())
            .limit(1),
        )
    ).scalar_one_or_none()
    if row is None:
        return PlanRecommendationOut(recommendation=None)
    return PlanRecommendationOut(
        recommendation={
            "id": str(row.id),
            "current_plan": row.current_plan,
            "recommended_plan": row.recommended_plan,
            "savings_cents": row.savings_cents,
            "reasoning": row.reasoning or "",
            "currency": row.currency,
            "generated_at": row.generated_at.isoformat(),
        },
    )


@router.post("/plan-recommendation/dismiss", response_model=RecommendationDismissOut)
async def billing_plan_recommendation_dismiss(
    body: RecommendationDismissBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
    user: User = Depends(require_user),
) -> RecommendationDismissOut:
    row = await db.get(PlanRecommendation, body.recommendation_id)
    if row is None or row.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    row.dismissed_at = datetime.now(UTC)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="plan_recommendation_dismissed",
        resource_type="plan_recommendation",
        resource_id=row.id,
        changes={"recommendation_id": str(row.id)},
    )
    await db.commit()
    return RecommendationDismissOut(ok=True)


@router.post("/extra-usage/cap", response_model=ExtraUsageCapOut)
async def billing_set_extra_usage_cap(
    body: ExtraUsageCapBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    user: User = Depends(require_user),
) -> ExtraUsageCapOut:
    """Set generation credit overage cap (Stripe meter period alignment via invoice webhook)."""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.extra_usage_monthly_cap_cents = body.max_extra_usage_cents_per_month
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="extra_usage_cap_updated",
        resource_type="organization",
        resource_id=org.id,
        changes={"cap_cents": body.max_extra_usage_cents_per_month},
    )
    await db.commit()
    await db.refresh(org)
    return ExtraUsageCapOut(
        ok=True,
        extra_usage_monthly_cap_cents=org.extra_usage_monthly_cap_cents,
        extra_usage_enabled=bool(org.extra_usage_enabled),
    )


@router.post("/checkout", response_model=CheckoutOut)
async def billing_checkout(
    body: CheckoutBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> CheckoutOut:
    del db
    return CheckoutOut(
        url=await _create_checkout_url(
            organization_id=ctx.organization_id,
            plan_slug=body.plan,
            interval=body.billing_interval,
        )
    )


@router.post("/portal", response_model=PortalOut)
async def billing_portal(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> PortalOut:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return PortalOut(url=await _create_billing_portal_url(org))


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
        elif et == "customer.subscription.created":
            await sws.apply_subscription_created(db, data_object)
        elif et == "customer.subscription.updated":
            await sws.apply_subscription_updated(db, data_object)
        elif et == "customer.subscription.deleted":
            await sws.apply_subscription_deleted(db, data_object)
        elif et == "invoice.payment_failed":
            await sws.apply_invoice_payment_failed(db, data_object)
        elif et in ("invoice.payment_succeeded", "invoice.paid"):
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


def _is_stripe_error(exc: BaseException) -> bool:
    """Stripe SDK raises errors from `stripe.error` / `stripe` modules depending on version."""
    mod = getattr(type(exc), "__module__", "") or ""
    name = getattr(type(exc), "__name__", "") or ""
    return mod.startswith("stripe") or ("stripe" in mod.lower()) or name.endswith("StripeError")


async def _delete_pending_scheduled_plan_changes(db: AsyncSession, org_id: UUID) -> None:
    await db.execute(
        delete(ScheduledPlanChange).where(
            ScheduledPlanChange.organization_id == org_id,
            ScheduledPlanChange.status == "pending",
        ),
    )


@router.get("/subscription", response_model=SubscriptionStateOut)
async def billing_subscription_state(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> SubscriptionStateOut:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not org.stripe_subscription_id or not (settings.STRIPE_SECRET_KEY or "").strip():
        return SubscriptionStateOut(cancel_at_period_end=None, current_period_end=None)
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        sub = stripe_subscription_fetch(org.stripe_subscription_id)
        cpe = subscription_current_period_end(sub)
        cape = sub.get("cancel_at_period_end")
        cape_bool: bool | None = cape if isinstance(cape, bool) else None
        return SubscriptionStateOut(cancel_at_period_end=cape_bool, current_period_end=cpe)
    except Exception as e:
        logger.warning("billing_subscription_state: %s", e)
        return SubscriptionStateOut(cancel_at_period_end=None, current_period_end=None)


@router.post("/plan/upgrade", response_model=PlanUpgradeOut)
async def billing_plan_upgrade(
    body: PlanUpgradeBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    user: User = Depends(require_user),
) -> PlanUpgradeOut:
    """Stripe Checkout for first purchase from Free / trial, or in-place prorated upgrade."""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    target_slug = normalize_plan_slug(body.plan_slug)
    if target_slug not in SELF_SERVE_PAYING:
        raise HTTPException(
            status_code=422,
            detail="Upgrade target must be a paid tier: pro, max_5x, or max_20x",
        )
    current = normalize_plan_slug(org.plan)
    if not is_upgrade(current, target_slug):
        raise HTTPException(
            status_code=400,
            detail="Requested plan is not an upgrade from your current plan.",
        )

    old_plan = org.plan

    if not org.stripe_subscription_id:
        url = await _create_checkout_url(
            organization_id=ctx.organization_id,
            plan_slug=target_slug,
            interval=body.billing_interval,
        )
        return PlanUpgradeOut(
            mode="checkout",
            redirect_url=url,
            updated=False,
            current_plan=None,
            plan=None,
            message=None,
        )

    _stripe_ready()
    price_id = stripe_price_id_for_plan(target_slug, body.billing_interval)
    if not price_id.strip():
        raise HTTPException(
            status_code=503,
            detail=f"Missing Stripe price id for '{target_slug}' ({body.billing_interval})",
        )

    idem_key = f"forge-plan-upgrade-{org.id}-{target_slug}-{body.billing_interval}-{uuid.uuid4()}"
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        stripe_subscription_modify_price(
            subscription_id=org.stripe_subscription_id,
            new_price_id=price_id,
            idempotency_key=idem_key,
        )
    except BaseException as e:
        if _is_stripe_error(e):
            logger.warning("plan upgrade stripe failure: %s", e)
            raise HTTPException(
                status_code=502,
                detail="Payment provider unavailable; retry in a moment.",
            ) from e
        raise

    await _delete_pending_scheduled_plan_changes(db, org.id)
    org.plan = target_slug
    effective = datetime.now(UTC)

    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="plan_upgraded",
        resource_type="organization",
        resource_id=org.id,
        changes={
            "from": old_plan,
            "to": target_slug,
            "prorated": True,
        },
    )
    await capture(
        str(ctx.organization_id),
        "plan_upgrade_success",
        {"from": old_plan, "to": target_slug, "mode": "subscription_updated"},
    )
    await db.commit()
    await db.refresh(org)
    return PlanUpgradeOut(
        mode="subscription_updated",
        redirect_url=None,
        updated=True,
        current_plan=org.plan,
        plan=org.plan,
        effective_at=effective,
        message="Plan updated immediately. Your next invoice may include a proration.",
    )


@router.post("/plan/downgrade", response_model=DowngradeScheduleOut)
async def billing_plan_downgrade(
    body: DowngradeBody,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    user: User = Depends(require_user),
) -> DowngradeScheduleOut:
    """Schedule downgrade at Stripe period end — no Stripe API call yet (cron applies)."""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")

    current = normalize_plan_slug(org.plan)
    target_slug = normalize_plan_slug(body.target_plan_slug)
    if target_slug == current:
        raise HTTPException(status_code=400, detail="Already on this plan.")
    if not is_downgrade(current, target_slug):
        raise HTTPException(status_code=400, detail="Target is not a downgrade from your current plan.")

    if not org.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No billing subscription — use Checkout to subscribe first.")

    _stripe_ready()
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        sub = stripe_subscription_fetch(org.stripe_subscription_id)
    except BaseException as e:
        if _is_stripe_error(e):
            logger.warning("plan downgrade stripe fetch failure: %s", e)
            raise HTTPException(
                status_code=502,
                detail="Payment provider unavailable; retry in a moment.",
            ) from e
        raise
    effective_at_dt = subscription_current_period_end(sub)
    if effective_at_dt is None:
        raise HTTPException(status_code=502, detail="Stripe subscription is missing a period end timestamp.")

    pending = (
        await db.execute(
            select(ScheduledPlanChange).where(
                ScheduledPlanChange.organization_id == ctx.organization_id,
                ScheduledPlanChange.status == "pending",
            ),
        )
    ).scalar_one_or_none()

    if pending is not None:
        pending.target_plan = target_slug
        pending.effective_at = effective_at_dt
        pending.created_by_user_id = user.id
    else:
        db.add(
            ScheduledPlanChange(
                organization_id=ctx.organization_id,
                target_plan=target_slug,
                effective_at=effective_at_dt,
                status="pending",
                created_by_user_id=user.id,
            ),
        )

    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="plan_downgrade_scheduled",
        resource_type="organization",
        resource_id=org.id,
        changes={
            "from_plan": current,
            "to": target_slug,
            "effective_at": effective_at_dt.isoformat(),
        },
    )
    await capture(
        str(ctx.organization_id),
        "plan_downgrade_scheduled",
        {"from": current, "to": target_slug, "effective_at": effective_at_dt.isoformat()},
    )
    await db.commit()

    body_txt = (
        f"Your GlideDesign plan for “{org.name}” will change from {current} to {target_slug} on "
        f"{effective_at_dt.isoformat()}. You can cancel this scheduled change anytime in Settings → Billing."
    )
    try:
        await email_service.send_confirmation(
            to_email=user.email,
            subject_line=f"Plan change scheduled — {org.name}",
            body_plain=body_txt,
            primary_color="#2563eb",
            logo_url=None,
        )
    except Exception as e:
        logger.warning("plan downgrade confirmation email skipped: %s", e)

    return DowngradeScheduleOut(
        scheduled=True,
        target_plan=target_slug,
        effective_at=effective_at_dt,
    )


@router.post("/plan/downgrade/cancel", response_model=DowngradeCancelOut)
async def billing_plan_downgrade_cancel(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    user: User = Depends(require_user),
) -> DowngradeCancelOut:
    """Cancel pending scheduled downgrade (GlideDesign-side row)."""
    row = (
        await db.execute(
            select(ScheduledPlanChange).where(
                ScheduledPlanChange.organization_id == ctx.organization_id,
                ScheduledPlanChange.status == "pending",
            ),
        )
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="No pending scheduled plan change.")
    row.status = "cancelled"
    row.cancelled_at = datetime.now(UTC)
    row.cancelled_by_user_id = user.id
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="plan_downgrade_cancelled",
        resource_type="scheduled_plan_change",
        resource_id=row.id,
        changes={"target_plan": row.target_plan},
    )
    await db.commit()
    return DowngradeCancelOut(cancelled=True)


@router.post("/cancel", response_model=SubscriptionStateOut)
async def billing_cancel_at_period_end(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    user: User = Depends(require_user),
) -> SubscriptionStateOut:
    """Cancel Stripe subscription at period end (retain access until then)."""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not org.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription.")

    idem_key = f"forge-sub-cancel-end-{org.id}-{uuid.uuid4()}"
    _stripe_ready()
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        merged = stripe_subscription_cancel_at_period_end(
            subscription_id=org.stripe_subscription_id,
            cancel=True,
            idempotency_key=idem_key,
        )
    except BaseException as e:
        if _is_stripe_error(e):
            logger.warning("stripe cancel_at_period_end: %s", e)
            raise HTTPException(status_code=502, detail="Payment provider unavailable; retry shortly.") from e
        raise

    cpe = subscription_current_period_end(merged)

    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="subscription_cancel_at_period_end",
        resource_type="organization",
        resource_id=org.id,
        changes={"cancel_at_period_end": True},
    )
    await capture(str(ctx.organization_id), "billing_cancel_scheduled", {})
    await db.commit()

    ce = merged.get("cancel_at_period_end")
    cape = ce if isinstance(ce, bool) else bool(ce) if ce is not None else True
    return SubscriptionStateOut(cancel_at_period_end=cape, current_period_end=cpe)


@router.post("/reactivate", response_model=SubscriptionStateOut)
async def billing_reactivate(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    user: User = Depends(require_user),
) -> SubscriptionStateOut:
    """Undo cancel-at-period-end before the period ends."""
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not org.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription.")

    idem_key = f"forge-sub-reactivate-{org.id}-{uuid.uuid4()}"
    _stripe_ready()
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        merged = stripe_subscription_cancel_at_period_end(
            subscription_id=org.stripe_subscription_id,
            cancel=False,
            idempotency_key=idem_key,
        )
    except BaseException as e:
        if _is_stripe_error(e):
            logger.warning("stripe reactivate: %s", e)
            raise HTTPException(status_code=502, detail="Payment provider unavailable; retry shortly.") from e
        raise

    cpe = subscription_current_period_end(merged)
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=user.id,
        action="subscription_reactivated",
        resource_type="organization",
        resource_id=org.id,
        changes={"cancel_at_period_end": False},
    )
    await capture(str(ctx.organization_id), "billing_reactivated", {})
    await db.commit()

    ce = merged.get("cancel_at_period_end")
    cape = ce if isinstance(ce, bool) else bool(ce) if ce is not None else False
    return SubscriptionStateOut(cancel_at_period_end=cape, current_period_end=cpe)
