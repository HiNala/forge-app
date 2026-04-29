"""Development seed data — idempotent (safe to re-run).

Creates ``lucy@reds.example``, organization ``reds-construction``, brand kit, three demo
pages, sample submissions, and cross-org coverage for local testing.

Run::

    docker compose exec api uv run python scripts/seed_dev.py

Or locally::

    cd apps/api && uv run python scripts/seed_dev.py

Dev password convention (local only): ``GlideDesignDev!2026``.
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from datetime import UTC, datetime
from pathlib import Path

_api_root = Path(__file__).resolve().parent.parent
if str(_api_root) not in sys.path:
    sys.path.insert(0, str(_api_root))

from sqlalchemy import select

from app.db.models import (
    BrandKit,
    Membership,
    Organization,
    Page,
    Submission,
    User,
)
from app.db.session import AsyncSessionLocal
from app.security.passwords import hash_password

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _id(name: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"forge-seed-dev:{name}")


LUCY_EMAIL = "lucy@reds.example"
BOB_EMAIL = "dev-bob@forge.local"
DEV_PASSWORD = "GlideDesignDev!2026"


async def main() -> None:
    lucy_id = _id("user-lucy")
    bob_id = _id("user-bob")
    org_reds_id = _id("org-reds-construction")
    org_acme_id = _id("org-acme")

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(select(User.id).where(User.email == LUCY_EMAIL))
        ).scalar_one_or_none()
        if existing is not None:
            print("seed_dev: already applied (lucy@reds.example exists).")
            return

        session.add_all(
            [
                User(
                    id=lucy_id,
                    email=LUCY_EMAIL,
                    display_name="Lucy (dev seed)",
                    auth_provider_id=f"forge:{lucy_id}",
                    password_hash=hash_password(DEV_PASSWORD),
                ),
                User(
                    id=bob_id,
                    email=BOB_EMAIL,
                    display_name="Bob (dev)",
                    auth_provider_id=f"forge:{bob_id}",
                    password_hash=hash_password(DEV_PASSWORD),
                ),
                Organization(
                    id=org_reds_id,
                    slug="reds-construction",
                    name="Reds Construction",
                ),
                Organization(
                    id=org_acme_id,
                    slug="dev-acme-co",
                    name="Acme Co (dev)",
                ),
            ]
        )
        await session.flush()

        session.add_all(
            [
                Membership(
                    user_id=lucy_id,
                    organization_id=org_reds_id,
                    role="owner",
                ),
                Membership(
                    user_id=bob_id,
                    organization_id=org_acme_id,
                    role="owner",
                ),
                Membership(
                    user_id=lucy_id,
                    organization_id=org_acme_id,
                    role="viewer",
                ),
            ]
        )
        await session.flush()

        session.add_all(
            [
                BrandKit(
                    organization_id=org_reds_id,
                    primary_color="#F5F0E6",
                    secondary_color="#0D9488",
                    display_font="Cormorant Garamond",
                    body_font="Manrope",
                    voice_note="Warm, trustworthy, construction-adjacent.",
                ),
                BrandKit(
                    organization_id=org_acme_id,
                    primary_color="#2563EB",
                    secondary_color="#0F172A",
                    display_font="DM Sans",
                    body_font="Source Sans 3",
                    voice_note="friendly and clear",
                ),
            ]
        )
        await session.flush()

        p_contact = _id("page-contact")
        p_proposal = _id("page-proposal")
        p_landing = _id("page-landing")
        session.add_all(
            [
                Page(
                    id=p_contact,
                    organization_id=org_reds_id,
                    slug="contact",
                    page_type="contact_form",
                    title="Contact Reds",
                    status="live",
                    current_html="<p>Contact form</p>",
                    intent_json={"kind": "contact"},
                    created_by_user_id=lucy_id,
                ),
                Page(
                    id=p_proposal,
                    organization_id=org_reds_id,
                    slug="deck-sample",
                    page_type="proposal",
                    title="Sample proposal",
                    status="draft",
                    current_html="<p>Proposal</p>",
                    intent_json={"kind": "proposal"},
                    created_by_user_id=lucy_id,
                ),
                Page(
                    id=p_landing,
                    organization_id=org_reds_id,
                    slug="welcome",
                    page_type="landing",
                    title="Welcome",
                    status="live",
                    current_html="<p>Welcome</p>",
                    intent_json={"kind": "landing"},
                    created_by_user_id=lucy_id,
                ),
            ]
        )
        await session.flush()

        now = datetime.now(tz=UTC)
        session.add_all(
            [
                Submission(
                    organization_id=org_reds_id,
                    page_id=p_contact,
                    payload={"name": "Test Lead", "email": "lead@example.com"},
                    submitter_email="lead@example.com",
                    status="new",
                    created_at=now,
                ),
                Submission(
                    organization_id=org_reds_id,
                    page_id=p_contact,
                    payload={"name": "Second", "email": "s@example.com"},
                    submitter_email="s@example.com",
                    status="read",
                    created_at=now,
                ),
            ]
        )
        await session.commit()

    print(
        "seed_dev: created lucy@reds.example, Reds Construction + Acme, "
        "brand kits, three pages, two sample submissions."
    )
    print("         Local E2E password convention: DevSeedLucy!reds (not stored in DB).")


if __name__ == "__main__":
    asyncio.run(main())
