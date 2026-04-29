"""Seed manual-test auth users for first-party authentication.

Run:
    cd apps/api && uv run python scripts/seed_auth_test_users.py
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

_api_root = Path(__file__).resolve().parent.parent
if str(_api_root) not in sys.path:
    sys.path.insert(0, str(_api_root))

from sqlalchemy import select

from app.db.models import BrandKit, Membership, Organization, User
from app.db.session import AsyncSessionLocal
from app.security.passwords import hash_password

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
ADMIN_EMAIL = "admin@glidedesign.local"
FREE_EMAIL = "free@glidedesign.local"
DEV_PASSWORD = "GlideDesignDev!2026"


def _id(name: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"glidedesign-auth-seed:{name}")


async def _upsert_user(
    *,
    email: str,
    display_name: str,
    is_admin: bool,
    org_name: str,
    org_slug: str,
) -> None:
    user_id = _id(f"user:{email}")
    org_id = _id(f"org:{org_slug}")
    async with AsyncSessionLocal() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None:
            user = User(
                id=user_id,
                email=email,
                display_name=display_name,
                password_hash=hash_password(DEV_PASSWORD),
                auth_provider_id=f"forge:{user_id}",
                email_verified_at=datetime.now(UTC),
                is_admin=is_admin,
            )
            session.add(user)
        else:
            user.display_name = display_name
            user.password_hash = hash_password(DEV_PASSWORD)
            user.auth_provider_id = user.auth_provider_id or f"forge:{user.id}"
            user.email_verified_at = user.email_verified_at or datetime.now(UTC)
            user.is_admin = is_admin
        org = await session.get(Organization, org_id)
        if org is None:
            org = Organization(id=org_id, slug=org_slug, name=org_name, plan="free")
            session.add(org)
        else:
            org.plan = "free"
        await session.flush()
        membership = (
            await session.execute(
                select(Membership).where(
                    Membership.user_id == user.id,
                    Membership.organization_id == org.id,
                )
            )
        ).scalar_one_or_none()
        if membership is None:
            session.add(Membership(user_id=user.id, organization_id=org.id, role="owner"))
        brand = (
            await session.execute(select(BrandKit).where(BrandKit.organization_id == org.id))
        ).scalar_one_or_none()
        if brand is None:
            session.add(BrandKit(organization_id=org.id))
        await session.commit()


async def main() -> None:
    await _upsert_user(
        email=ADMIN_EMAIL,
        display_name="Admin Test User",
        is_admin=True,
        org_name="Admin Test Workspace",
        org_slug="admin-test-workspace",
    )
    await _upsert_user(
        email=FREE_EMAIL,
        display_name="Free Test User",
        is_admin=False,
        org_name="Free Test Workspace",
        org_slug="free-test-workspace",
    )
    print("Seeded auth users:")
    print(f"  {ADMIN_EMAIL} / {DEV_PASSWORD} (platform admin)")
    print(f"  {FREE_EMAIL} / {DEV_PASSWORD} (free tier)")


if __name__ == "__main__":
    asyncio.run(main())
