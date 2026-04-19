"""BI-04 — org settings, custom domains, API tokens, webhooks, email overrides."""

from __future__ import annotations

import hashlib
import logging
import re
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, HttpUrl
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    ApiToken,
    AuditLog,
    CustomDomain,
    EmailTemplateOverride,
    Organization,
    OutboundWebhook,
)
from app.deps import get_db, require_role
from app.deps.tenant import TenantContext
from app.schemas.org_settings_full import OrgSettings, OrgSettingsPartial
from app.services.audit_log import write_audit
from app.services.billing_gate import quota_exceeded_response
from app.services.billing_plans import allows_custom_domain
from app.services.org_settings_merge import apply_org_partial, merged_org_settings
from app.services.settings_cache import cache_delete, org_settings_key

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/org", tags=["organization"])


@router.get("/settings", response_model=OrgSettings)
async def get_org_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
) -> OrgSettings:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    return merged_org_settings(org.org_settings)


@router.patch("/settings", response_model=OrgSettings)
async def patch_org_settings(
    body: OrgSettingsPartial,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> OrgSettings:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    before = merged_org_settings(org.org_settings).model_dump(mode="json")
    after = apply_org_partial(org.org_settings, body)
    org.org_settings = after
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=getattr(request.state, "user_id", None),
        action="settings.updated",
        resource_type="organization",
        resource_id=ctx.organization_id,
        changes={"settings": [before, after]},
    )
    await db.commit()
    await cache_delete(request, org_settings_key(str(org.id)))
    return merged_org_settings(after)


def _normalize_hostname(raw: str) -> str:
    h = raw.strip().lower().strip(".")
    if not re.match(r"^[a-z0-9][a-z0-9.-]*[a-z0-9]$", h):
        raise HTTPException(status_code=400, detail="Invalid domain hostname")
    return h


class CustomDomainCreate(BaseModel):
    domain: str
    attached_page_id: UUID | None = None


class CustomDomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    hostname: str
    status: str
    verification_token: str | None
    page_id: UUID | None
    created_at: datetime


@router.get("/custom-domains", response_model=list[CustomDomainOut])
async def list_custom_domains(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
) -> list[CustomDomainOut]:
    rows = (
        await db.execute(
            select(CustomDomain).where(CustomDomain.organization_id == ctx.organization_id)
        )
    ).scalars().all()
    return [CustomDomainOut.model_validate(r, from_attributes=True) for r in rows]


@router.post("/custom-domains", response_model=CustomDomainOut)
async def add_custom_domain(
    body: CustomDomainCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> CustomDomainOut:
    org = await db.get(Organization, ctx.organization_id)
    if org is None:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not allows_custom_domain(org.plan, trial_ends_at=org.trial_ends_at):
        raise quota_exceeded_response(metric="custom_domain", current=1, limit=0)

    host = _normalize_hostname(body.domain)
    tok = secrets.token_urlsafe(24)
    row = CustomDomain(
        organization_id=ctx.organization_id,
        hostname=host,
        page_id=body.attached_page_id,
        verification_token=tok,
        status="pending",
    )
    db.add(row)
    await db.flush()
    await write_audit(
        db,
        organization_id=ctx.organization_id,
        actor_user_id=getattr(request.state, "user_id", None),
        action="custom_domain.added",
        resource_type="custom_domain",
        resource_id=row.id,
        changes={"hostname": [None, host]},
    )
    await db.commit()
    await db.refresh(row)
    return CustomDomainOut.model_validate(row)


@router.delete("/custom-domains/{domain_id}")
async def delete_custom_domain(
    domain_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, bool]:
    row = await db.get(CustomDomain, domain_id)
    if row is None or row.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    row.status = "revoked"
    await db.commit()
    return {"ok": True}


@router.post("/custom-domains/{domain_id}/verify")
async def verify_custom_domain(
    domain_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, Any]:
    row = await db.get(CustomDomain, domain_id)
    if row is None or row.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    if not row.verification_token:
        raise HTTPException(status_code=400, detail="Missing verification token on record")

    txt_name = f"_forge-verify.{row.hostname}"
    verified = False
    try:
        import dns.resolver

        answers = dns.resolver.resolve(txt_name, "TXT")
        for rdata in answers:
            for s in rdata.strings:
                val = s.decode("utf-8", errors="replace") if isinstance(s, bytes) else str(s)
                if row.verification_token in val.strip(' "'):
                    verified = True
                    break
    except Exception as e:
        logger.warning("dns verify %s: %s", txt_name, e)

    if verified:
        row.verified_at = datetime.now(UTC)
        row.status = "verified"
    else:
        row.error_message = "TXT record not found or token mismatch"
        row.status = "error"
    await db.commit()
    return {"ok": True, "verified": verified, "hostname": row.hostname}


# --- API tokens ---


class ApiTokenCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    scopes: list[str]
    expires_in_days: int | None = None


class ApiTokenCreateOut(BaseModel):
    id: UUID
    name: str
    prefix: str
    token: str = Field(description="Plaintext shown once")
    scopes: list[str]


ALLOWED_SCOPES = frozenset(
    {
        "read:pages",
        "write:pages",
        "read:submissions",
        "write:submissions",
        "read:analytics",
        "read:org",
        "admin:all",
    }
)


@router.post("/api-tokens", response_model=ApiTokenCreateOut)
async def create_api_token(
    body: ApiTokenCreateIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> ApiTokenCreateOut:
    for s in body.scopes:
        if s not in ALLOWED_SCOPES:
            raise HTTPException(status_code=400, detail=f"Invalid scope {s}")
    uid = getattr(request.state, "user_id", None) if request else None
    if uid is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    secret_body = secrets.token_urlsafe(32)
    full = f"forge_live_{secret_body}"
    prefix = secret_body[:8]
    digest = hashlib.sha256(full.encode()).hexdigest()
    exp = None
    if body.expires_in_days is not None:
        exp = datetime.now(UTC) + timedelta(days=body.expires_in_days)

    row = ApiToken(
        organization_id=ctx.organization_id,
        created_by=uid,
        name=body.name,
        prefix=prefix,
        token_hash=digest,
        scopes=body.scopes,
        expires_at=exp,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return ApiTokenCreateOut(
        id=row.id,
        name=row.name,
        prefix=row.prefix,
        token=full,
        scopes=row.scopes,
    )


class ApiTokenListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    prefix: str
    scopes: list[str]
    created_at: datetime
    expires_at: datetime | None


@router.get("/api-tokens", response_model=list[ApiTokenListOut])
async def list_api_tokens(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> list[ApiTokenListOut]:
    rows = (
        await db.execute(
            select(ApiToken).where(
                ApiToken.organization_id == ctx.organization_id,
                ApiToken.revoked_at.is_(None),
            )
        )
    ).scalars().all()
    return [ApiTokenListOut.model_validate(r) for r in rows]


@router.delete("/api-tokens/{token_id}")
async def revoke_api_token(
    token_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, bool]:
    row = await db.get(ApiToken, token_id)
    if row is None or row.organization_id != ctx.organization_id:
        raise HTTPException(status_code=404, detail="Not found")
    row.revoked_at = datetime.now(UTC)
    await db.commit()
    return {"ok": True}


# --- outbound webhooks ---


class WebhookIn(BaseModel):
    url: HttpUrl
    events: list[str]
    active: bool = True


@router.get("/webhooks/outbound", response_model=list[dict[str, Any]])
async def list_outbound_webhooks(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> list[Any]:
    rows = (
        await db.execute(
            select(OutboundWebhook).where(OutboundWebhook.organization_id == ctx.organization_id)
        )
    ).scalars().all()
    return [
        {
            "id": str(r.id),
            "url": r.url,
            "events": r.events,
            "active": r.active,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]


@router.post("/webhooks/outbound")
async def create_outbound_webhook(
    body: WebhookIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, Any]:
    uid = getattr(request.state, "user_id", None)
    sec = secrets.token_hex(16)
    row = OutboundWebhook(
        organization_id=ctx.organization_id,
        created_by=uid,
        url=str(body.url),
        secret=sec,
        events=body.events,
        active=body.active,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return {"id": str(row.id), "secret_hint": sec[:4] + "…"}


# --- email template overrides ---


class EmailTemplateOut(BaseModel):
    notify_owner_subject: str | None = None
    notify_owner_body: str | None = None
    confirm_submitter_subject: str | None = None
    confirm_submitter_body: str | None = None
    reply_signature: str | None = None
    from_name: str | None = None
    reply_to_override: str | None = None


@router.get("/email-templates", response_model=EmailTemplateOut)
async def get_email_templates(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> EmailTemplateOverride | EmailTemplateOut:
    row = await db.get(EmailTemplateOverride, ctx.organization_id)
    if row is None:
        return EmailTemplateOut()
    return row


@router.put("/email-templates", response_model=EmailTemplateOut)
async def put_email_templates(
    body: EmailTemplateOut,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> EmailTemplateOverride:
    row = await db.get(EmailTemplateOverride, ctx.organization_id)
    if row is None:
        row = EmailTemplateOverride(organization_id=ctx.organization_id)
        db.add(row)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row


# --- audit (org) ---


@router.get("/audit")
async def list_org_audit(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    cursor: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    q = select(AuditLog).where(AuditLog.organization_id == ctx.organization_id).order_by(
        AuditLog.id.desc()
    )
    if cursor:
        q = q.where(AuditLog.id < cursor)
    q = q.limit(min(limit, 100))
    rows = (await db.execute(q)).scalars().all()
    return {
        "items": [
            {
                "id": r.id,
                "action": r.action,
                "resource_type": r.resource_type,
                "resource_id": str(r.resource_id) if r.resource_id else None,
                "changes": r.changes,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
        "next_cursor": rows[-1].id if rows else None,
    }
