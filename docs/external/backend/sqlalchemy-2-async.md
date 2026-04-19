# SQLAlchemy 2.0 Async — Reference for Forge

**Version:** 2.0.40+
**Last researched:** 2026-04-19

## What Forge Uses

SQLAlchemy 2.0 with async support via asyncpg driver. Declarative models with `Mapped[T]` type annotations, `async_sessionmaker`, and `selectinload` for relationships.

## Engine & Session Setup

```python
# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,  # postgresql+asyncpg://...
    pool_size=20,
    max_overflow=10,
    echo=settings.ENVIRONMENT == "development",
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Critical for async
)
```

## Declarative Base

```python
# app/db/base.py
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import func, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
    )

class TenantMixin:
    """Mixin for all tenant-scoped tables."""
    organization_id: Mapped[UUID] = mapped_column(
        sa.ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
    )
```

## Model Examples

```python
# app/db/models/user.py
import uuid
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin

class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    avatar_url: Mapped[str | None] = mapped_column(Text)
    auth_provider_id: Mapped[str | None] = mapped_column(Text)

    memberships: Mapped[list["Membership"]] = relationship(back_populates="user")
```

```python
# app/db/models/page.py
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from app.db.base import Base, TimestampMixin, TenantMixin

class Page(Base, TimestampMixin, TenantMixin):
    __tablename__ = "pages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    page_type: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="draft")
    current_html: Mapped[str | None] = mapped_column(Text)
    form_schema: Mapped[dict | None] = mapped_column(JSONB)
    brand_kit_snapshot: Mapped[dict | None] = mapped_column(JSONB)
    intent_json: Mapped[dict | None] = mapped_column(JSONB)

    __table_args__ = (
        sa.UniqueConstraint("organization_id", "slug", name="uq_page_org_slug"),
    )
```

## Query Patterns

```python
# Select with filtering
result = await db.execute(
    select(Page)
    .where(Page.organization_id == org_id)
    .where(Page.status == "live")
    .order_by(Page.updated_at.desc())
    .limit(20)
    .offset(0)
)
pages = result.scalars().all()

# Single row
result = await db.execute(
    select(Page).where(Page.id == page_id)
)
page = result.scalar_one_or_none()

# With relationship loading
result = await db.execute(
    select(Page)
    .options(selectinload(Page.versions))
    .where(Page.id == page_id)
)

# Insert
page = Page(title="Small Jobs", slug="small-jobs", page_type="booking_form", organization_id=org_id)
db.add(page)
await db.flush()  # Gets the ID without committing

# Update
page.title = "New Title"
await db.flush()

# JSONB query
from sqlalchemy import cast
result = await db.execute(
    select(Submission)
    .where(Submission.payload["email"].astext == "dan@example.com")
)
```

## Setting RLS Session Variable

```python
# In the get_db dependency or tenant middleware
async def get_db_with_tenant(request: Request) -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        org_id = request.state.org_id
        if org_id:
            await session.execute(
                text("SET LOCAL app.current_tenant_id = :tid"),
                {"tid": str(org_id)}
            )
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

## Known Pitfalls

1. **`expire_on_commit=False`**: Without this, accessing attributes after commit raises `DetachedInstanceError`.
2. **Import all models**: SQLAlchemy needs all models imported for metadata to be complete. Create an `app/db/models/__init__.py` that imports everything.
3. **`selectinload` vs `joinedload`**: Use `selectinload` for collections, `joinedload` for single relations.
4. **`scalar_one_or_none()`**: Returns `None` if no row. `scalar_one()` raises if no row.
5. **Async context**: Never use sync SQLAlchemy APIs in an async context.

## Links
- [SQLAlchemy 2.0 Async](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [Mapped Column](https://docs.sqlalchemy.org/en/20/orm/mapped_attributes.html)
