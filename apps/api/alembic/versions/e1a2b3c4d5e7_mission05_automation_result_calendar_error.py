"""Mission 05 — automation run result JSON, calendar last_error

Revision ID: e1a2b3c4d5e7
Revises: d5e6f7a8b9c0
Create Date: 2026-04-19

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e1a2b3c4d5e7"
down_revision: str | Sequence[str] | None = "d5e6f7a8b9c0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "automation_runs",
        sa.Column("result_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("calendar_connections", sa.Column("last_error", sa.Text(), nullable=True))
    op.add_column(
        "submissions",
        sa.Column("notification_message_id", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("submissions", "notification_message_id")
    op.drop_column("calendar_connections", "last_error")
    op.drop_column("automation_runs", "result_json")
