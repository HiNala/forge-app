# asyncpg — Reference for Forge

**Version:** 0.30.x
**Last researched:** 2026-04-19

## What Forge Uses

asyncpg as the PostgreSQL driver for SQLAlchemy async. We don't use asyncpg directly — SQLAlchemy wraps it — but we configure it via the connection string and engine options.

## Connection String

```
postgresql+asyncpg://forge:forge@postgres:5432/forge
```

## Engine Configuration

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,        # Max persistent connections
    max_overflow=10,     # Extra connections allowed under load
    pool_timeout=30,     # Seconds to wait for a connection from pool
    pool_recycle=1800,   # Recycle connections after 30 minutes
    echo=False,          # Set True for SQL logging in dev
)
```

## Known Pitfalls

1. **SSL in production**: Add `?ssl=require` to the connection string for Railway.
2. **Pool exhaustion**: If you see "QueuePool limit" errors, increase `pool_size` or check for leaked sessions.
3. **`NullPool` for migrations**: Alembic should use `NullPool` to avoid stale connections.
4. **CITEXT extension**: asyncpg supports PostgreSQL's CITEXT type natively. Ensure the extension is created in the database.

## Links
- [asyncpg Docs](https://magicstack.github.io/asyncpg/)
- [SQLAlchemy asyncpg](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#module-sqlalchemy.dialects.postgresql.asyncpg)
