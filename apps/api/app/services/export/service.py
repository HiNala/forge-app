"""Unified export entry — formats from catalog ∩ workflow registry; plan gating (P-07)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Organization, Page, User
from app.services.export.catalog import EXPORT_CATALOG, ExportFormatSpec
from app.services.export.resolve import workflow_key_for_page
from app.services.export.run_handlers import EXPORT_HANDLERS
from app.services.product_analytics import capture
from app.services.workflows.registry import get_workflow_definition


def _plan_tier(org: Organization | None) -> Literal["free", "pro", "max"]:
    if org is None:
        return "free"
    p = (org.plan or "trial").lower()
    if p in ("pro", "business", "max", "max_5x", "max_20x", "scale"):
        if "max" in p or p in ("scale", "business"):
            return "max"
        return "pro"
    return "free"


def _is_locked(spec: ExportFormatSpec, tier: Literal["free", "pro", "max"]) -> bool:
    if spec.plan_minimum == "free":
        return False
    if spec.plan_minimum == "pro" and tier == "free":
        return True
    return bool(spec.plan_minimum == "max" and tier != "max")


@dataclass(frozen=True, slots=True)
class ExportFormatOut:
    id: str
    label: str
    description: str
    plan_minimum: str
    implemented: bool
    async_worker: bool
    locked: bool
    whats_inside: list[str]
    status: str  # ready | planned | pro_only


@dataclass(frozen=True, slots=True)
class EmbedPayload:
    kind: Literal["embed_iframe", "webhook_snippet", "domain_handoff_txt", "hosted", "info"]
    body: str
    mime: str = "text/plain"


class ExportService:
    def list_formats(
        self,
        page: Page,
        org: Organization | None,
        *,
        include_planned: bool = False,
    ) -> list[ExportFormatOut]:
        wk = workflow_key_for_page(page)
        wf = get_workflow_definition(wk)
        if wf is None:
            allowed: tuple[str, ...] = ("html_static", "hosted", "submissions_csv")
        else:
            allowed = wf.export_formats
        tier = _plan_tier(org)
        out: list[ExportFormatOut] = []
        for fmt_id in allowed:
            spec = EXPORT_CATALOG.get(fmt_id)
            if spec is None:
                continue
            if spec.hidden_in_ui:
                continue
            eff_impl = spec.implemented
            if spec.id in ("pdf", "pptx") and page.page_type != "pitch_deck":
                eff_impl = False
            if not include_planned and not eff_impl:
                continue
            locked = eff_impl and _is_locked(spec, tier)
            st = "planned" if not eff_impl else ("pro_only" if (eff_impl and _is_locked(spec, tier)) else "ready")
            out.append(
                ExportFormatOut(
                    id=spec.id,
                    label=spec.label,
                    description=spec.description,
                    plan_minimum=spec.plan_minimum,
                    implemented=eff_impl,
                    async_worker=spec.async_worker,
                    locked=locked,
                    whats_inside=list(spec.whats_inside),
                    status=st,
                )
            )
        return out

    async def _track(self, org_id: Any, event: str, fmt: str, page: Page) -> None:
        await capture(
            str(org_id),
            event,
            {
                "format": fmt,
                "page_type": page.page_type,
                "workflow": workflow_key_for_page(page),
            },
        )

    async def run(
        self,
        *,
        db: AsyncSession,
        page: Page,
        org: Organization,
        user: User,
        request: Any,
        format_id: str,
    ) -> tuple[str, Any]:
        """Return (kind, payload) where payload matches executor below."""
        wk = workflow_key_for_page(page)
        await self._track(org.id, "export_initiated", format_id, page)

        spec = EXPORT_CATALOG.get(format_id)
        if spec is None:
            return "error", {"code": "unknown_format", "message": f"Unknown format: {format_id}"}

        wf = get_workflow_definition(wk)
        allowed = wf.export_formats if wf else ("html_static", "hosted", "submissions_csv")
        if format_id not in allowed:
            return "error", {"code": "not_allowed", "message": f"Format not available for this page type: {format_id}"}

        tier = _plan_tier(org)
        if _is_locked(spec, tier) and spec.implemented:
            return "error", {"code": "plan_locked", "message": "This export requires a higher plan."}

        if not spec.implemented:
            return "error", {"code": "not_implemented", "message": "This export is not available yet (roadmap)."}

        if format_id not in EXPORT_HANDLERS:
            return "error", {"code": "unsupported", "message": "This format is not wired for your page type yet."}

        # Page-shape guards mirror previous inline checks.
        if format_id == "pptx" and page.page_type != "pitch_deck":
            await self._track(org.id, "export_failed", format_id, page)
            return "error", {"code": "unsupported", "message": "This format is not wired for your page type yet."}
        if format_id == "pdf" and page.page_type != "pitch_deck":
            await self._track(org.id, "export_failed", format_id, page)
            return "error", {"code": "unsupported", "message": "This format is not wired for your page type yet."}
        if format_id in ("pdf_signed", "pdf_unsigned") and page.page_type != "proposal":
            await self._track(org.id, "export_failed", format_id, page)
            return "error", {"code": "unsupported", "message": "This format is not wired for your page type yet."}

        handler = EXPORT_HANDLERS[format_id]
        return await handler(
            self,
            page=page,
            org=org,
            user=user,
            request=request,
            format_id=format_id,
        )


export_service = ExportService()
