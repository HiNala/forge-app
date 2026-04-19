"""W-01 — availability calendars, busy blocks, slot holds (booking workflow)."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "w01_calendar_availability"
down_revision: str | Sequence[str] | None = "n2b3i404_bi04"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    op.create_table(
        "availability_calendars",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column(
            "source_type",
            sa.Text(),
            nullable=False,
        ),
        sa.Column("source_ref", sa.Text(), nullable=True),
        sa.Column("timezone", sa.Text(), nullable=False, server_default=sa.text("'UTC'")),
        sa.Column(
            "business_hours",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "buffer_before_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "buffer_after_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column(
            "min_notice_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1440"),
        ),
        sa.Column(
            "max_advance_days",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("60"),
        ),
        sa.Column(
            "slot_duration_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("30"),
        ),
        sa.Column(
            "slot_increment_minutes",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("15"),
        ),
        sa.Column(
            "all_day_events_block",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_availability_calendars_organization_id",
        "availability_calendars",
        ["organization_id"],
    )

    op.create_table(
        "calendar_busy_blocks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("calendar_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source_uid", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(["calendar_id"], ["availability_calendars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_calendar_busy_blocks_cal_range",
        "calendar_busy_blocks",
        ["calendar_id", "starts_at", "ends_at"],
    )

    op.create_table(
        "slot_holds",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("calendar_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("slot_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slot_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Text(),
            nullable=False,
            server_default=sa.text("'pending'"),
        ),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "expires_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW() + INTERVAL '15 minutes'"),
            nullable=False,
        ),
        sa.Column("visitor_fingerprint", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["calendar_id"],
            ["availability_calendars.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_slot_holds_page", "slot_holds", ["page_id"])
    op.create_index("ix_slot_holds_expires", "slot_holds", ["expires_at"])

    op.execute(
        """
        ALTER TABLE slot_holds ADD CONSTRAINT slot_holds_no_overlap
        EXCLUDE USING gist (
          calendar_id WITH =,
          tstzrange(slot_start, slot_end) WITH &&
        )
        WHERE (status IN ('pending', 'confirmed'))
        """
    )

    for table in ("availability_calendars", "calendar_busy_blocks", "slot_holds"):
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

    op.execute(
        """
        CREATE POLICY availability_calendars_tenant ON availability_calendars
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute(
        """
        CREATE POLICY calendar_busy_blocks_tenant ON calendar_busy_blocks
        FOR ALL
        USING (
          calendar_id IN (
            SELECT id FROM availability_calendars
            WHERE organization_id = current_setting('app.current_tenant_id', true)::uuid
          )
        )
        WITH CHECK (
          calendar_id IN (
            SELECT id FROM availability_calendars
            WHERE organization_id = current_setting('app.current_tenant_id', true)::uuid
          )
        )
        """
    )
    op.execute(
        """
        CREATE POLICY slot_holds_tenant ON slot_holds
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )

    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON availability_calendars TO forge_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON calendar_busy_blocks TO forge_app")
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON slot_holds TO forge_app")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS slot_holds CASCADE")
    op.execute("DROP TABLE IF EXISTS calendar_busy_blocks CASCADE")
    op.execute("DROP TABLE IF EXISTS availability_calendars CASCADE")
