"""Mission 08 — custom_domains + SECURITY DEFINER for Caddy on-demand TLS."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "m8a1b2c3d4e5"
down_revision: str | None = "f1e2d3c4b5a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_domains",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("hostname", sa.Text(), nullable=False),
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("hostname", name="uq_custom_domains_hostname"),
    )
    op.create_index("ix_custom_domains_organization_id", "custom_domains", ["organization_id"])

    op.execute('ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY')
    op.execute(
        """
        CREATE POLICY forge_tenant_isolation ON custom_domains
        FOR ALL
        USING (
          current_setting('app.current_tenant_id', true) IS NOT NULL
          AND organization_id = current_setting('app.current_tenant_id', true)::uuid
        )
        WITH CHECK (
          current_setting('app.current_tenant_id', true) IS NOT NULL
          AND organization_id = current_setting('app.current_tenant_id', true)::uuid
        )
        """
    )

    # Caddy `on_demand_tls ask` — must not depend on tenant session vars (uses get_db_public).
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.forge_caddy_domain_allowed(p_hostname text)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $$
          SELECT EXISTS (
            SELECT 1
            FROM custom_domains
            WHERE lower(hostname) = lower(trim(p_hostname))
              AND verified_at IS NOT NULL
          );
        $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS public.forge_caddy_domain_allowed(text)")
    op.drop_table("custom_domains")
