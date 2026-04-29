"""AL-03 — canvas projects/screens/flows/revisions + orchestration clarify state."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "aa03_canvas_projects"
down_revision: str | Sequence[str] | None = "merge_bp02_aal03"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TENANT = "organization_id = current_setting('app.current_tenant_id', true)::uuid"


def upgrade() -> None:
    op.create_table(
        "canvas_projects",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column(
            "intent_json",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("brand_snapshot", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("design_tokens", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("navigation_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("viewport_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "kind IN ('mobile_app','website')",
            name="canvas_projects_kind_check",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.execute(
        "CREATE INDEX ix_canvas_projects_org_kind_updated ON canvas_projects "
        "(organization_id, kind, updated_at DESC)"
    )

    op.create_table(
        "canvas_screens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("screen_type", sa.Text(), nullable=True),
        sa.Column("position_x", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("position_y", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("html", sa.Text(), nullable=False),
        sa.Column("component_tree", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("thumbnail_url", sa.Text(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["canvas_projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "slug", name="uq_canvas_screens_project_slug"),
    )
    op.create_index("ix_canvas_screens_project_sort", "canvas_screens", ["project_id", "sort_order"])

    op.create_table(
        "canvas_flows",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("from_screen_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("to_screen_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("trigger_label", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["project_id"], ["canvas_projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["from_screen_id"], ["canvas_screens.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["to_screen_id"], ["canvas_screens.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "canvas_screen_revisions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("screen_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("html", sa.Text(), nullable=False),
        sa.Column("component_tree", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("edit_type", sa.Text(), nullable=False),
        sa.Column("region_scope", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tokens_input", sa.Integer(), nullable=True),
        sa.Column("tokens_output", sa.Integer(), nullable=True),
        sa.Column("cost_cents", sa.Integer(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "edit_type IN ('initial','full_refine','region_edit','manual_edit','revert')",
            name="canvas_screen_revisions_edit_type_check",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["screen_id"], ["canvas_screens.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("screen_id", "version_number", name="uq_canvas_revisions_screen_version"),
    )

    op.add_column(
        "orchestration_runs",
        sa.Column("graph_state", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "orchestration_runs",
        sa.Column("clarify_expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    # RLS (same tenant pattern as orchestration_runs)
    _canvas_tables = (
        ("canvas_projects", "canvas_projects_tenant"),
        ("canvas_screens", "canvas_screens_tenant"),
        ("canvas_flows", "canvas_flows_tenant"),
        ("canvas_screen_revisions", "canvas_screen_revisions_tenant"),
    )
    for tbl, pol in _canvas_tables:
        op.execute(f'ALTER TABLE "{tbl}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{tbl}" FORCE ROW LEVEL SECURITY')
        op.execute(
            f"""
            CREATE POLICY {pol} ON "{tbl}"
            FOR ALL USING ({_TENANT}) WITH CHECK ({_TENANT})
            """
        )


def downgrade() -> None:
    op.drop_column("orchestration_runs", "clarify_expires_at")
    op.drop_column("orchestration_runs", "graph_state")

    for tbl, policy in (
        ("canvas_screen_revisions", "canvas_screen_revisions_tenant"),
        ("canvas_flows", "canvas_flows_tenant"),
        ("canvas_screens", "canvas_screens_tenant"),
        ("canvas_projects", "canvas_projects_tenant"),
    ):
        op.execute(f"DROP POLICY IF EXISTS {policy} ON {tbl}")
        op.execute(f'ALTER TABLE "{tbl}" NO FORCE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{tbl}" DISABLE ROW LEVEL SECURITY')

    op.drop_table("canvas_screen_revisions")
    op.drop_table("canvas_flows")
    op.drop_index("ix_canvas_screens_project_sort", table_name="canvas_screens")
    op.drop_table("canvas_screens")
    op.drop_index("ix_canvas_projects_org_kind_updated", table_name="canvas_projects")
    op.drop_table("canvas_projects")
