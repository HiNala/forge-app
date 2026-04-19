"""Async engine and session factory."""

from __future__ import annotations

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    str(settings.DATABASE_URL),
    echo=settings.ENVIRONMENT in ("development", "local"),
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
)


@event.listens_for(engine.sync_engine, "checkin")
def _reset_rls_session_vars(dbapi_connection, connection_record) -> None:  # type: ignore[no-untyped-def]
    """Pool return — clear RLS GUCs so connections never leak tenant context."""
    cur = dbapi_connection.cursor()
    try:
        # Mission BI-01: RESET canonical session vars; fall back to empty set_config if needed.
        for guc in ("app.current_org_id", "app.current_user_id", "app.is_admin"):
            try:
                cur.execute(f'RESET "{guc}"')
            except Exception:  # noqa: BLE001 — driver-specific errors if GUC was never set
                cur.execute(f"SELECT set_config('{guc}', '', true)")
        for key in ("app.current_tenant_id", "app.invitation_token"):
            cur.execute(f"SELECT set_config('{key}', '', true)")
    finally:
        cur.close()


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# Use ``from app.deps import get_db`` for FastAPI routes (RLS session variables).
