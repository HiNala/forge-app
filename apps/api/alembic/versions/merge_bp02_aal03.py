"""Merge BP-02 feedback/memory branch with billing head (dual-head resolution)."""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "merge_bp02_aal03"
down_revision: str | Sequence[str] | None = ("bp02_feedback_memory", "aal03_credit_ledger_stripe_meter")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
