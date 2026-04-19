"""Generate PNG previews for curated templates (worker — Playwright)."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select

from app.db.models import Template
from app.db.session import AsyncSessionLocal
from app.services.storage_s3 import upload_template_preview_png

logger = logging.getLogger(__name__)


async def generate_template_preview_image(template_id: UUID) -> str | None:
    """Render template HTML and upload screenshot; returns public URL or None."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        logger.warning("playwright not installed — skipping template preview")
        return None

    async with AsyncSessionLocal() as db:
        t = (
            await db.execute(select(Template).where(Template.id == template_id))
        ).scalar_one_or_none()
        if t is None:
            logger.warning("template preview: missing template %s", template_id)
            return None
        html = t.html

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page(viewport={"width": 1200, "height": 800})
            await page.set_content(html, wait_until="load", timeout=60_000)
            png = await page.screenshot(type="png", full_page=False)
        finally:
            await browser.close()

    url = upload_template_preview_png(template_id=template_id, content=png)

    async with AsyncSessionLocal() as db2:
        row = await db2.get(Template, template_id)
        if row is not None:
            row.preview_image_url = url
            await db2.commit()
    return url
