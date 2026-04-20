"""W-02 — public proposal routes, change orders, expiration (PostgreSQL)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from app.db.models import Membership, Organization, Page, Proposal, ProposalQuestion, User
from app.db.session import AsyncSessionLocal
from app.main import app
from app.services.proposal_service import (
    assign_signed_proposal_pdf_storage_placeholder,
    expire_due_proposals,
)
from tests.support.headers import forge_test_headers
from tests.support.postgres import require_postgres


async def _seed_org_with_live_proposal(
    *,
    status: str = "sent",
    expires_at: datetime | None = None,
) -> tuple[uuid.UUID, uuid.UUID, str, str, uuid.UUID]:
    """Returns user_id, org_id, org_slug, page_slug, page_id."""
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    org_slug = f"w02-{uid.hex[:10]}"
    page_slug = f"prop-{uid.hex[:8]}"
    line_items = [
        {
            "category": "Labor",
            "description": "Work",
            "qty": 1,
            "unit": "ea",
            "rate_cents": 10000,
            "total_cents": 10000,
        }
    ]
    async with AsyncSessionLocal() as s:
        s.add(
            User(
                id=uid,
                email=f"{uid.hex}@w02.example.com",
                auth_provider_id=f"clerk_{uid}",
            )
        )
        s.add(Organization(id=oid, name="W02 Proposal Co", slug=org_slug))
        await s.flush()
        s.add(Membership(user_id=uid, organization_id=oid, role="owner"))
        page = Page(
            organization_id=oid,
            slug=page_slug,
            page_type="proposal",
            title="Fence proposal",
            status="live",
            current_html="<div data-forge-section='cover'>x</div>",
        )
        s.add(page)
        await s.flush()
        prop = Proposal(
            page_id=page.id,
            organization_id=oid,
            client_name="Johnson",
            project_title="Fence install",
            scope_of_work=[
                {"phase": "Install", "description": "Fence", "deliverables": ["Posts"]},
            ],
            exclusions=[],
            line_items=line_items,
            subtotal_cents=10000,
            tax_rate_bps=0,
            tax_cents=0,
            total_cents=10000,
            timeline=[{"milestone": "Start", "date": "TBD", "description": "Kickoff"}],
            payment_terms="Net 30",
            legal_terms=(
                "Proposal terms. Forge is not a law firm and does not provide legal advice."
            ),
            status=status,
            expires_at=expires_at,
        )
        s.add(prop)
        await s.commit()
        return uid, oid, org_slug, page_slug, page.id


@pytest.mark.asyncio
async def test_public_proposal_view_sets_first_viewed() -> None:
    await require_postgres()
    _uid, _oid, org_slug, page_slug, page_id = await _seed_org_with_live_proposal()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(f"/p/{org_slug}/{page_slug}/proposal/view")
    assert r.status_code == 200

    async with AsyncSessionLocal() as s:
        p = (
            await s.execute(select(Proposal).where(Proposal.page_id == page_id))
        ).scalar_one()
        assert p.first_viewed_at is not None
        assert p.status == "viewed"


@pytest.mark.asyncio
async def test_public_proposal_question_creates_row_and_status() -> None:
    await require_postgres()
    _uid, _oid, org_slug, page_slug, page_id = await _seed_org_with_live_proposal()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            f"/p/{org_slug}/{page_slug}/proposal/question",
            json={
                "asker_email": "client@example.com",
                "asker_name": "Pat",
                "section_ref": "scope",
                "question": "Does this include gates?",
            },
        )
    assert r.status_code == 200

    async with AsyncSessionLocal() as s:
        q = select(ProposalQuestion).where(ProposalQuestion.page_id == page_id)
        rows = (await s.execute(q)).scalars().all()
        assert len(rows) == 1
        assert rows[0].question.startswith("Does this")
        prop = await s.get(Proposal, page_id)
        assert prop is not None
        assert prop.status == "questioned"


@pytest.mark.parametrize("kind", ("click_to_accept", "typed", "drawn"))
@pytest.mark.asyncio
async def test_public_proposal_accept_all_signature_kinds(kind: str) -> None:
    await require_postgres()
    uid, oid, org_slug, page_slug, page_id = await _seed_org_with_live_proposal()

    transport = ASGITransport(app=app)
    tiny_png_b64 = (
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    sig_data = tiny_png_b64 if kind == "drawn" else "Pat Client"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            f"/p/{org_slug}/{page_slug}/proposal/accept",
            json={
                "name": "Pat Client",
                "email": "pat@example.com",
                "signature_kind": kind,
                "signature_data": sig_data,
            },
        )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "accepted"
    assert body.get("proposal_number")

    async with AsyncSessionLocal() as s:
        prop = await s.get(Proposal, page_id)
        assert prop is not None
        assert prop.status == "accepted"
        assert prop.decision_signature_kind == kind
        assert prop.decision_by_email == "pat@example.com"

        await assign_signed_proposal_pdf_storage_placeholder(s, page_id=page_id)
        await s.commit()

    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r_pdf = await client.get(
            f"/api/v1/pages/{page_id}/proposal/pdf?version=signed",
            headers=h,
        )
    assert r_pdf.status_code == 200
    assert r_pdf.json().get("storage_key")


@pytest.mark.asyncio
async def test_change_order_supersedes_parent_and_sets_parent_link() -> None:
    await require_postgres()
    uid, oid, _org_slug, _page_slug, parent_page_id = await _seed_org_with_live_proposal()

    async with AsyncSessionLocal() as s:
        q = ProposalQuestion(
            organization_id=oid,
            page_id=parent_page_id,
            asker_email="x@y.com",
            question="Unanswered",
        )
        s.add(q)
        await s.commit()

    transport = ASGITransport(app=app)
    h = forge_test_headers(uid, oid)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            f"/api/v1/pages/{parent_page_id}/proposal/change-order",
            headers=h,
        )
    assert r.status_code == 200
    new_id = r.json()["new_page_id"]

    async with AsyncSessionLocal() as s:
        parent_prop = await s.get(Proposal, parent_page_id)
        assert parent_prop is not None
        assert parent_prop.status == "superseded"
        child_prop = await s.get(Proposal, uuid.UUID(new_id))
        assert child_prop is not None
        assert child_prop.parent_proposal_id == parent_page_id
        assert child_prop.status == "draft"
        carried = (
            await s.execute(
                select(ProposalQuestion).where(ProposalQuestion.page_id == uuid.UUID(new_id))
            )
        ).scalars().all()
        assert len(carried) == 1
        assert carried[0].answer is None


@pytest.mark.asyncio
async def test_expire_due_proposals_marks_expired() -> None:
    await require_postgres()
    past = datetime.now(UTC) - timedelta(days=2)
    _uid, _oid, _org_slug, _page_slug, page_id = await _seed_org_with_live_proposal(
        status="sent",
        expires_at=past,
    )

    async with AsyncSessionLocal() as s:
        await expire_due_proposals(s)
        await s.commit()

    async with AsyncSessionLocal() as s:
        prop = await s.get(Proposal, page_id)
        assert prop is not None
        assert prop.status == "expired"


@pytest.mark.asyncio
async def test_public_decline_records_status() -> None:
    await require_postgres()
    _uid, _oid, org_slug, page_slug, page_id = await _seed_org_with_live_proposal()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.post(
            f"/p/{org_slug}/{page_slug}/proposal/decline",
            json={"reason": "Budget"},
        )
    assert r.status_code == 200

    async with AsyncSessionLocal() as s:
        prop = await s.get(Proposal, page_id)
        assert prop is not None
        assert prop.status == "declined"
