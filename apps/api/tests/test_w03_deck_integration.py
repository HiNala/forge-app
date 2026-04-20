"""W-03 — deck API + revisions (PostgreSQL)."""

from __future__ import annotations

import copy
import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.db.models import Deck, Membership, Organization, Page, PageRevision, User
from app.db.session import AsyncSessionLocal
from app.main import app
from app.services.deck_builder import build_slides_from_framework, default_theme
from tests.support.headers import forge_test_headers
from tests.support.postgres import require_postgres


@pytest.mark.asyncio
async def test_get_and_patch_deck_creates_revision() -> None:
    await require_postgres()
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    slug = f"deck-{uid.hex[:10]}"
    slides = build_slides_from_framework(
        prompt="Investor pitch for AI coffee",
        deck_title="Caffeine AI",
        organization_name="Demo Org",
        framework_key="Y_COMBINATOR_PITCH",
    )
    theme = default_theme("#2563EB", "#0F172A")
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@deck.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="Deck Org", slug=f"dk-{uid.hex[:8]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        page = Page(
            organization_id=oid,
            slug=slug,
            page_type="pitch_deck",
            title="Caffeine AI",
            status="draft",
            current_html="",
        )
        s.add(page)
        await s.flush()
        s.add(
            Deck(
                page_id=page.id,
                organization_id=oid,
                deck_kind="investor_pitch",
                narrative_framework="Y_COMBINATOR_PITCH",
                slide_count=len(slides),
                slides=slides,
                theme=theme,
            )
        )
        await s.commit()
        page_id = page.id

    h = forge_test_headers(uid, oid)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r0 = await client.get(f"/api/v1/pages/{page_id}/deck", headers=h)
        assert r0.status_code == 200
        assert r0.json()["slide_count"] == len(slides)

        slides2 = copy.deepcopy(slides)
        slides2[0]["title"] = "OVERRIDDEN TITLE"
        r1 = await client.patch(
            f"/api/v1/pages/{page_id}/deck",
            headers=h,
            json={"slides": slides2},
        )
        assert r1.status_code == 200
        assert r1.json()["slides"][0]["title"] == "OVERRIDDEN TITLE"
        for i in range(1, len(slides)):
            assert r1.json()["slides"][i] == slides[i]

        r_ex = await client.post(
            f"/api/v1/pages/{page_id}/deck/export",
            headers=h,
            json={"format": "pdf"},
        )
        assert r_ex.status_code == 200
        assert r_ex.json()["status"] == "queued"

    async with AsyncSessionLocal() as s:
        n = (
            await s.execute(
                select(func.count()).select_from(PageRevision).where(PageRevision.page_id == page_id)
            )
        ).scalar_one()
        assert int(n) >= 1
        rev = (
            await s.execute(
                select(PageRevision)
                .where(PageRevision.page_id == page_id)
                .order_by(PageRevision.created_at.desc())
                .limit(1)
            )
        ).scalar_one()
        assert rev.edit_type == "deck_edit"
