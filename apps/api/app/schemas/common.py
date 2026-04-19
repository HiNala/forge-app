"""Shared response and envelope types."""

from pydantic import BaseModel, ConfigDict, Field


class StubResponse(BaseModel):
    """Placeholder JSON for unimplemented handlers (Mission 01 scaffold)."""

    model_config = ConfigDict(
        json_schema_extra={"example": {"ok": True, "stub": "endpoint not yet implemented"}}
    )

    ok: bool = Field(default=True, examples=[True])
    stub: str = Field(
        default="endpoint not yet implemented",
        examples=["endpoint not yet implemented"],
    )
