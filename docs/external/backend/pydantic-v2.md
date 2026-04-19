# Pydantic v2 — Reference for Forge

**Version:** 2.10.x
**Last researched:** 2026-04-19

## What Forge Uses

Pydantic v2 for all request/response validation, OpenAPI schema generation, and settings management.

## Schema Patterns

### Request/Response Naming Convention
- `*Request` — incoming request body
- `*Response` — outgoing response wrapper
- `*Read` — entity dump (from ORM model)
- `*Write` — entity creation/update input

### Page Schemas Example

```python
# app/schemas/pages.py
from datetime import datetime
from uuid import UUID
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class PageWrite(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, examples=["Small Jobs Booking"])
    slug: str = Field(..., pattern=r"^[a-z0-9-]+$", examples=["small-jobs"])
    page_type: Literal[
        "booking_form", "contact_form", "event_rsvp", "daily_menu",
        "proposal", "landing", "gallery", "custom"
    ] = Field(..., examples=["booking_form"])

class PageRead(BaseModel):
    id: UUID = Field(..., examples=["550e8400-e29b-41d4-a716-446655440001"])
    slug: str = Field(..., examples=["small-jobs"])
    page_type: str = Field(..., examples=["booking_form"])
    title: str = Field(..., examples=["Small Jobs Booking"])
    status: Literal["draft", "live", "archived"] = Field(..., examples=["draft"])
    current_html: str | None = Field(None, examples=["<section>...</section>"])
    form_schema: dict | None = Field(None)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PageListResponse(BaseModel):
    items: list[PageRead]
    total: int = Field(..., examples=[42])
    page: int = Field(..., examples=[1])
    per_page: int = Field(..., examples=[20])
```

### Settings (pydantic-settings)

```python
# app/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql+asyncpg://forge:forge@postgres:5432/forge"
    REDIS_URL: str = "redis://redis:6379/0"
    SECRET_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:3000"

    # LLM
    LLM_DEFAULT_PROVIDER: str = "openai"
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""

    # Storage
    S3_ENDPOINT: str = "http://minio:9000"
    S3_BUCKET: str = "forge-uploads"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""

    # Email
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@forge.app"

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

settings = Settings()
```

### Validators

```python
from pydantic import BaseModel, field_validator, model_validator

class BrandKitWrite(BaseModel):
    primary_color: str | None = Field(None, examples=["#B8272D"])
    secondary_color: str | None = Field(None, examples=["#1C1C1C"])
    display_font: str | None = Field(None, examples=["Inter"])
    voice_note: str | None = Field(None, max_length=500)

    @field_validator("primary_color", "secondary_color")
    @classmethod
    def validate_color(cls, v: str | None) -> str | None:
        if v is None:
            return v
        import re
        if not re.match(r"^(#[0-9a-fA-F]{6}|oklch\(.+\))$", v):
            raise ValueError("Must be hex (#RRGGBB) or oklch format")
        return v
```

### Annotated Fields with Custom Types

```python
from typing import Annotated
from pydantic import Field

EmailStr = Annotated[str, Field(pattern=r"^[^@]+@[^@]+\.[^@]+$")]
SlugStr = Annotated[str, Field(pattern=r"^[a-z0-9-]+$", min_length=1, max_length=50)]
```

## Known Pitfalls

1. **`from_attributes=True`**: Required on every schema that wraps an ORM model.
2. **`model_dump()` not `.dict()`**: v2 renamed the method.
3. **`model_validate()` not `.parse_obj()`**: v2 renamed.
4. **`Field(examples=[...])` not `example=...`**: v2 uses a list.
5. **`ConfigDict` not `Config` inner class**: v2 pattern.

## Links
- [Pydantic v2 Docs](https://docs.pydantic.dev/latest/)
- [Migration Guide](https://docs.pydantic.dev/latest/migration/)
