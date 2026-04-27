"""Immutable catalog of export format metadata — the contract with the UI (P-07).

Each format has a stable ``id`` used in API, analytics, and ``WorkflowDefinition.export_formats``.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

PlanMinimum = Literal["free", "pro", "max"]


@dataclass(frozen=True, slots=True)
class ExportFormatSpec:
    id: str
    label: str
    description: str
    plan_minimum: PlanMinimum = "free"
    # True = user can run today (sync or existing worker). False = visible, upgrade/roadmap.
    implemented: bool = True
    # If True, user must not expect immediate file — background worker.
    async_worker: bool = False
    whats_inside: tuple[str, ...] = ()


# Stable ids (also referenced from workflow registry).
ExportFormatId = str

_EXPORT: dict[str, ExportFormatSpec] = {
    "hosted": ExportFormatSpec(
        id="hosted",
        label="Keep on Forge (hosted link)",
        description="Default — live URL, SSL, analytics, and updates from Studio. No file export needed.",
        whats_inside=("Public page URL on your org slug", "Forge analytics and submissions inbox"),
    ),
    "html_static": ExportFormatSpec(
        id="html_static",
        label="Single HTML file",
        description=" Self-contained .html of the current page. Open locally or host on any static host.",
        whats_inside=("One .html with inline styles where possible", "Form posts go to Forge by default"),
    ),
    "html_zip": ExportFormatSpec(
        id="html_zip",
        label="Static site (.zip)",
        description="Multi-page or asset-heavy exports as a folder you can unzip and upload anywhere.",
        plan_minimum="pro",
        implemented=False,
        whats_inside=("index.html, /assets, relative links", "Planned: web canvas + multi-page"),
    ),
    "nextjs_project": ExportFormatSpec(
        id="nextjs_project",
        label="Next.js project",
        description=" Runnable Next.js app (pnpm install && pnpm build) with routes and brand tokens.",
        plan_minimum="pro",
        implemented=False,
        async_worker=True,
        whats_inside=("app/", "package.json", "tailwind config", "Stub until canvas export lands"),
    ),
    "framer_json": ExportFormatSpec(
        id="framer_json",
        label="Framer import JSON",
        description="For teams standardizing on Framer for handoff from generated layouts.",
        plan_minimum="pro",
        implemented=False,
    ),
    "webflow_json": ExportFormatSpec(
        id="webflow_json",
        label="Webflow import JSON",
        description="For teams using Webflow CMS as a destination.",
        plan_minimum="pro",
        implemented=False,
    ),
    "submissions_csv": ExportFormatSpec(
        id="submissions_csv",
        label="Submissions (CSV)",
        description="All responses for this page — oldest first — for spreadsheets and BI tools.",
        whats_inside=("CSV with id, created_at, payload fields", "Same filters as the submissions list when supported"),
    ),
    "submissions_json": ExportFormatSpec(
        id="submissions_json",
        label="Submissions (JSON lines)",
        description="Line-delimited JSON for pipelines and data warehouses (beta).",
        plan_minimum="pro",
        implemented=False,
    ),
    "embed_iframe": ExportFormatSpec(
        id="embed_iframe",
        label="Embeddable iframe",
        description="One snippet to drop into your existing site. Submissions still hit Forge.",
        plan_minimum="pro",
        implemented=True,
        whats_inside=('<iframe src="…/embed">', "responsive height, optional theme param"),
    ),
    "embed_script": ExportFormatSpec(
        id="embed_script",
        label="Inline embed (script)",
        description="A div + script for tighter style inheritance than iframe (beta).",
        plan_minimum="pro",
        implemented=False,
    ),
    "webhook_snippet": ExportFormatSpec(
        id="webhook_snippet",
        label="Webhook + API example",
        description="Copy-paste Node and curl samples for automations and migration planning.",
        implemented=True,
        whats_inside=("Create automation in Forge", "OpenAPI-style POST examples"),
    ),
    "typeform_json": ExportFormatSpec(
        id="typeform_json",
        label="Typeform-compatible JSON",
        description="For migrating long surveys to Typeform when you outgrow a single page (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "pdf": ExportFormatSpec(
        id="pdf",
        label="PDF",
        description="For decks: one page per slide. For other pages: print-friendly PDF (roadmap by surface).",
        async_worker=True,
    ),
    "pptx": ExportFormatSpec(
        id="pptx",
        label="PowerPoint (.pptx)",
        description="Editable slides. Queued in the background; download when ready.",
        async_worker=True,
    ),
    "google_slides": ExportFormatSpec(
        id="google_slides",
        label="Google Slides",
        description="Requires Google connect — creates a new deck in Drive (W-03 when enabled).",
        plan_minimum="pro",
        implemented=False,
        async_worker=True,
    ),
    "keynote": ExportFormatSpec(
        id="keynote",
        label="Keynote",
        description="Best-effort Keynote / iWork export (lower priority).",
        plan_minimum="pro",
        implemented=False,
    ),
    "slide_png_zip": ExportFormatSpec(
        id="slide_png_zip",
        label="Slide images (PNG zip)",
        description="Per-slide 1920×1080 PNGs for social and decks.",
        plan_minimum="pro",
        implemented=False,
        async_worker=True,
    ),
    "speaker_notes": ExportFormatSpec(
        id="speaker_notes",
        label="Speaker notes (Markdown)",
        description="Text export for presenter rehearsal (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "pdf_signed": ExportFormatSpec(
        id="pdf_signed",
        label="Signed proposal PDF",
        description="When signed, same asset as the proposal panel. Use GET /v1/pages/…/proposal/pdf?version=signed.",
        async_worker=True,
        implemented=True,
        whats_inside=("Storage key or download via proposal PDF API",),
    ),
    "pdf_unsigned": ExportFormatSpec(
        id="pdf_unsigned",
        label="Unsigned draft PDF",
        description="Watermarked draft for review before e-sign. Queued via GET /v1/pages/…/proposal/pdf (draft).",
        plan_minimum="pro",
        implemented=True,
        async_worker=True,
        whats_inside=("Async draft render or status payload",),
    ),
    "docx": ExportFormatSpec(
        id="docx",
        label="Word (.docx)",
        description="Microsoft Word for legal and procurement redlines (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "google_doc": ExportFormatSpec(
        id="google_doc",
        label="Google Doc",
        description="New Doc in the connected Google Drive (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "email_html": ExportFormatSpec(
        id="email_html",
        label="Email-friendly HTML",
        description="Inlined CSS for forwardable client review (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "figma": ExportFormatSpec(
        id="figma",
        label="Figma",
        description="Structured layers for the mobile / design canvas (V2-02+).",
        plan_minimum="pro",
        implemented=False,
        async_worker=True,
    ),
    "expo_project": ExportFormatSpec(
        id="expo_project",
        label="Expo (React Native) project",
        description="npx expo start — runnable project matching Studio screens (roadmap).",
        plan_minimum="pro",
        implemented=False,
        async_worker=True,
    ),
    "html_prototype": ExportFormatSpec(
        id="html_prototype",
        label="HTML prototype (canvas)",
        description="Clickable multi-screen HTML for reviews (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "png_screens": ExportFormatSpec(
        id="png_screens",
        label="Screen PNGs / SVGs",
        description="Retina image exports of each frame (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "lottie": ExportFormatSpec(
        id="lottie",
        label="Lottie JSON",
        description="For animated transitions in supported canvases (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "print_pdf": ExportFormatSpec(
        id="print_pdf",
        label="Print-ready PDF (menu)",
        description="8.5×11 takeout / table menu (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "menu_xlsx": ExportFormatSpec(
        id="menu_xlsx",
        label="Menu spreadsheet (CSV/XLSX)",
        description="For POS sync and pricing tools (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "qr_png": ExportFormatSpec(
        id="qr_png",
        label="QR code (PNG)",
        description="Encodes the public page URL (great for menus and posters).",
        plan_minimum="free",
        implemented=False,
    ),
    "ics_event": ExportFormatSpec(
        id="ics_event",
        label="Calendar (.ics)",
        description="Event block + attendee list helpers for day-of (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "waitlist_csv": ExportFormatSpec(
        id="waitlist_csv",
        label="Waitlist emails (CSV)",
        description="Export captured emails for Mailchimp / ESP import (submissions when waitlist = form).",
        whats_inside=("Same pipeline as submissions CSV when emails are stored in submissions",),
    ),
    "json_resume": ExportFormatSpec(
        id="json_resume",
        label="JSON Resume",
        description="jsonresume.org schema for toolchains (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "gallery_images_zip": ExportFormatSpec(
        id="gallery_images_zip",
        label="Image bundle (.zip)",
        description="Original or watermarked images for offline delivery (roadmap).",
        plan_minimum="pro",
        implemented=False,
        async_worker=True,
    ),
    "quiz_interactive_html": ExportFormatSpec(
        id="quiz_interactive_html",
        label="Interactive quiz (HTML)",
        description="Single-file quiz with scoring preserved (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "vercel_deploy": ExportFormatSpec(
        id="vercel_deploy",
        label="Vercel / Netlify deploy",
        description="One-click deploy button with bundled static output (roadmap).",
        plan_minimum="pro",
        implemented=False,
    ),
    "domain_handoff_pdf": ExportFormatSpec(
        id="domain_handoff_pdf",
        label="Domain & data handoff kit (PDF)",
        description="Print-ready PDF is coming. Use the text kit for the same content today.",
        plan_minimum="pro",
        implemented=False,
    ),
    "domain_handoff_txt": ExportFormatSpec(
        id="domain_handoff_txt",
        label="Domain & data handoff kit (text)",
        description="Plain checklist: your live URL, export paths, and where to point DNS on Vercel/Netlify/Cloudflare if you self-host later.",
        implemented=True,
        whats_inside=("Current public URL", "Submissions + export links", "Good-faith migration pointers"),
    ),
}

EXPORT_CATALOG: dict[str, ExportFormatSpec] = _EXPORT
