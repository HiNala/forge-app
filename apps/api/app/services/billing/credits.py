"""generation credits — charges, balance checks, ledger (P-04)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CreditLedger, Organization
from app.services.billing.credit_windows import SESSION, WEEK, apply_rolling_resets_in_memory
from app.services.billing.plans import plan_for_credit_tier
from app.services.billing_plans import trial_is_active
from app.services.orchestration.models import PageIntent

# Action → base credits (see docs/billing/PRICING_MODEL.md)
ACTION_CREDITS: dict[str, int] = {
    "page_generate": 5,
    "section_refine": 3,
    "region_edit": 1,
    "section_edit": 2,
    "deck_10_slides": 25,
    "website_5_pages": 30,
    "mobile_5_screens": 25,
    "image": 2,
    "brand_extract": 1,
    "export_pptx": 0,
}


def _tier_budgets(tier: str) -> tuple[int, int]:
    plan = plan_for_credit_tier(tier)
    return plan.session_credits_cap, plan.week_credits_cap


OVERAGE_RATES_CENTS_PER_CREDIT: dict[str, int] = {
    "pro": 10,
    "max_5x": 8,
    "max_20x": 5,
}


def credit_tier_for_plan(plan: str | None, *, trial_ends_at: datetime | None) -> str:
    """Map DB plan slug to credit tier (free / pro / max_5x / max_20x)."""
    p = (plan or "trial").lower()
    if p in ("max_20x", "enterprise"):
        return "max_20x"
    if p == "max_5x":
        return "max_5x"
    if p == "pro":
        return "pro"
    if trial_is_active(trial_ends_at=trial_ends_at):
        return "pro"
    if p in ("starter", "free", "trial"):
        return "free"
    return "free"


def studio_credit_charge_spec(
    intent: PageIntent, *, refining_existing_page: bool
) -> tuple[str, dict[str, Any] | None]:
    """Map Studio pipeline intent to ledger action + optional compute_charge context."""
    if refining_existing_page:
        return "section_refine", None
    if intent.page_type == "pitch_deck":
        return "deck_10_slides", None
    return "page_generate", None


def compute_studio_pipeline_credits(intent: PageIntent, *, refining_existing_page: bool) -> int:
    action, ctx = studio_credit_charge_spec(intent, refining_existing_page=refining_existing_page)
    return compute_charge(action, ctx)


def compute_charge(action: str, context: dict[str, Any] | None = None) -> int:
    """
    Return credits for an action. Context may scale counts, e.g.
    {"pages": 5} for multi-page website → 6 credits per page default 30 for 5 pages.
    """
    ctx = context or {}
    base = ACTION_CREDITS.get(action, 5)
    if action == "website_5_pages":
        n = int(ctx.get("pages", 5))
        return min(200, 6 * max(1, n))  # ~6 per page vs 5-page baseline
    if action == "mobile_5_screens":
        n = int(ctx.get("screens", 5))
        return min(200, 5 * max(1, n))
    if action == "image":
        return 2 * max(1, int(ctx.get("count", 1)))
    return base


@dataclass
class BalanceCheck:
    can_proceed: bool
    session_remaining: int
    week_remaining: int
    session_cap: int
    week_cap: int
    tier: str
    would_use_extra_usage: bool
    projected_overage_cents: int
    deny_metric: str | None = None
    denial_extra: dict[str, Any] | None = None


def forge_credits_402_payload(bc: BalanceCheck) -> dict[str, Any]:
    """Unified 402 quota body (AL-02). Older clients keyed off ``code`` + ``metric``."""
    if bc.can_proceed:
        raise ValueError("forge_credits_402_payload used when can_proceed is True")
    metric = bc.deny_metric or "weekly_credits"
    out: dict[str, Any] = {
        "code": "quota_exceeded",
        "metric": metric,
        "tier": bc.tier,
        "upgrade_url": "/settings/billing",
        "increase_cap_url": "/settings/usage",
        "session_remaining": bc.session_remaining,
        "week_remaining": bc.week_remaining,
        "session_cap": bc.session_cap,
        "week_cap": bc.week_cap,
    }
    s_used = bc.session_cap - bc.session_remaining
    w_used = bc.week_cap - bc.week_remaining
    if metric == "session_credits":
        out["current"] = s_used
        out["limit"] = bc.session_cap
    elif metric == "weekly_credits":
        out["current"] = w_used
        out["limit"] = bc.week_cap
    elif metric == "extra_usage_cap":
        out["metric"] = "extra_usage_cap"
        extras = bc.denial_extra or {}
        out["current"] = extras.get("spent_cents", 0)
        out["limit"] = extras.get("cap_cents", 0)
        out["extra"] = extras
    return out


def _deny_credit_pool(s_rem: int, w_rem: int) -> str:
    """Which pooled limit blocks first when neither pool alone covers a charge."""
    if s_rem <= w_rem:
        return "session_credits"
    return "weekly_credits"


def _project_overage_cents(tier: str, credits: int) -> int:
    rate = OVERAGE_RATES_CENTS_PER_CREDIT.get(tier, 10)
    return max(0, credits * rate)


def _reset_timestamps(org: Organization) -> tuple[datetime | None, datetime | None]:
    """Next reset = window start + duration (for display)."""
    session_at = org.session_window_start
    week_at = org.week_window_start
    session_reset = (session_at + SESSION) if session_at else None
    week_reset = (week_at + WEEK) if week_at else None
    return session_reset, week_reset


async def check_balance(
    db: AsyncSession,
    organization_id: UUID,
    charge_amount: int,
) -> BalanceCheck:
    org = await db.get(Organization, organization_id)
    if org is None:
        raise ValueError("organization not found")
    apply_rolling_resets_in_memory(org)
    tier = credit_tier_for_plan(org.plan, trial_ends_at=org.trial_ends_at)
    s_cap, w_cap = _tier_budgets(tier)
    s_used = int(org.credits_consumed_session or 0)
    w_used = int(org.credits_consumed_week or 0)
    s_rem = max(0, s_cap - s_used)
    w_rem = max(0, w_cap - w_used)
    need = max(0, charge_amount)
    if need == 0:
        return BalanceCheck(
            True,
            s_rem,
            w_rem,
            s_cap,
            w_cap,
            tier,
            False,
            0,
            None,
            None,
        )
    if need <= s_rem and need <= w_rem:
        return BalanceCheck(True, s_rem, w_rem, s_cap, w_cap, tier, False, 0)
    included = min(need, s_rem, w_rem)
    overage_credits = need - included
    if overage_credits <= 0:
        return BalanceCheck(True, s_rem, w_rem, s_cap, w_cap, tier, False, 0)
    if org.extra_usage_enabled and tier in ("pro", "max_5x", "max_20x"):
        add_cents = _project_overage_cents(tier, overage_credits)
        cap = org.extra_usage_monthly_cap_cents
        spent = int(org.extra_usage_spent_period_cents or 0)
        if cap is not None and spent + add_cents > cap:
            return BalanceCheck(
                False,
                s_rem,
                w_rem,
                s_cap,
                w_cap,
                tier,
                False,
                add_cents,
                deny_metric="extra_usage_cap",
                denial_extra={
                    "spent_cents": spent,
                    "cap_cents": cap,
                    "requested_delta_cents": add_cents,
                },
            )
        return BalanceCheck(
            True,
            s_rem,
            w_rem,
            s_cap,
            w_cap,
            tier,
            True,
            add_cents,
        )
    return BalanceCheck(
        False,
        s_rem,
        w_rem,
        s_cap,
        w_cap,
        tier,
        False,
        0,
        deny_metric=_deny_credit_pool(s_rem, w_rem),
        denial_extra=None,
    )


async def apply_charge(
    db: AsyncSession,
    organization_id: UUID,
    *,
    action: str,
    credits: int,
    user_id: UUID | None = None,
    page_id: UUID | None = None,
    orchestration_run_id: UUID | None = None,
    provider: str | None = None,
    model: str | None = None,
    tokens_input: int | None = None,
    tokens_output: int | None = None,
    cost_cents_actual: int | None = None,
) -> None:
    """Append ledger row and update org rollups (call after successful work)."""
    if credits <= 0:
        return
    stmt = select(Organization).where(Organization.id == organization_id).with_for_update()
    org = (await db.execute(stmt)).scalar_one()
    apply_rolling_resets_in_memory(org)
    tier = credit_tier_for_plan(org.plan, trial_ends_at=org.trial_ends_at)
    s_cap, w_cap = _tier_budgets(tier)
    s_used = int(org.credits_consumed_session or 0)
    w_used = int(org.credits_consumed_week or 0)
    s_rem = max(0, s_cap - s_used)
    w_rem = max(0, w_cap - w_used)
    included = min(credits, s_rem, w_rem)
    overage_credits = credits - included
    org.credits_consumed_session = s_used + included
    org.credits_consumed_week = w_used + included
    if overage_credits > 0:
        if not org.extra_usage_enabled:
            raise RuntimeError("forge credits overage without extra_usage_enabled")
        rate = OVERAGE_RATES_CENTS_PER_CREDIT.get(tier, 10)
        org.extra_usage_spent_period_cents = int(org.extra_usage_spent_period_cents or 0) + overage_credits * rate
    row = CreditLedger(
        organization_id=organization_id,
        user_id=user_id,
        page_id=page_id,
        orchestration_run_id=orchestration_run_id,
        action=action,
        credits_charged=credits,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        provider=provider,
        model=model,
        cost_cents_actual=cost_cents_actual,
        meter_overage_units=int(overage_credits),
        stripe_meter_sent_at=None,
    )
    db.add(row)
    await db.flush()


def credits_usage_dict(org: Organization) -> dict[str, Any]:
    """Snapshot for API; caller should run apply_rolling_resets_in_memory on org first."""
    tier = credit_tier_for_plan(org.plan, trial_ends_at=org.trial_ends_at)
    s_cap, w_cap = _tier_budgets(tier)
    s_used = int(org.credits_consumed_session or 0)
    w_used = int(org.credits_consumed_week or 0)
    s_reset, w_reset = _reset_timestamps(org)
    s_pct = min(100.0, (s_used / s_cap) * 100) if s_cap else 0.0
    w_pct = min(100.0, (w_used / w_cap) * 100) if w_cap else 0.0
    return {
        "credits_tier": tier,
        "credits_session_used": s_used,
        "credits_session_cap": s_cap,
        "credits_session_percent": round(s_pct, 1),
        "credits_week_used": w_used,
        "credits_week_cap": w_cap,
        "credits_week_percent": round(w_pct, 1),
        "credits_session_resets_at": s_reset.isoformat() if s_reset else None,
        "credits_week_resets_at": w_reset.isoformat() if w_reset else None,
        "extra_usage_enabled": bool(org.extra_usage_enabled),
        "extra_usage_monthly_cap_cents": org.extra_usage_monthly_cap_cents,
        "extra_usage_spent_period_cents": int(org.extra_usage_spent_period_cents or 0),
    }
