"""O-04 — page review quality snapshot + dismissed findings on revisions."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "o04_page_review_quality"
down_revision: str | Sequence[str] | None = "g101_gl01_engagement_analytics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "pages",
        sa.Column("last_review_quality_score", sa.Integer(), nullable=True),
    )
    op.add_column(
        "pages",
        sa.Column("last_review_report", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "pages",
        sa.Column("review_degraded_quality", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "page_revisions",
        sa.Column("dismissed_findings", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("page_revisions", "dismissed_findings")
    op.drop_column("pages", "review_degraded_quality")
    op.drop_column("pages", "last_review_report")
    op.drop_column("pages", "last_review_quality_score")
