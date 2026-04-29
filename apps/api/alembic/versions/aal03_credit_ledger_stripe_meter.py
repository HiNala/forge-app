"""AL-02 — Forge Credit ledger: Stripe Billing Meter submission tracking."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "aal03_credit_ledger_stripe_meter"
down_revision: str | Sequence[str] | None = "aal02_plan_billing_normalize"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "credit_ledger",
        sa.Column("meter_overage_units", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "credit_ledger",
        sa.Column("stripe_meter_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("credit_ledger", "meter_overage_units", server_default=None)


def downgrade() -> None:
    op.drop_column("credit_ledger", "stripe_meter_sent_at")
    op.drop_column("credit_ledger", "meter_overage_units")
