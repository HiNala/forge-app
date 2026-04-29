"""Launch access hardening for tenant tables and page types."""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "auth03_launch_access_hardening"
down_revision: str | Sequence[str] | None = "auth02_email_verification"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_TENANT = "organization_id = current_setting('app.current_tenant_id', true)::uuid"
_RLS_TABLES = (
    "credit_ledger",
    "improvement_reports",
    "llm_routing_history",
    "llm_routing_policies",
    "plan_recommendations",
    "refund_requests",
    "studio_attachments",
)
_PAGE_TYPES = (
    "landing",
    "booking-form",
    "booking_form",
    "contact-form",
    "contact_form",
    "proposal",
    "pitch_deck",
    "rsvp",
    "menu",
    "portfolio",
    "link_in_bio",
    "waitlist",
    "gallery",
    "survey",
    "quiz",
    "coming_soon",
    "resume",
    "custom",
)


def upgrade() -> None:
    for table in _RLS_TABLES:
        policy = f"{table}_tenant"
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE "{table}" FORCE ROW LEVEL SECURITY')
        op.execute(f'DROP POLICY IF EXISTS {policy} ON "{table}"')
        op.execute(f'CREATE POLICY {policy} ON "{table}" FOR ALL USING ({_TENANT}) WITH CHECK ({_TENANT})')

    in_list = ", ".join(f"'{page_type}'" for page_type in _PAGE_TYPES)
    op.execute("ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_page_type_check")
    op.execute(f"ALTER TABLE pages ADD CONSTRAINT pages_page_type_check CHECK (page_type IN ({in_list}))")


def downgrade() -> None:
    op.execute("ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_page_type_check")
    legacy = (
        "landing",
        "booking-form",
        "contact-form",
        "proposal",
        "pitch_deck",
        "rsvp",
        "menu",
        "portfolio",
        "link_in_bio",
        "waitlist",
        "gallery",
        "survey",
        "quiz",
        "coming_soon",
        "resume",
        "custom",
    )
    legacy_list = ", ".join(f"'{page_type}'" for page_type in legacy)
    op.execute(f"ALTER TABLE pages ADD CONSTRAINT pages_page_type_check CHECK (page_type IN ({legacy_list}))")

    for table in reversed(_RLS_TABLES):
        policy = f"{table}_tenant"
        op.execute(f'DROP POLICY IF EXISTS {policy} ON "{table}"')
        op.execute(f'ALTER TABLE "{table}" NO FORCE ROW LEVEL SECURITY')
