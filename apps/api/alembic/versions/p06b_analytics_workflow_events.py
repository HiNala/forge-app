"""P-06b — extend analytics event_type CHECK for workflow-specific public events.

Revision ID: p06b_analytics_workflow_events
Revises: p06_page_type_check
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "p06b_analytics_workflow_events"
down_revision: str | Sequence[str] | None = "p06_page_type_check"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_P06B_ADDED = frozenset(
    {"link_click", "menu_item_view", "rsvp_submit", "survey_step_complete", "quiz_complete"}
)


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

    for ev in _P06B_ADDED:
        fallback = "outbound_link" if ev == "link_click" else "form_submit_success"
        op.execute(
            f"UPDATE analytics_events SET event_type = '{fallback}' WHERE event_type = '{ev}'"
        )
    allowed = ", ".join(sorted(f"'{k}'" for k in EVENTS if k not in _P06B_ADDED))
    op.execute("ALTER TABLE analytics_events DROP CONSTRAINT IF EXISTS ck_analytics_events_event_type")
    op.execute(
        f"ALTER TABLE analytics_events ADD CONSTRAINT ck_analytics_events_event_type CHECK "
        f"((event_type IN ({allowed}) OR "
        f"(event_type ~ '^custom\\.[a-z0-9][a-z0-9_.-]*$' AND char_length(event_type) < 200)))"
    )
