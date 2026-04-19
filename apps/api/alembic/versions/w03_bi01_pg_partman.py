"""BI-01 — Register native range partitions with pg_partman (submissions, analytics_events).

Revision ID: w03_bi01_partman
Revises: w03_pitch_decks
Create Date: 2026-04-19

Requires PostgreSQL with the ``pg_partman`` extension (see ``docker-compose.yml``:
``ghcr.io/dbsystel/postgresql-partman:16``).

Upgrade drops the placeholder ``*_default`` partitions. If a default partition still
holds rows (typical dev DB after seeding), rows are stashed in ``public._bi01_stash_*``,
the default is dropped, ``create_parent`` runs, then rows are re-inserted into the
parent so PostgreSQL routes them to the correct monthly children.

Downgrade removes partman registration, drops generated children + template tables,
and recreates a single ``DEFAULT`` partition per parent (empty-DB CI assumption).
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "w03_bi01_partman"
down_revision: str | Sequence[str] | None = "w03_pitch_decks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_STASH_AND_DROP_DEFAULTS_SQL = r"""
DO $body$
DECLARE
  n bigint;
BEGIN
  DROP TABLE IF EXISTS public._bi01_stash_submissions;
  DROP TABLE IF EXISTS public._bi01_stash_analytics_events;

  IF to_regclass('public.submissions_default') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*)::bigint FROM public.submissions_default' INTO n;
    IF n > 0 THEN
      CREATE TABLE public._bi01_stash_submissions AS SELECT * FROM public.submissions_default;
    END IF;
    EXECUTE 'DROP TABLE public.submissions_default';
  END IF;

  IF to_regclass('public.analytics_events_default') IS NOT NULL THEN
    EXECUTE 'SELECT COUNT(*)::bigint FROM public.analytics_events_default' INTO n;
    IF n > 0 THEN
      CREATE TABLE public._bi01_stash_analytics_events AS SELECT * FROM public.analytics_events_default;
    END IF;
    EXECUTE 'DROP TABLE public.analytics_events_default';
  END IF;
END
$body$;
"""

_RESTORE_STASHED_ROWS_SQL = r"""
DO $body$
BEGIN
  IF to_regclass('public._bi01_stash_submissions') IS NOT NULL THEN
    INSERT INTO public.submissions SELECT * FROM public._bi01_stash_submissions;
    DROP TABLE public._bi01_stash_submissions;
  END IF;
  IF to_regclass('public._bi01_stash_analytics_events') IS NOT NULL THEN
    INSERT INTO public.analytics_events SELECT * FROM public._bi01_stash_analytics_events;
    DROP TABLE public._bi01_stash_analytics_events;
  END IF;
END
$body$;
"""

_DOWNGRADE_UNPARTMAN_SQL = r"""
DO $body$
DECLARE
  tmpl text;
  pr RECORD;
  ch RECORD;
BEGIN
  IF to_regclass('public.part_config') IS NULL THEN
    RETURN;
  END IF;

  FOR pr IN
    SELECT parent_table::text AS pt
    FROM part_config
    WHERE parent_table IN ('public.submissions', 'public.analytics_events')
  LOOP
    SELECT template_table INTO tmpl FROM part_config WHERE parent_table = pr.pt;
    DELETE FROM part_config WHERE parent_table = pr.pt;

    IF tmpl IS NOT NULL THEN
      EXECUTE format('DROP TABLE IF EXISTS %s CASCADE', tmpl);
    END IF;

    FOR ch IN
      SELECT c.relname AS cname
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      JOIN pg_namespace n ON n.oid = p.relnamespace
      WHERE n.nspname = 'public'
        AND p.relname = split_part(pr.pt, '.', 2)
    LOOP
      EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', ch.cname);
    END LOOP;
  END LOOP;
END
$body$;
"""

_DOWNGRADE_RESTORE_DEFAULTS_SQL = r"""
DO $body$
BEGIN
  IF to_regclass('public.submissions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_inherits i
       JOIN pg_class c ON c.oid = i.inhrelid
       JOIN pg_class p ON p.oid = i.inhparent
       WHERE p.relname = 'submissions'
     )
  THEN
    EXECUTE 'CREATE TABLE submissions_default PARTITION OF submissions DEFAULT';
  END IF;

  IF to_regclass('public.analytics_events') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_inherits i
       JOIN pg_class c ON c.oid = i.inhrelid
       JOIN pg_class p ON p.oid = i.inhparent
       WHERE p.relname = 'analytics_events'
     )
  THEN
    EXECUTE 'CREATE TABLE analytics_events_default PARTITION OF analytics_events DEFAULT';
  END IF;
END
$body$;
"""


def upgrade() -> None:
    # One statement per execute — asyncpg cannot batch multiple SQL commands.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_partman")
    op.execute(_STASH_AND_DROP_DEFAULTS_SQL)
    op.execute(
        """
        SELECT public.create_parent(
          p_parent_table := 'public.submissions',
          p_control := 'created_at',
          p_interval := '1 month',
          p_type := 'range',
          p_premake := 3
        )
        """
    )
    op.execute(
        """
        SELECT public.create_parent(
          p_parent_table := 'public.analytics_events',
          p_control := 'created_at',
          p_interval := '1 month',
          p_type := 'range',
          p_premake := 4
        )
        """
    )
    op.execute(
        """
        UPDATE part_config
        SET
          retention = '90 days',
          retention_keep_table = FALSE
        WHERE parent_table = 'public.analytics_events'
        """
    )
    op.execute(_RESTORE_STASHED_ROWS_SQL)
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO forge_app"
    )
    op.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO forge_app")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public._bi01_stash_submissions")
    op.execute("DROP TABLE IF EXISTS public._bi01_stash_analytics_events")
    op.execute(_DOWNGRADE_UNPARTMAN_SQL)
    op.execute(_DOWNGRADE_RESTORE_DEFAULTS_SQL)
