"""Design memory table (BP-01/BP-02) + orchestration extras placeholder."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "p08_design_memory_bp01"
down_revision: str | Sequence[str] | None = "p07_analytics_export_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "design_memory",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("strength", sa.Numeric(), nullable=False, server_default="0.5"),
        sa.Column(
            "sources",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", "kind", "key", name="uq_design_memory_org_user_kind_key"),
    )
    op.create_index(op.f("ix_design_memory_organization_id"), "design_memory", ["organization_id"], unique=False)
    op.create_index(op.f("ix_design_memory_user_id"), "design_memory", ["user_id"], unique=False)
    op.execute("ALTER TABLE design_memory ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE design_memory FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY design_memory_tenant ON design_memory
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute(
        "ALTER TABLE orchestration_runs ADD COLUMN IF NOT EXISTS agent_calls "
        "JSONB NOT NULL DEFAULT '[]'::jsonb"
    )
    op.execute(
        "ALTER TABLE orchestration_runs ADD COLUMN IF NOT EXISTS four_layer_output JSONB"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE orchestration_runs DROP COLUMN IF EXISTS four_layer_output")
    op.execute("ALTER TABLE orchestration_runs DROP COLUMN IF EXISTS agent_calls")
    op.execute("DROP POLICY IF EXISTS design_memory_tenant ON design_memory")
    op.drop_index(op.f("ix_design_memory_user_id"), table_name="design_memory")
    op.drop_index(op.f("ix_design_memory_organization_id"), table_name="design_memory")
    op.drop_table("design_memory")
