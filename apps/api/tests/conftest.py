"""Shared fixtures."""

from __future__ import annotations

import pytest
import pytest_asyncio

from app.config import settings
from app.db.session import engine


@pytest.fixture(autouse=True)
def _test_auth_bypass(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "AUTH_TEST_BYPASS", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")


@pytest_asyncio.fixture(autouse=True)
async def _recycle_async_engine_pool() -> None:
    """Release asyncpg connections after each test (ASGI client / loop boundaries on Windows)."""
    yield
    await engine.dispose()
