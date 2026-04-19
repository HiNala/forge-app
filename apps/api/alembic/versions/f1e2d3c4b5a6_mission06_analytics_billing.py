"""Mission 06 — Stripe idempotency, usage submissions, billing flags."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "f1e2d3c4b5a6"
down_revision: str | None = "e1a2b3c4d5e7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stripe_events_processed",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("stripe_event_id", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("stripe_event_id", name="uq_stripe_events_processed_event_id"),
    )
    op.create_index(
        "ix_stripe_events_processed_created_at",
        "stripe_events_processed",
        ["created_at"],
    )

    op.add_column(
        "subscription_usage",
        sa.Column("submissions_received", sa.Integer(), server_default="0", nullable=False),
    )

    op.add_column(
        "organizations",
        sa.Column("payment_failed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("stripe_subscription_status", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("organizations", "stripe_subscription_status")
    op.drop_column("organizations", "payment_failed_at")
    op.drop_column("subscription_usage", "submissions_received")
    op.drop_index("ix_stripe_events_processed_created_at", table_name="stripe_events_processed")
    op.drop_table("stripe_events_processed")
