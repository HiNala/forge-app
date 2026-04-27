"""Template library — Mission 09."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.models import Page, PageRevision, Template
from app.db.session import AsyncSessionLocal
from tests.support.headers import forge_test_headers
from tests.support.postgres import require_postgres


def _minimal_template_html() -> str:
    return (
        "<!DOCTYPE html><html><head><title>$title</title></head><body>"
        "<p>Hi</p>"
        '<form method="post" action="/p/__ORG_SLUG__/__PAGE_SLUG__/submit">'
        '<button type="submit">Go</button></form></body></html>'
    )


@pytest.mark.asyncio
async def test_unpublished_template_not_listed() -> None:
    await require_postgres()
    from app.db.models import User
    from app.main import app

    tid = uuid.uuid4()
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(
            User(id=uid, email=f"{uid.hex}@list.example.com", auth_provider_id=f"c_{uid}"),
        )
        s.add(
            Template(
                id=tid,
                slug=f"hidden-{tid.hex[:8]}",
                name="Hidden",
                description=None,
                category="forms",
                html=_minimal_template_html(),
                form_schema=None,
                intent_json={"page_type": "landing"},
                is_published=False,
                sort_order=0,
            )
        )
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/templates", headers=h)
    assert r.status_code == 200
    ids = {x["id"] for x in r.json()}
    assert str(tid) not in ids


@pytest.mark.asyncio
async def test_list_templates_filters_by_from_tool() -> None:
    await require_postgres()
    from app.db.models import User
    from app.main import app

    t_match = uuid.uuid4()
    t_other = uuid.uuid4()
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        s.add(User(id=uid, email=f"{uid.hex}@cohort.example.com", auth_provider_id=f"c_{uid}"))
        s.add(
            Template(
                id=t_match,
                slug=f"mf-match-{t_match.hex[:6]}",
                name="Typeform-shaped",
                description=None,
                category="surveys",
                html=_minimal_template_html(),
                form_schema=None,
                intent_json={"page_type": "survey", "migrate_from": ["typeform", "tally"]},
                is_published=True,
                sort_order=0,
            )
        )
        s.add(
            Template(
                id=t_other,
                slug=f"mf-other-{t_other.hex[:6]}",
                name="Carrd-shaped",
                description=None,
                category="landing",
                html=_minimal_template_html(),
                form_schema=None,
                intent_json={"page_type": "coming_soon", "migrate_from": ["carrd"]},
                is_published=True,
                sort_order=0,
            )
        )
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/templates?from_tool=typeform", headers=h)
    assert r.status_code == 200
    ids = {x["id"] for x in r.json()}
    assert str(t_match) in ids
    assert str(t_other) not in ids
    for row in r.json():
        if row["id"] == str(t_match):
            assert row.get("migrate_from") == ["typeform", "tally"]


@pytest.mark.asyncio
async def test_use_template_creates_page_and_revision() -> None:
    await require_postgres()
    from app.main import app

    tid = uuid.uuid4()
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        from app.db.models import Membership, Organization, User

        s.add(User(id=uid, email=f"{uid.hex}@t.example.com", auth_provider_id=f"c_{uid}"))
        s.add(Organization(id=oid, name="T Org", slug=f"t{uid.hex[:6]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        s.add(
            Template(
                id=tid,
                slug=f"usable-{tid.hex[:8]}",
                name="Usable",
                description="d",
                category="forms",
                html=_minimal_template_html(),
                form_schema={"fields": []},
                intent_json={"page_type": "landing"},
                is_published=True,
                sort_order=0,
            )
        )
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.post(f"/api/v1/templates/{tid}/use", headers=h)
    assert r.status_code == 200
    body = r.json()
    pid = uuid.UUID(body["page_id"])

    async with AsyncSessionLocal() as s2:
        p = await s2.get(Page, pid)
        assert p is not None
        assert p.organization_id == oid
        assert (p.intent_json or {}).get("template_id") == str(tid)
        revs = (
            await s2.execute(select(PageRevision).where(PageRevision.page_id == pid))
        ).scalars().all()
        assert any(r.edit_type == "template_applied" for r in revs)


@pytest.mark.asyncio
async def test_admin_templates_requires_operator_org() -> None:
    await require_postgres()
    from app.main import app

    uid = uuid.uuid4()
    oid = uuid.uuid4()
    async with AsyncSessionLocal() as s:
        from app.db.models import Membership, Organization, User

        s.add(User(id=uid, email=f"{uid.hex}@a.example.com", auth_provider_id=f"c_{uid}"))
        s.add(Organization(id=oid, name="A Org", slug=f"a{uid.hex[:6]}"))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/api/v1/admin/templates", headers=h)
    assert r.status_code == 503


@pytest.mark.asyncio
async def test_public_template_by_slug() -> None:
    await require_postgres()
    from app.main import app

    tid = uuid.uuid4()
    slug = f"pub-{tid.hex[:8]}"
    async with AsyncSessionLocal() as s:
        s.add(
            Template(
                id=tid,
                slug=slug,
                name="Public",
                description="x",
                category="landing",
                html=_minimal_template_html(),
                form_schema=None,
                intent_json={"page_type": "landing"},
                is_published=True,
                sort_order=0,
            )
        )
        await s.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get(f"/api/v1/public/templates/by-slug/{slug}")
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == slug
    assert data["id"] == str(tid)
