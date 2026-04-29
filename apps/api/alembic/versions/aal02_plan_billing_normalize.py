"""AL-02 — Normalize legacy plan slugs; scheduled_plan_change workflow columns."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "aal02_plan_billing_normalize"
down_revision: str | Sequence[str] | None = "p08_design_memory_bp01"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "scheduled_plan_changes",
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
    )
    op.add_column(
        "scheduled_plan_changes",
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "scheduled_plan_changes",
        sa.Column("cancelled_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_scheduled_plan_changes_created_by",
        "scheduled_plan_changes",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_scheduled_plan_changes_cancelled_by",
        "scheduled_plan_changes",
        "users",
        ["cancelled_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute("UPDATE organizations SET plan = 'free' WHERE plan IN ('starter');")
    op.execute("UPDATE organizations SET plan = 'max_20x' WHERE plan IN ('enterprise');")


def downgrade() -> None:
    """Schema rollback — does not undo plan slug migration (would need backup column)."""
    op.drop_constraint("fk_scheduled_plan_changes_cancelled_by", "scheduled_plan_changes", type_="foreignkey")
    op.drop_constraint("fk_scheduled_plan_changes_created_by", "scheduled_plan_changes", type_="foreignkey")
    op.drop_column("scheduled_plan_changes", "cancelled_by_user_id")
    op.drop_column("scheduled_plan_changes", "created_by_user_id")
    op.drop_column("scheduled_plan_changes", "status")
