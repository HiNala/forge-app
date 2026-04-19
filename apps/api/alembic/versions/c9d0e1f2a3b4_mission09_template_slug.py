"""Mission 09 — unique slug for template preview URLs and gallery.

Revision ID: c9d0e1f2a3b4
Revises: b7c8d9e0f1a2
Create Date: 2026-04-19

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9d0e1f2a3b4"
down_revision: str | Sequence[str] | None = "b7c8d9e0f1a2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("templates", sa.Column("slug", sa.Text(), nullable=True))
    op.execute(
        """
        UPDATE templates
        SET slug = 'template-' || replace(id::text, '-', '')
        WHERE slug IS NULL
        """
    )
    op.alter_column("templates", "slug", nullable=False)
    op.create_index("uq_templates_slug", "templates", ["slug"], unique=True)


def downgrade() -> None:
    op.drop_index("uq_templates_slug", table_name="templates")
    op.drop_column("templates", "slug")
