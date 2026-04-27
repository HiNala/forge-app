"""P-05 — studio attachments, LLM routing policies, routing audit.

Revision ID: p05_canvas_orch
Revises: p04_forge_credits
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "p05_canvas_orch"
down_revision: str | Sequence[str] | None = "p04_forge_credits"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "studio_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("mime_type", sa.String(128), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("extracted_features", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_studio_attachments_org", "studio_attachments", ["organization_id"])
    op.create_index("ix_studio_attachments_session", "studio_attachments", ["session_id"])

    op.create_table(
        "llm_routing_policies",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("role", sa.String(64), nullable=False),
        sa.Column("primary_provider", sa.String(32), nullable=False),
        sa.Column("primary_model", sa.Text(), nullable=False),
        sa.Column("fallbacks", postgresql.JSONB(), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("auto_route_cost_aware", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("cold_start_runs", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_llm_routing_policies_org", "llm_routing_policies", ["organization_id"])
    op.create_index("ix_llm_routing_policies_role", "llm_routing_policies", ["role"])
    op.execute(
        "CREATE UNIQUE INDEX uq_llm_routing_platform_role ON llm_routing_policies (role) WHERE organization_id IS NULL",
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_llm_routing_org_role "
        "ON llm_routing_policies (organization_id, role) WHERE organization_id IS NOT NULL",
    )

    op.create_table(
        "llm_routing_history",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("llm_routing_history")
    op.execute("DROP INDEX IF EXISTS uq_llm_routing_org_role")
    op.execute("DROP INDEX IF EXISTS uq_llm_routing_platform_role")
    op.drop_table("llm_routing_policies")
    op.drop_index("ix_studio_attachments_session", table_name="studio_attachments")
    op.drop_index("ix_studio_attachments_org", table_name="studio_attachments")
    op.drop_table("studio_attachments")
