"""P-04 — Forge Credits: org rolling windows, credit_ledger, extra-usage flags.

Revision ID: p04_forge_credits
Revises: gl02_platform_rbac
Create Date: 2026-04-27
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "p04_forge_credits"
down_revision: str | Sequence[str] | None = "gl02_platform_rbac"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("credits_consumed_session", sa.BigInteger(), nullable=False, server_default="0"),
    )
    op.add_column(
        "organizations",
        sa.Column("credits_consumed_week", sa.BigInteger(), nullable=False, server_default="0"),
    )
    op.add_column("organizations", sa.Column("session_window_start", sa.DateTime(timezone=True), nullable=True))
    op.add_column("organizations", sa.Column("week_window_start", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("extra_usage_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("organizations", sa.Column("extra_usage_monthly_cap_cents", sa.Integer(), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("extra_usage_spent_period_cents", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "credit_ledger",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("orchestration_run_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("credits_charged", sa.Integer(), nullable=False),
        sa.Column("tokens_input", sa.Integer(), nullable=True),
        sa.Column("tokens_output", sa.Integer(), nullable=True),
        sa.Column("provider", sa.Text(), nullable=True),
        sa.Column("model", sa.Text(), nullable=True),
        sa.Column("cost_cents_actual", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["page_id"],
            ["pages.id"],
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["orchestration_run_id"],
            ["orchestration_runs.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_credit_ledger_org_created",
        "credit_ledger",
        ["organization_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_credit_ledger_org_created", table_name="credit_ledger")
    op.drop_table("credit_ledger")
    op.drop_column("organizations", "extra_usage_spent_period_cents")
    op.drop_column("organizations", "extra_usage_monthly_cap_cents")
    op.drop_column("organizations", "extra_usage_enabled")
    op.drop_column("organizations", "week_window_start")
    op.drop_column("organizations", "session_window_start")
    op.drop_column("organizations", "credits_consumed_week")
    op.drop_column("organizations", "credits_consumed_session")
