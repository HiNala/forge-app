"""P-07 — GL-01 analytics: export_initiated / export_completed / export_failed.

Revision ID: p07_analytics_export_events
Revises: p06b_analytics_workflow_events
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "p07_analytics_export_events"
down_revision: str | Sequence[str] | None = "p06b_analytics_workflow_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_P07_EXPORT = frozenset({"export_initiated", "export_completed", "export_failed"})


def upgrade() -> None:
    from app.services.analytics.events import EVENTS

    allowed = ", ".join(sorted(f"'{k}'" for k in EVENTS))
    op.execute("ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS ck_analytics_events_event_type")
    op.execute(
        f"ALTER TABLE analytics_events ADD CONSTRAINT ck_analytics_events_event_type CHECK "
        f"((event_type IN ({allowed}) OR "
        f"(event_type ~ '^custom\\.[a-z0-9][a-z0-9_.-]*$' AND char_length(event_type) < 200)))"
    )


def downgrade() -> None:
    from app.services.analytics.events import EVENTS

    for ev in _P07_EXPORT:
        op.execute(f"UPDATE analytics_events SET event_type = 'page_detail_view' WHERE event_type = '{ev}'")
    allowed = ", ".join(sorted(f"'{k}'" for k in EVENTS if k not in _P07_EXPORT))
    op.execute("ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS ck_analytics_events_event_type")
    op.execute(
        f"ALTER TABLE analytics_events ADD CONSTRAINT ck_analytics_events_event_type CHECK "
        f"((event_type IN ({allowed}) OR "
        f"(event_type ~ '^custom\\.[a-z0-9][a-z0-9_.-]*$' AND char_length(event_type) < 200)))"
    )
