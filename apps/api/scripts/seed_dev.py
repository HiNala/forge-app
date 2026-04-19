"""Development seed data — idempotent (safe to re-run).

Creates two users, two orgs, brand kits, and a cross-org membership (Alice is
viewer in Bob's org). Run::

    docker compose exec api uv run python scripts/seed_dev.py

Or locally::

    cd apps/api && uv run python scripts/seed_dev.py
"""

from __future__ import annotations

import asyncio
import sys
import uuid
from pathlib import Path

_api_root = Path(__file__).resolve().parent.parent
if str(_api_root) not in sys.path:
    sys.path.insert(0, str(_api_root))

from sqlalchemy import select

from app.db.models import BrandKit, Membership, Organization, User
from app.db.session import AsyncSessionLocal

_NS = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")


def _id(name: str) -> uuid.UUID:
    return uuid.uuid5(_NS, f"forge-seed-dev:{name}")


ALICE_EMAIL = "dev-alice@forge.local"
BOB_EMAIL = "dev-bob@forge.local"


async def main() -> None:
    alice_id = _id("user-alice")
    bob_id = _id("user-bob")
    org_reds_id = _id("org-reds")
    org_acme_id = _id("org-acme")

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(select(User.id).where(User.email == ALICE_EMAIL))
        ).scalar_one_or_none()
        if existing is not None:
            print("seed_dev: already applied (dev-alice exists).")
            return

        session.add_all(
            [
                User(
                    id=alice_id,
                    email=ALICE_EMAIL,
                    display_name="Alice (dev)",
                    auth_provider_id="clerk_seed_dev_alice",
                ),
                User(
                    id=bob_id,
                    email=BOB_EMAIL,
                    display_name="Bob (dev)",
                    auth_provider_id="clerk_seed_dev_bob",
                ),
                Organization(
                    id=org_reds_id,
                    slug="dev-reds-construction",
                    name="Reds Construction (dev)",
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
                    user_id=alice_id,
                    organization_id=org_reds_id,
                    role="owner",
                ),
                Membership(
                    user_id=bob_id,
                    organization_id=org_acme_id,
                    role="owner",
                ),
                Membership(
                    user_id=alice_id,
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
                    primary_color="#B8272D",
                    secondary_color="#1C1C1C",
                    display_font="Inter",
                    body_font="Inter",
                    voice_note="no-nonsense, local, honest",
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
        await session.commit()

    print("seed_dev: created Alice + Bob, orgs dev-reds-construction / dev-acme-co,")
    print("          brand kits, and Alice viewer on Acme (cross-org membership).")


if __name__ == "__main__":
    asyncio.run(main())
