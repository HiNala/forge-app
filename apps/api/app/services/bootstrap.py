"""Create user + default org + owner membership + brand kit (idempotent)."""

from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import BrandKit, Membership, Organization, User
from app.db.rls_context import set_active_organization
from app.utils.slug import slugify_workspace, unique_org_slug


async def ensure_user_org_signup(
    session: AsyncSession,
    *,
    auth_provider_id: str,
    email: str,
    display_name: str | None,
    avatar_url: str | None,
    workspace_name: str,
) -> tuple[User, Organization]:
    user = (
        await session.execute(select(User).where(User.auth_provider_id == auth_provider_id))
    ).scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            display_name=display_name,
            avatar_url=avatar_url,
            auth_provider_id=auth_provider_id,
        )
        session.add(user)
        await session.flush()
    else:
        user.display_name = display_name or user.display_name
        user.avatar_url = avatar_url or user.avatar_url

    existing_m = (
        await session.execute(select(Membership).where(Membership.user_id == user.id).limit(1))
    ).scalar_one_or_none()
    if existing_m is not None:
        org = await session.get(Organization, existing_m.organization_id)
        if org is not None:
            return user, org

    base = slugify_workspace(workspace_name)
    slug = unique_org_slug(base)
    org_id = uuid4()
    await session.execute(
        text("SELECT set_config('app.current_user_id', :u, true)"),
        {"u": str(user.id)},
    )
    await set_active_organization(session, org_id)
    org = Organization(id=org_id, name=workspace_name, slug=slug)
    session.add(org)
    await session.flush()

    session.add(
        Membership(user_id=user.id, organization_id=org.id, role="owner"),
    )
    session.add(BrandKit(organization_id=org.id))
    await session.flush()
    return user, org


async def create_additional_workspace(
    session: AsyncSession,
    *,
    user_id: UUID,
    workspace_name: str,
) -> Organization:
    """Second+ workspace for an existing user (owner membership)."""
    base = slugify_workspace(workspace_name)
    slug = unique_org_slug(base)
    org_id = uuid4()
    await session.execute(
        text("SELECT set_config('app.current_user_id', :u, true)"),
        {"u": str(user_id)},
    )
    await set_active_organization(session, org_id)
    org = Organization(id=org_id, name=workspace_name, slug=slug)
    session.add(org)
    await session.flush()
    session.add(
        Membership(user_id=user_id, organization_id=org.id, role="owner"),
    )
    session.add(BrandKit(organization_id=org.id))
    await session.flush()
    await session.refresh(org)
    return org


def clerk_email_from_payload(payload: dict[str, Any]) -> str:
    em = payload.get("email")
    if isinstance(em, str) and em:
        return em
    nested = payload.get("email_addresses")
    if isinstance(nested, list) and nested:
        first = nested[0]
        if isinstance(first, dict) and first.get("email_address"):
            return str(first["email_address"])
    return f"{payload.get('sub', 'unknown')}@users.clerk.invalid"
