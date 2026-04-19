"""PostgreSQL availability — integration tests skip cleanly when DB is down."""

from __future__ import annotations

import pytest
from sqlalchemy import text

from app.db.session import AsyncSessionLocal


async def require_postgres() -> None:
    """Skip the current test if the app database is not reachable."""
    try:
        async with AsyncSessionLocal() as s:
            await s.execute(text("SELECT 1"))
    except Exception:
        pytest.skip("PostgreSQL not available")
