"""Context bundle for Studio generation (Mission O-01)."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class SiteBrand(BaseModel):
    url: str
    primary_color: str | None = None
    secondary_color: str | None = None
    display_font: str | None = None
    body_font: str | None = None
    business_name: str | None = None
    tagline: str | None = None
    logo_url: str | None = None
    source: Literal["fetch_meta", "brand_api", "cache"] = "fetch_meta"


class VoiceProfile(BaseModel):
    tone: Literal[
        "formal",
        "casual",
        "playful",
        "technical",
        "warm",
        "corporate",
        "edgy",
        "academic",
    ] = "warm"
    formality: Literal["low", "medium", "high"] = "medium"
    persona_summary: str = ""
    signature_phrases: list[str] = Field(default_factory=list)
    avoid_phrases: list[str] = Field(default_factory=list)
    readability_target: Literal["grade_5", "grade_8", "grade_12", "grade_16"] = "grade_8"


class ProductItem(BaseModel):
    name: str
    description: str | None = None


class PageSummary(BaseModel):
    id: str
    title: str
    page_type: str


class TemplateSummary(BaseModel):
    id: str
    name: str


class CalendarSummary(BaseModel):
    label: str
    connected: bool
    detail: str | None = None


class ContextBundle(BaseModel):
    brand_kit: dict[str, Any] | None = None
    prompt_urls: list[str] = Field(default_factory=list)
    site_brand: SiteBrand | None = None
    site_voice: VoiceProfile | None = None
    site_products: list[ProductItem] = Field(default_factory=list)
    user_voice: VoiceProfile | None = None
    recent_pages: list[PageSummary] = Field(default_factory=list)
    org_templates: list[TemplateSummary] = Field(default_factory=list)
    calendars: list[CalendarSummary] = Field(default_factory=list)
    gather_duration_ms: int = 0
    gather_incomplete: list[str] = Field(default_factory=list)

    def to_prompt_context(self) -> str:
        lines: list[str] = ["## Business context"]
        if self.site_brand:
            sb = self.site_brand
            lines.append(f"Website: {sb.url}")
            if sb.business_name:
                lines.append(f"Name: {sb.business_name}")
            if sb.tagline:
                lines.append(f"Tagline: {sb.tagline}")
            if sb.primary_color or sb.secondary_color:
                lines.append(
                    f"Colors: {sb.primary_color or '—'} (primary), {sb.secondary_color or '—'} (secondary)",
                )
            if sb.display_font or sb.body_font:
                lines.append(f"Fonts: {sb.display_font or '—'} / {sb.body_font or '—'}")
        if self.site_voice and self.site_voice.persona_summary:
            lines.append(f"Tone: {self.site_voice.persona_summary}")
        if self.site_products:
            lines.append(
                "Services / products: "
                + ", ".join(p.name for p in self.site_products[:12]),
            )
        if self.user_voice and self.user_voice.persona_summary:
            lines.append(f"User voice (prior pages): {self.user_voice.persona_summary}")
        if self.calendars:
            lines.append(
                "Calendars: "
                + "; ".join(f"{c.label} ({'on' if c.connected else 'off'})" for c in self.calendars),
            )
        if self.gather_incomplete:
            lines.append(f"(Partial gather; timed out: {', '.join(self.gather_incomplete)})")
        return "\n".join(lines) + "\n"
