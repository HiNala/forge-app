# Alembic Async — Reference for Forge

**Version:** 1.14.x
**Last researched:** 2026-04-19

## What Forge Uses

Alembic for database migrations with async SQLAlchemy and asyncpg. Autogenerate for schema changes, manual edits for partitioning and RLS policies.

## Setup

```bash
cd apps/api
alembic init -t async alembic
```

## env.py (Async Pattern)

```python
# alembic/env.py
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Import Base and ALL models so autogenerate sees them
from app.db.base import Base
from app.db.models import *  # noqa: F401, F403

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,  # NullPool for migrations
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

## alembic.ini Key Settings

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql+asyncpg://forge:forge@localhost:5432/forge

[loggers]
keys = root,sqlalchemy,alembic
```

## Creating Migrations

```bash
# Autogenerate from model changes
alembic revision --autogenerate -m "add pages table"

# Manual migration (for RLS, partitioning)
alembic revision -m "enable RLS on pages"
```

## Migration for Partitioned Tables

Alembic autogenerate doesn't handle partitioning. Hand-edit:

```python
# alembic/versions/xxx_initial_schema.py
def upgrade() -> None:
    # Regular tables first...
    op.create_table("users", ...)

    # Partitioned tables — use raw SQL
    op.execute("""
        CREATE TABLE submissions (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            payload JSONB NOT NULL,
            status TEXT NOT NULL DEFAULT 'new',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);
    """)

    # Create initial partition
    op.execute("""
        CREATE TABLE submissions_2026_04 PARTITION OF submissions
        FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
    """)

def downgrade() -> None:
    op.drop_table("submissions_2026_04")
    op.drop_table("submissions")
```

## Migration for RLS Policies

```python
def upgrade() -> None:
    # Enable RLS on pages
    op.execute("ALTER TABLE pages ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE pages FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON pages
        USING (organization_id::text = current_setting('app.current_tenant_id', true))
    """)

def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation ON pages")
    op.execute("ALTER TABLE pages DISABLE ROW LEVEL SECURITY")
```

## Running Migrations

```bash
# Apply all
alembic upgrade head

# Show current
alembic current

# Show history
alembic history

# Downgrade one
alembic downgrade -1

# Generate SQL without running
alembic upgrade head --sql
```

## Known Pitfalls

1. **NullPool for migrations**: Prevents stale connection issues in async migrations.
2. **Import all models**: If `target_metadata` is empty, autogenerate won't detect anything.
3. **Partitioned tables bypass autogenerate**: Must be hand-written in migrations.
4. **RLS policies bypass autogenerate**: Must be hand-written.
5. **Every migration needs a downgrade**: Forge invariant — no one-way migrations.
6. **Test migrations from scratch**: `alembic upgrade head` on a fresh database must work.

## Links
- [Alembic Docs](https://alembic.sqlalchemy.org/en/latest/)
- [Async Recipe](https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic)
