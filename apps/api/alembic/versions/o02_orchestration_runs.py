"""Mission O-02 — orchestration run traces."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "o02_orchestration_runs"
down_revision: str | Sequence[str] | None = "w03_bi01_partman"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "orchestration_runs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("graph_name", sa.Text(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("intent", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("plan", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("review_findings", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("node_timings", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("total_tokens_input", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_tokens_output", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cost_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "CREATE INDEX idx_orch_runs_org_created ON orchestration_runs "
        "(organization_id, created_at DESC)"
    )
    op.execute("ALTER TABLE orchestration_runs ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE orchestration_runs FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY orchestration_runs_tenant ON orchestration_runs
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS orchestration_runs_tenant ON orchestration_runs")
    op.drop_index("idx_orch_runs_org_created", table_name="orchestration_runs")
    op.drop_table("orchestration_runs")
