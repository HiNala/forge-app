"""Visitor / session identifiers and identity merge persistence (GL-01)."""

from __future__ import annotations

import hashlib
import secrets
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.identity_merge import IdentityMerge


def new_visitor_id() -> str:
    return secrets.token_urlsafe(16)


def new_session_id() -> str:
    return secrets.token_urlsafe(12)


def experiment_variant(visitor_id: str, experiment_key: str, variants: list[str]) -> str:
    """Deterministic bucket: hash(visitor_id + key) → variant."""
    if not variants:
        return "control"
    h = hashlib.sha256(f"{visitor_id}:{experiment_key}".encode()).hexdigest()
    idx = int(h[:12], 16) % len(variants)
    return variants[idx]


async def record_identity_merge(
    db: AsyncSession,
    *,
    visitor_id: str,
    user_id: UUID,
) -> None:
    """Insert merge row if missing (visitor → user)."""
    existing = (
        await db.execute(
            select(IdentityMerge).where(
                IdentityMerge.visitor_id == visitor_id[:500],
                IdentityMerge.user_id == user_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return
    db.add(IdentityMerge(visitor_id=visitor_id[:500], user_id=user_id))
    await db.flush()
