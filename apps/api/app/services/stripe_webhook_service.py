"""Stripe webhook side-effects — no commits (caller commits)."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization
from app.db.rls_context import set_active_organization
from app.services.billing.pricing_catalog import normalize_plan_slug, plan_slug_from_stripe_price_id
from app.services.product_analytics import capture

logger = logging.getLogger(__name__)


async def apply_checkout_session_completed(db: AsyncSession, session_obj: dict[str, Any]) -> None:
    org_id_raw = session_obj.get("client_reference_id")
    if not org_id_raw:
        return
    try:
        oid = UUID(str(org_id_raw))
    except ValueError:
        logger.warning("checkout bad org id %s", org_id_raw)
        return
    org = await db.get(Organization, oid)
    if org is None:
        return
    await set_active_organization(db, org.id)
    cust = session_obj.get("customer")
    if cust:
        org.stripe_customer_id = str(cust)
    sub = session_obj.get("subscription")
    if sub:
        org.stripe_subscription_id = str(sub)
    meta = session_obj.get("metadata") or {}
    raw = str(meta.get("forge_plan") or meta.get("forge_plan_slug") or "").strip().lower()
    canon = normalize_plan_slug(raw) if raw else ""
    if canon in ("pro", "max_5x", "max_20x"):
        org.plan = canon
    org.stripe_subscription_status = "active"
    org.payment_failed_at = None
    await capture(str(oid), "checkout_completed", {"plan": org.plan})


async def apply_subscription_updated(db: AsyncSession, obj: dict[str, Any]) -> None:
    cid = str(obj.get("customer") or "")
    status = str(obj.get("status") or "")
    row = (
        await db.execute(select(Organization).where(Organization.stripe_customer_id == cid))
    ).scalar_one_or_none()
    if row is None:
        return
    await set_active_organization(db, row.id)
    row.stripe_subscription_status = status
    meta = obj.get("metadata") or {}
    raw = str(meta.get("forge_plan_slug") or meta.get("forge_plan") or "").strip()
    if raw:
        row.plan = normalize_plan_slug(raw)
    else:
        items = ((obj.get("items") or {}).get("data")) or []
        if items:
            price = (items[0].get("price") or {}) if isinstance(items[0], dict) else {}
            pid = str(price.get("id") or "")
            mapped = plan_slug_from_stripe_price_id(pid)
            if mapped:
                row.plan = mapped


async def apply_subscription_created(db: AsyncSession, obj: dict[str, Any]) -> None:
    """Backstop if checkout raced — same reconciliation as ``customer.subscription.updated``."""
    await apply_subscription_updated(db, obj)


async def apply_subscription_deleted(db: AsyncSession, obj: dict[str, Any]) -> None:
    cid = str(obj.get("customer") or "")
    row = (
        await db.execute(select(Organization).where(Organization.stripe_customer_id == cid))
    ).scalar_one_or_none()
    if row is None:
        return
    await set_active_organization(db, row.id)
    row.plan = "free"
    row.stripe_subscription_status = "canceled"
    row.stripe_subscription_id = None
    row.scheduled_purge_at = datetime.now(UTC) + timedelta(days=30)
    await capture(str(row.id), "subscription_cancelled", {})


async def apply_invoice_payment_failed(db: AsyncSession, obj: dict[str, Any]) -> None:
    cid = str(obj.get("customer") or "")
    row = (
        await db.execute(select(Organization).where(Organization.stripe_customer_id == cid))
    ).scalar_one_or_none()
    if row is None:
        return
    await set_active_organization(db, row.id)
    row.payment_failed_at = datetime.now(UTC)


async def apply_invoice_payment_succeeded(db: AsyncSession, obj: dict[str, Any]) -> None:
    cid = str(obj.get("customer") or "")
    row = (
        await db.execute(select(Organization).where(Organization.stripe_customer_id == cid))
    ).scalar_one_or_none()
    if row is None:
        return
    await set_active_organization(db, row.id)
    row.payment_failed_at = None
    row.extra_usage_spent_period_cents = 0
