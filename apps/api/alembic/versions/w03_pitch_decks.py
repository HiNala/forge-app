"""W-03 — pitch decks: decks table, curated template seeds (Mission pitch deck workflow)."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "w03_pitch_decks"
down_revision: str | Sequence[str] | None = "w02_contractor_proposals"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "decks",
        sa.Column("page_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("deck_kind", sa.Text(), nullable=False),
        sa.Column("narrative_framework", sa.Text(), nullable=True),
        sa.Column("target_audience", sa.Text(), nullable=True),
        sa.Column("slide_count", sa.Integer(), nullable=False, server_default=sa.text("10")),
        sa.Column(
            "slides",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "theme",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "speaker_notes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "transitions",
            sa.Text(),
            nullable=True,
            server_default=sa.text("'fade'"),
        ),
        sa.Column("locked_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_exported_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_exported_format", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "deck_kind IN ("
            "'investor_pitch','product_launch','internal_strategy','all_hands',"
            "'sales_pitch','conference_talk','teaching_lecture','generic'"
            ")",
            name="ck_decks_deck_kind",
        ),
        sa.CheckConstraint(
            "transitions IN ('none','fade','slide','scale')",
            name="ck_decks_transitions",
        ),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["locked_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("page_id"),
    )
    op.create_index("ix_decks_org", "decks", ["organization_id"])

    op.execute("ALTER TABLE decks ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE decks FORCE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY decks_tenant ON decks
        FOR ALL
        USING (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (organization_id = current_setting('app.current_tenant_id', true)::uuid)
        """
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON decks TO forge_app")

    # Curated deck templates (gallery) — html placeholder; Studio clones intent_json + deck_kind.
    op.execute(
        """
        INSERT INTO templates (
          slug, name, description, category, html, form_schema, intent_json, is_published, sort_order
        ) VALUES
        ('deck-investor-sequoia', 'Investor pitch — Sequoia arc',
         'Problem → traction → team → ask. Default investor narrative.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"investor_pitch","narrative_framework":"SEQUOIA_PITCH"}'::jsonb,
         true, 10),
        ('deck-investor-yc', 'Investor pitch — YC style',
         'One-liner, problem, solution, market, product, business model.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"investor_pitch","narrative_framework":"Y_COMBINATOR_PITCH"}'::jsonb,
         true, 11),
        ('deck-investor-nfx', 'Investor pitch — network effects (NFX)',
         'Highlight defensible network effects and scale.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"investor_pitch","narrative_framework":"NFX_PITCH"}'::jsonb,
         true, 12),
        ('deck-investor-classic', 'Investor pitch — balanced',
         'Balanced 10-slide investor storyline with traction + financials.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"investor_pitch","narrative_framework":"INVESTOR_CLASSIC_10"}'::jsonb,
         true, 13),
        ('deck-investor-seed', 'Investor pitch — seed stage',
         'Earlier-stage emphasis: team, problem clarity, wedge.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"investor_pitch","narrative_framework":"SEED_INVESTOR"}'::jsonb,
         true, 14),
        ('deck-product-launch-01', 'Product launch — hero story',
         'Why now, the product, proof, launch plan.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"product_launch","narrative_framework":"PRODUCT_LAUNCH"}'::jsonb,
         true, 20),
        ('deck-product-launch-02', 'Product launch — category creation',
         'Define category, differentiation, customer proof.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"product_launch","narrative_framework":"PRODUCT_LAUNCH_B"}'::jsonb,
         true, 21),
        ('deck-product-launch-03', 'Product launch — metrics-first',
         'Heavy on KPIs and roadmap.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"product_launch","narrative_framework":"PRODUCT_LAUNCH_C"}'::jsonb,
         true, 22),
        ('deck-internal-strategy-01', 'Internal strategy — OKRs & priorities',
         'Where we are, bets, resourcing, risks.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"internal_strategy","narrative_framework":"INTERNAL_STRATEGY"}'::jsonb,
         true, 30),
        ('deck-internal-strategy-02', 'Internal strategy — quarterly roadmap',
         'Quarterly themes, initiatives, dependencies.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"internal_strategy","narrative_framework":"QBR_ROADMAP"}'::jsonb,
         true, 31),
        ('deck-sales-01', 'Sales pitch — discovery to close',
         'Pain, value, proof, commercial terms.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"sales_pitch","narrative_framework":"SALES_PITCH"}'::jsonb,
         true, 40),
        ('deck-sales-02', 'Sales pitch — enterprise security',
         'Security, compliance, rollout, references.',
         'pitch_deck', '<!-- forge pitch_deck template -->', NULL,
         '{"page_type":"pitch_deck","deck_kind":"sales_pitch","narrative_framework":"SALES_ENTERPRISE"}'::jsonb,
         true, 41)
        ON CONFLICT (slug) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute(
        "DELETE FROM templates WHERE slug LIKE 'deck-%' OR category = 'pitch_deck'"
    )
    op.execute("DROP TABLE IF EXISTS decks CASCADE")
