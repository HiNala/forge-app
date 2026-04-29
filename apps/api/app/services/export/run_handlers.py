"""Per-format export executors — referenced by ``EXPORT_HANDLERS`` in ``service.py`` (AL-03)."""

from __future__ import annotations

import textwrap
from typing import TYPE_CHECKING, Any

from app.config import settings

if TYPE_CHECKING:
    from app.db.models import Organization, Page, User
    from app.services.export.service import ExportService


async def export_html_static(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    html = page.current_html or ""
    if not html.strip():
        return "error", {"code": "no_content", "message": "Page has no content yet."}
    await svc._track(org.id, "export_completed", format_id, page)
    return "html", html.encode("utf-8")


async def export_hosted(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    site = (settings.APP_PUBLIC_URL or "https://glidedesign.ai").rstrip("/")
    await svc._track(org.id, "export_completed", format_id, page)
    return "json", {
        "kind": "hosted",
        "message": "Keep publishing on GlideDesign — use your org slug path or connect a custom domain in Settings.",
        "docs_url": f"{site}/settings",
    }


async def export_submissions_csv(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    await svc._track(org.id, "export_completed", format_id, page)
    return "submissions_csv", page.id


async def export_embed_iframe(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    org_slug = org.slug
    pslug = page.slug or "page"
    site = (settings.APP_PUBLIC_URL or "").rstrip("/")
    public = f"{site}/p/{org_slug}/{pslug}" if org_slug and pslug else ""
    snippet = textwrap.dedent(
        f'''
        <!-- GlideDesign embed — form posts to your GlideDesign org -->
        <iframe
          title="GlideDesign form"
          src="{public}"
          style="width:100%;min-height:520px;border:0;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);"
          loading="lazy"
        ></iframe>
        '''
    ).strip()
    if not public:
        snippet = "<!-- Publish the page to get a public URL for iframe src. -->"
    await svc._track(org.id, "export_completed", format_id, page)
    return "json", {"kind": "embed", "title": "iframe", "snippet": snippet, "public_url": public}


async def export_webhook_snippet(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    api_base = (settings.API_BASE_URL or "https://api.glidedesign.ai").rstrip("/")
    body = textwrap.dedent(
        f'''
        // GlideDesign: create an Automation in the app to POST submissions to your endpoint.
        // REST outline (read your API keys from Settings):
        // POST {api_base}/v1/organizations/…/webhooks
        // curl -X GET "{api_base}/v1/…/submissions" -H "Authorization: Bearer <token>"

        console.log("See Automations tab for no-code webhooks, or Inbox API for custom backends.");
        '''
    ).strip()
    await svc._track(org.id, "export_completed", format_id, page)
    return "json", {"kind": "webhook_snippet", "snippet": body, "title": "API + automations"}


async def export_domain_handoff_txt(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    org_slug = org.slug
    pslug = page.slug or "page"
    site = (settings.APP_PUBLIC_URL or "https://app.glidedesign.ai").rstrip("/")
    text = textwrap.dedent(
        f'''
        GlideDesign — domain & data handoff notes
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
    await svc._track(org.id, "export_completed", format_id, page)
    return "text", text.encode("utf-8")


async def export_pptx(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    from app.services.queue import enqueue_deck_export

    queued = await enqueue_deck_export(request.app.state, str(page.id), "pptx")
    if not queued:
        await svc._track(org.id, "export_failed", format_id, page)
        return "error", {
            "code": "queue_unavailable",
            "message": "Deck export worker is unavailable. Try again after the worker is healthy.",
        }
    await svc._track(org.id, "export_queued", format_id, page)
    return "json", {
        "status": "queued",
        "message": "PPTX job queued. Check worker / notifications when available.",
    }


async def export_pdf_pitch(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    from app.services.queue import enqueue_deck_export

    queued = await enqueue_deck_export(request.app.state, str(page.id), "pdf")
    if not queued:
        await svc._track(org.id, "export_failed", format_id, page)
        return "error", {
            "code": "queue_unavailable",
            "message": "Deck export worker is unavailable. Try again after the worker is healthy.",
        }
    await svc._track(org.id, "export_queued", format_id, page)
    return "json", {
        "status": "queued",
        "message": "PDF job queued. Check worker / notifications when available.",
    }


async def export_pdf_signed(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    await svc._track(org.id, "export_completed", format_id, page)
    return "json", {
        "kind": "proposal_pdf",
        "version": "signed",
        "api": f"/v1/pages/{page.id}/proposal/pdf?version=signed",
        "message": "Fetch the storage key from the API above, or use the proposal panel to download.",
    }


async def export_pdf_unsigned(
    svc: ExportService,
    *,
    page: Page,
    org: Organization,
    user: User,
    request: Any,
    format_id: str,
) -> tuple[str, Any]:
    await svc._track(org.id, "export_completed", format_id, page)
    return "json", {
        "kind": "proposal_pdf",
        "version": "draft",
        "api": f"/v1/pages/{page.id}/proposal/pdf",
        "message": "Draft PDF is produced by the existing proposal PDF job — see route above.",
    }


# Format id → executor (validated in ``ExportService.run`` against catalog + workflow).
EXPORT_HANDLERS = {
    "html_static": export_html_static,
    "hosted": export_hosted,
    "submissions_csv": export_submissions_csv,
    "waitlist_csv": export_submissions_csv,
    "embed_iframe": export_embed_iframe,
    "webhook_snippet": export_webhook_snippet,
    "domain_handoff_txt": export_domain_handoff_txt,
    "pptx": export_pptx,
    "pdf": export_pdf_pitch,
    "pdf_signed": export_pdf_signed,
    "pdf_unsigned": export_pdf_unsigned,
}
