"""Mission BI-04 — ``/orgs/current/*`` aliases for ``/org/*`` (same handlers, discoverable paths)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1 import organization as org_routes
from app.api.v1 import settings_surfaces as settings_routes
from app.db.models import BrandKit, Organization, User
from app.deps import get_db, require_role, require_tenant
from app.deps.auth import require_user
from app.deps.db import get_db_user_only
from app.deps.tenant import TenantContext
from app.schemas.org import (
    BrandKitOut,
    BrandKitPut,
    CreateWorkspaceBody,
    LogoUploadResponse,
    OrganizationOut,
    OrganizationPatch,
)
from app.schemas.org_settings_full import OrgSettings, OrgSettingsPartial

router = APIRouter(prefix="/orgs/current", tags=["organization"])


@router.post("/workspaces", response_model=OrganizationOut)
async def create_workspace_alias(
    body: CreateWorkspaceBody,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db_user_only),
) -> Organization:
    return await org_routes.create_workspace(body, user, db)


@router.get("", response_model=OrganizationOut)
async def get_org_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> Organization:
    return await org_routes.get_org(db, ctx)


@router.patch("", response_model=OrganizationOut)
async def patch_org_alias(
    body: OrganizationPatch,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Organization:
    return await org_routes.patch_org(body, db, ctx)


@router.delete("", response_model=OrganizationOut)
async def delete_org_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> Organization:
    return await org_routes.delete_org(db, ctx)


@router.get("/brand", response_model=BrandKitOut)
async def get_brand_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_tenant),
) -> BrandKit:
    return await org_routes.get_brand(db, ctx)


@router.put("/brand", response_model=BrandKitOut)
async def put_brand_alias(
    body: BrandKitPut,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> BrandKit:
    return await org_routes.put_brand(body, db, ctx)


@router.post("/brand/logo", response_model=LogoUploadResponse)
async def post_brand_logo_alias(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> LogoUploadResponse:
    return await org_routes.post_brand_logo(file, db, ctx)


@router.get("/notifications/unread-count")
async def notifications_unread_count_alias(
    ctx: TenantContext = Depends(require_tenant),
) -> dict[str, int]:
    return await org_routes.notifications_unread_count(ctx)


# --- settings_surfaces (same ``/org`` sub-paths) ---


@router.get("/settings", response_model=OrgSettings)
async def get_org_settings_alias(
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
) -> OrgSettings:
    return await settings_routes.get_org_settings(request, db, ctx)


@router.patch("/settings", response_model=OrgSettings)
async def patch_org_settings_alias(
    body: OrgSettingsPartial,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> OrgSettings:
    return await settings_routes.patch_org_settings(body, request, db, ctx)


@router.get("/custom-domains", response_model=list[settings_routes.CustomDomainOut])
async def list_custom_domains_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor", "viewer")),
) -> list[settings_routes.CustomDomainOut]:
    return await settings_routes.list_custom_domains(db, ctx)


@router.post("/custom-domains", response_model=settings_routes.CustomDomainOut)
async def add_custom_domain_alias(
    body: settings_routes.CustomDomainCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> settings_routes.CustomDomainOut:
    return await settings_routes.add_custom_domain(body, request, db, ctx)


@router.delete("/custom-domains/{domain_id}")
async def delete_custom_domain_alias(
    domain_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, bool]:
    return await settings_routes.delete_custom_domain(domain_id, request, db, ctx)


@router.post("/custom-domains/{domain_id}/verify")
async def verify_custom_domain_alias(
    domain_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, Any]:
    return await settings_routes.verify_custom_domain(domain_id, db, ctx)


@router.post("/api-tokens", response_model=settings_routes.ApiTokenCreateOut)
async def create_api_token_alias(
    body: settings_routes.ApiTokenCreateIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> settings_routes.ApiTokenCreateOut:
    return await settings_routes.create_api_token(body, request, db, ctx)


@router.get("/api-tokens", response_model=list[settings_routes.ApiTokenListOut])
async def list_api_tokens_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> list[settings_routes.ApiTokenListOut]:
    return await settings_routes.list_api_tokens(db, ctx)


@router.delete("/api-tokens/{token_id}")
async def revoke_api_token_alias(
    token_id: UUID,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, bool]:
    return await settings_routes.revoke_api_token(token_id, db, ctx)


@router.get("/webhooks/outbound", response_model=list[dict[str, Any]])
async def list_outbound_webhooks_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> list[Any]:
    return await settings_routes.list_outbound_webhooks(db, ctx)


@router.post("/webhooks/outbound")
async def create_outbound_webhook_alias(
    body: settings_routes.WebhookIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> dict[str, Any]:
    return await settings_routes.create_outbound_webhook(body, request, db, ctx)


@router.get("/email-templates", response_model=settings_routes.EmailTemplateOut)
async def get_email_templates_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner", "editor")),
) -> Any:
    return await settings_routes.get_email_templates(db, ctx)


@router.put("/email-templates", response_model=settings_routes.EmailTemplateOut)
async def put_email_templates_alias(
    body: settings_routes.EmailTemplateOut,
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
) -> Any:
    return await settings_routes.put_email_templates(body, db, ctx)


@router.get("/audit")
async def list_org_audit_alias(
    db: AsyncSession = Depends(get_db),
    ctx: TenantContext = Depends(require_role("owner")),
    cursor: int | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    return await settings_routes.list_org_audit(db, ctx, cursor=cursor, limit=limit)
