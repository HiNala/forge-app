# pytest-asyncio — Reference for Forge

**Version:** 0.24.x
**Last researched:** 2026-04-19

## What Forge Uses

pytest + pytest-asyncio for all backend tests. Async test fixtures for database sessions, transaction rollback per test.

## Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # No need to mark every test with @pytest.mark.asyncio
testpaths = ["tests"]
```

## Fixtures

```python
# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

from app.main import create_app
from app.db.base import Base
from app.db.session import get_db
from app.config import settings

TEST_DATABASE_URL = settings.DATABASE_URL.replace("/forge", "/forge_test")

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest.fixture
async def db(engine) -> AsyncSession:
    """Per-test database session with transaction rollback."""
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        async with session.begin():
            yield session
            await session.rollback()

@pytest.fixture
async def client(db):
    """Test client with dependency override."""
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
```

## Test Patterns

```python
# tests/test_health.py
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

# tests/test_pages.py
async def test_create_page(client, db):
    # Setup: create org and user...
    response = await client.post("/api/v1/pages", json={
        "title": "Small Jobs",
        "slug": "small-jobs",
        "page_type": "booking_form",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "small-jobs"

async def test_cross_tenant_isolation(client, db):
    """Prove that Org A cannot see Org B's pages."""
    # Create page in Org B
    # Switch auth to Org A
    response = await client.get(f"/api/v1/pages/{org_b_page_id}")
    assert response.status_code == 404  # Not 403
```

## Known Pitfalls

1. **`asyncio_mode = "auto"`**: Avoids having to decorate every test with `@pytest.mark.asyncio`.
2. **Transaction rollback**: Each test should run inside a transaction that rolls back, ensuring test isolation.
3. **`ASGITransport`**: httpx >= 0.28 uses `ASGITransport` instead of `app` parameter.
4. **Separate test database**: Always use a separate database (`forge_test`) for tests.

## Links
- [pytest-asyncio Docs](https://pytest-asyncio.readthedocs.io/)
- [httpx Testing](https://www.python-httpx.org/async/)
