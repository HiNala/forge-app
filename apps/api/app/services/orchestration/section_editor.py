"""Section-targeted edits — fast model."""

from __future__ import annotations

import logging
import re
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ai.exceptions import LLMConfigurationError
from app.services.ai.router import completion_text
from app.services.orchestration.html_validate import validate_section_html
from app.services.orchestration.prompts import load_prompt

logger = logging.getLogger(__name__)


async def edit_section_html(
    *,
    section_id: str,
    section_html: str,
    instruction: str,
    provider: str | None,
    db: AsyncSession | None = None,
    organization_id: UUID | None = None,
) -> str:
    system = load_prompt("section_edit_system") or "Return only HTML for one section."
    user = (
        f"Section id: {section_id}\nInstruction: {instruction}\n\n"
        f"Current HTML:\n{section_html}\n"
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]
    try:
        text, _ = await completion_text(
            messages,
            task="section_edit",
            provider=provider,
            temperature=0.2,
            db=db,
            organization_id=organization_id,
        )
    except LLMConfigurationError:
        logger.warning("section_edit_no_llm")
        return section_html
    out = text.strip()
    if out.startswith("```"):
        out = re.sub(r"^```\w*\n?", "", out)
        out = re.sub(r"\n```\s*$", "", out)
    ok, reason = validate_section_html(out)
    if not ok:
        logger.warning("section_edit_invalid %s", reason)
        return section_html
    return out


def extract_section_html(full_html: str, section_id: str) -> str | None:
    """Return the first matching section tag (including outer `section` element)."""
    sid = re.escape(section_id)
    pattern = re.compile(
        rf'(<section[^>]*data-forge-section="{sid}"[^>]*>.*?</section>)',
        re.DOTALL | re.IGNORECASE,
    )
    m = pattern.search(full_html)
    return m.group(1) if m else None


def splice_section(full_html: str, section_id: str, new_section_html: str) -> str:
    """Replace first <section ... data-forge-section="id" ...>...</section> block."""
    sid = re.escape(section_id)
    pattern = re.compile(
        rf'<section[^>]*data-forge-section="{sid}"[^>]*>.*?</section>',
        re.DOTALL | re.IGNORECASE,
    )
    m = pattern.search(full_html)
    if not m:
        return full_html
    return full_html[: m.start()] + new_section_html + full_html[m.end() :]
