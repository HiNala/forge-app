"""Transactional email via Resend + Jinja2 (Mission 05)."""

from __future__ import annotations

import asyncio
import base64
import logging
import re
from pathlib import Path
from typing import Any, cast

import resend
from jinja2 import Environment, FileSystemLoader, select_autoescape
from markupsafe import escape

from app.config import settings

logger = logging.getLogger(__name__)

# Basic email regex for validation (RFC 5322 simplified)
_EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def _validate_email(email: str) -> bool:
    """Basic email format validation."""
    return bool(_EMAIL_REGEX.match(email.strip()))

_TEMPLATES = Path(__file__).resolve().parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES)),
    autoescape=select_autoescape(["html", "xml"]),
)


def _render_pair(name: str, ctx: dict[str, Any]) -> tuple[str, str]:
    html = _env.get_template(f"{name}.html.j2").render(**ctx)
    text = _env.get_template(f"{name}.txt.j2").render(**ctx)
    return html, text


async def _send_raw(
    *,
    to: list[str],
    subject: str,
    html: str,
    text: str,
    headers: dict[str, str] | None = None,
    attachments: list[tuple[str, bytes]] | None = None,
) -> str | None:
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set; skipping email send")
        return None
    resend.api_key = settings.RESEND_API_KEY
    payload: dict[str, Any] = {
        "from": settings.EMAIL_FROM,
        "to": to,
        "subject": subject,
        "html": html,
        "text": text,
    }
    if headers:
        payload["headers"] = headers
    if attachments:
        payload["attachments"] = [
            {"filename": fn, "content": base64.b64encode(raw).decode("ascii")}
            for fn, raw in attachments
        ]

    def _sync() -> Any:
        # Resend SDK typings expect SendParams; our dict matches at runtime.
        return resend.Emails.send(cast(Any, payload))

    try:
        out = await asyncio.to_thread(_sync)
    except Exception as e:
        logger.exception("resend send failed: %s", e)
        raise
    if isinstance(out, dict) and "id" in out:
        return str(out["id"])
    if hasattr(out, "id"):
        return str(out.id)
    return None


class EmailService:
    """Structured transactional email API — no raw HTML from callers."""

    async def send_notification(
        self,
        *,
        to_email: str,
        org_name: str,
        page_title: str,
        submission_summary: str,
        primary_color: str | None,
        logo_url: str | None,
        voice_note: str | None,
        subject: str | None = None,
        attachments: list[tuple[str, bytes]] | None = None,
    ) -> str | None:
        if not _validate_email(to_email):
            logger.warning("Invalid email format: %s", to_email)
            return None
        ctx = {
            "org_name": org_name,
            "page_title": page_title,
            "submission_summary": submission_summary,
            "primary_color": primary_color or "#6651ff",
            "logo_url": logo_url,
            "voice_note": voice_note or "",
        }
        html, text = _render_pair("notification", ctx)
        return await _send_raw(
            to=[to_email],
            subject=subject or f"New response — {page_title}",
            html=html,
            text=text,
            attachments=attachments,
        )

    async def send_confirmation(
        self,
        *,
        to_email: str,
        subject_line: str,
        body_plain: str,
        primary_color: str | None,
        logo_url: str | None,
        attachments: list[tuple[str, bytes]] | None = None,
    ) -> str | None:
        if not _validate_email(to_email):
            logger.warning("Invalid email format: %s", to_email)
            return None
        body_html = escape(body_plain).replace("\n", "<br />\n")
        ctx = {
            "subject_line": subject_line,
            "body_html": body_html,
            "body_text": body_plain,
            "primary_color": primary_color or "#6651ff",
            "logo_url": logo_url,
        }
        html, text = _render_pair("confirmation", ctx)
        return await _send_raw(
            to=[to_email],
            subject=subject_line,
            html=html,
            text=text,
            attachments=attachments,
        )

    async def send_reply(
        self,
        *,
        to_email: str,
        subject_line: str,
        body_text: str,
        primary_color: str | None,
        logo_url: str | None,
        in_reply_to: str | None = None,
    ) -> str | None:
        if not _validate_email(to_email):
            logger.warning("Invalid email format: %s", to_email)
            return None
        ctx = {
            "subject_line": subject_line,
            "body_text": body_text,
            "primary_color": primary_color or "#6651ff",
            "logo_url": logo_url,
        }
        html, text = _render_pair("reply", ctx)
        headers = None
        if in_reply_to:
            rid = in_reply_to if in_reply_to.startswith("<") else f"<{in_reply_to}>"
            headers = {"In-Reply-To": rid, "References": rid}
        return await _send_raw(
            to=[to_email],
            subject=subject_line,
            html=html,
            text=text,
            headers=headers,
        )

    async def send_invitation(
        self,
        *,
        to_email: str,
        org_name: str,
        cta_url: str | None,
        primary_color: str | None,
        logo_url: str | None,
    ) -> str | None:
        if not _validate_email(to_email):
            logger.warning("Invalid email format: %s", to_email)
            return None
        ctx = {
            "org_name": org_name,
            "cta_url": cta_url or "",
            "primary_color": primary_color or "#6651ff",
            "logo_url": logo_url,
        }
        html, text = _render_pair("invitation", ctx)
        return await _send_raw(
            to=[to_email],
            subject=f"You're invited to {org_name} on GlideDesign",
            html=html,
            text=text,
        )

    async def send_billing_alert(
        self,
        *,
        to_email: str,
        org_name: str,
        message: str,
        billing_url: str | None,
        primary_color: str | None,
        logo_url: str | None,
    ) -> str | None:
        if not _validate_email(to_email):
            logger.warning("Invalid email format: %s", to_email)
            return None
        ctx = {
            "org_name": org_name,
            "message": message,
            "billing_url": billing_url or "",
            "primary_color": primary_color or "#b91c1c",
            "logo_url": logo_url,
        }
        html, text = _render_pair("billing_failed", ctx)
        return await _send_raw(
            to=[to_email],
            subject=f"Payment issue — {org_name}",
            html=html,
            text=text,
        )


email_service = EmailService()
