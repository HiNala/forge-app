"""Unified export entry — formats from catalog ∩ workflow registry; plan gating (P-07)."""

from __future__ import annotations

import textwrap
from dataclasses import dataclass
from typing import Any, Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import Organization, Page, User
from app.services.export.catalog import EXPORT_CATALOG, ExportFormatSpec
from app.services.export.resolve import workflow_key_for_page
from app.services.product_analytics import capture
from app.services.queue import enqueue_deck_export
from app.services.workflows.registry import get_workflow_definition


def _plan_tier(org: Organization | None) -> Literal["free", "pro", "max"]:
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
    if spec.plan_minimum == "max" and tier != "max":
        return True
    return False


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
    def list_formats(self, page: Page, org: Organization | None) -> list[ExportFormatOut]:
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
            eff_impl = spec.implemented
            if spec.id in ("pdf", "pptx") and page.page_type != "pitch_deck":
                eff_impl = False
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

    async def _track(self, org_id: UUID, event: str, fmt: str, page: Page) -> None:
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

        if format_id == "html_static":
            html = page.current_html or ""
            if not html.strip():
                return "error", {"code": "no_content", "message": "Page has no content yet."}
            await self._track(org.id, "export_completed", format_id, page)
            return "html", html.encode("utf-8")

        if format_id == "hosted":
            site = (settings.SITE_URL or "https://forge.app").rstrip("/")
            await self._track(org.id, "export_completed", format_id, page)
            return "json", {
                "kind": "hosted",
                "message": "Keep publishing on Forge — use your org slug path or connect a custom domain in Settings.",
                "docs_url": f"{site}/settings",
            }

        if format_id in ("submissions_csv", "waitlist_csv"):
            await self._track(org.id, "export_completed", format_id, page)
            return "submissions_csv", page.id

        if format_id == "embed_iframe":
            org_slug = org.slug
            pslug = page.slug or "page"
            site = (settings.SITE_URL or "").rstrip("/")
            public = f"{site}/p/{org_slug}/{pslug}" if org_slug and pslug else ""
            snippet = textwrap.dedent(
                f'''
                <!-- Forge embed — form posts to your Forge org -->
                <iframe
                  title="Forge form"
                  src="{public}"
                  style="width:100%;min-height:520px;border:0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);"
                  loading="lazy"
                ></iframe>
                '''
            ).strip()
            if not public:
                snippet = "<!-- Publish the page to get a public URL for iframe src. -->"
            await self._track(org.id, "export_completed", format_id, page)
            return "json", {"kind": "embed", "title": "iframe", "snippet": snippet, "public_url": public}

        if format_id == "webhook_snippet":
            api_base = (settings.SITE_URL or "https://api.forge.app").rstrip("/")
            body = textwrap.dedent(
                f'''
                // Forge: create an Automation in the app to POST submissions to your endpoint.
                // REST outline (read your API keys from Settings):
                // POST {api_base}/v1/organizations/…/webhooks
                // curl -X GET "{api_base}/v1/…/submissions" -H "Authorization: Bearer <token>"

                console.log("See Automations tab for no-code webhooks, or Inbox API for custom backends.");
                '''
            ).strip()
            await self._track(org.id, "export_completed", format_id, page)
            return "json", {"kind": "webhook_snippet", "snippet": body, "title": "API + automations"}

        if format_id == "domain_handoff_txt":
            org_slug = org.slug
            pslug = page.slug or "page"
            site = (settings.SITE_URL or "https://app.forge.app").rstrip("/")
            text = textwrap.dedent(
                f'''
                Forge — domain & data handoff notes
                ====================================

                Public page (when live):
                  {site.replace("app.", "")}/p/{org_slug}/{pslug}

                Exports in app:
                  • HTML: Page → Export → Single HTML file
                  • Submissions: Page → Export → Submissions (CSV) [when the page collects data]

                If you self-host the HTML bundle elsewhere, update DNS at your registrar to
                point to your new host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront, etc.).

                Custom domains (when enabled for your plan) are configured under Settings.

                This file is generated on request — keep it with your project records.
                Page id: {page.id}
                '''
            ).strip()
            await self._track(org.id, "export_completed", format_id, page)
            return "text", text.encode("utf-8")

        if format_id == "pptx" and page.page_type == "pitch_deck":
            try:
                await enqueue_deck_export(request.app.state, str(page.id), "pptx")
            except Exception:  # noqa: BLE001
                pass
            await self._track(org.id, "export_completed", format_id, page)
            return "json", {"status": "queued", "message": "PPTX job queued. Check worker / notifications when available."}

        if format_id == "pdf" and page.page_type == "pitch_deck":
            try:
                await enqueue_deck_export(request.app.state, str(page.id), "pdf")
            except Exception:  # noqa: BLE001
                pass
            await self._track(org.id, "export_completed", format_id, page)
            return "json", {"status": "queued", "message": "PDF job queued. Check worker / notifications when available."}

        if format_id == "pdf_signed" and page.page_type == "proposal":
            await self._track(org.id, "export_completed", format_id, page)
            return "json", {
                "kind": "proposal_pdf",
                "version": "signed",
                "api": f"/v1/pages/{page.id}/proposal/pdf?version=signed",
                "message": "Fetch the storage key from the API above, or use the proposal panel to download.",
            }

        if format_id == "pdf_unsigned" and page.page_type == "proposal":
            await self._track(org.id, "export_completed", format_id, page)
            return "json", {
                "kind": "proposal_pdf",
                "version": "draft",
                "api": f"/v1/pages/{page.id}/proposal/pdf",
                "message": "Draft PDF is produced by the existing proposal PDF job — see route above.",
            }

        await self._track(org.id, "export_failed", format_id, page)
        return "error", {"code": "unsupported", "message": "This format is not wired for your page type yet."}


export_service = ExportService()
