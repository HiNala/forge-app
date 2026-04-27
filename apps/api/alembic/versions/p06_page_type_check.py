"""P-06 — enforce allowed pages.page_type values (mini-app suite).

Revision ID: p06_page_type_check
Revises: p05_canvas_orch
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "p06_page_type_check"
down_revision: str | Sequence[str] | None = "p05_canvas_orch"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Matches ``PageType`` in ``app.services.orchestration.models`` (hyphenated where used in DB).
_ALLOWED = (
    "landing",
    "booking-form",
    "contact-form",
    "proposal",
    "pitch_deck",
    "rsvp",
    "menu",
    "portfolio",
    "link_in_bio",
    "waitlist",
    "gallery",
    "survey",
    "quiz",
    "coming_soon",
    "resume",
    "custom",
)


def upgrade() -> None:
    op.execute("ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_page_type_check")
    in_list = ", ".join(f"'{v}'" for v in _ALLOWED)
    op.execute(f"ALTER TABLE pages ADD CONSTRAINT pages_page_type_check CHECK (page_type IN ({in_list}))")


def downgrade() -> None:
    op.execute("ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_page_type_check")
