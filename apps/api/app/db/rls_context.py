"""Per-request Postgres GUCs for Row-Level Security (see ``docs/architecture/DATABASE.md``)."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def set_active_organization(
    session: AsyncSession, org_id: UUID | str, *, is_local: bool = True
) -> None:
    """Mirror ``app.current_org_id`` (BI-01) and ``app.current_tenant_id`` (legacy policies).

    Defaults to ``is_local=True`` (transaction-scoped) so pooled connections do not leak GUCs.
    """
    s = str(org_id)
    await session.execute(
        text("SELECT set_config('app.current_org_id', :t, :loc)"),
        {"t": s, "loc": is_local},
    )
    await session.execute(
        text("SELECT set_config('app.current_tenant_id', :t, :loc)"),
        {"t": s, "loc": is_local},
    )


async def set_current_user(
    session: AsyncSession, user_id: UUID | str, *, is_local: bool = True
) -> None:
    await session.execute(
        text("SELECT set_config('app.current_user_id', :u, :loc)"),
        {"u": str(user_id), "loc": is_local},
    )


async def set_is_admin(session: AsyncSession, flag: bool, *, is_local: bool = True) -> None:
    await session.execute(
        text("SELECT set_config('app.is_admin', :a, :loc)"),
        {"a": "t" if flag else "f", "loc": is_local},
    )
