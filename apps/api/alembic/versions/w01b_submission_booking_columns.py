"""W-01 — submission columns for calendar event id and booking magic link."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "w01b_submission_booking"
down_revision: str | Sequence[str] | None = "w01_calendar_availability"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("submissions", sa.Column("calendar_event_id", sa.Text(), nullable=True))
    op.add_column("submissions", sa.Column("booking_token", sa.Text(), nullable=True))
    # Partitioned `submissions` cannot have a UNIQUE on `booking_token` alone (PG requires partition key
    # in unique indexes). Lookup performance only — enforce token uniqueness in application if needed.
    op.create_index(
        "ix_submissions_booking_token",
        "submissions",
        ["booking_token"],
        unique=False,
        postgresql_where=sa.text("booking_token IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_submissions_booking_token", table_name="submissions")
    op.drop_column("submissions", "booking_token")
    op.drop_column("submissions", "calendar_event_id")
