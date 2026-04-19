import re
import secrets
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Page


def slugify_page_title(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", title.lower().strip())
    s = s.strip("-")[:60]
    return s or "page"


async def unique_page_slug(db: AsyncSession, organization_id: uuid.UUID, base: str) -> str:
    root = (base or "page")[:80]
    candidate = root
    for _ in range(40):
        exists = (
            await db.execute(
                select(Page.id).where(
                    Page.organization_id == organization_id,
                    Page.slug == candidate,
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            return candidate
        candidate = f"{root[:50]}-{secrets.token_hex(2)}"
    return f"{root[:40]}-{secrets.token_hex(4)}"


def slugify_workspace(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    s = s.strip("-")[:40]
    return s or "workspace"


def unique_org_slug(base: str) -> str:
    """Append short entropy so slug is unique."""
    tail = secrets.token_hex(3)
    return f"{base}-{tail}"
