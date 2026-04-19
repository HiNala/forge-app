"""Idempotent upsert of curated templates (Mission 09, BI-01 YAML fixtures).

Usage::

    cd apps/api && uv run python scripts/seed_templates.py

Loads ``apps/api/fixtures/templates/*.yml`` (one file per template), then merges
``app.seed_templates_data.curated_templates()`` for any slugs not overridden by YAML.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

import yaml
from sqlalchemy import select

from app.db.models import Template
from app.db.session import AsyncSessionLocal
from app.seed_templates_data import curated_templates

_FIXTURE_DIR = Path(__file__).resolve().parent.parent / "fixtures" / "templates"
_TEMPLATE_KEYS = frozenset(c.key for c in Template.__table__.columns)


def _only_template_columns(row: dict[str, object]) -> dict[str, object]:
    return {k: v for k, v in row.items() if k in _TEMPLATE_KEYS}


def _fixture_rows() -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    if not _FIXTURE_DIR.is_dir():
        return rows
    for path in sorted(_FIXTURE_DIR.glob("*.yml")):
        raw = path.read_text(encoding="utf-8")
        row = yaml.safe_load(raw)
        if isinstance(row, dict):
            rows.append(row)
    return rows


async def main() -> None:
    by_slug: dict[str, dict[str, object]] = {}
    for row in curated_templates():
        clean = _only_template_columns(row)
        by_slug[str(clean["slug"])] = clean
    for row in _fixture_rows():
        clean = _only_template_columns(row)
        by_slug[str(clean["slug"])] = clean
    rows = list(by_slug.values())

    async with AsyncSessionLocal() as session:
        for row in rows:
            slug = str(row["slug"])
            payload = _only_template_columns(row)
            existing = (
                await session.execute(select(Template).where(Template.slug == slug))
            ).scalar_one_or_none()
            if existing is None:
                session.add(Template(**payload))
            else:
                for k, v in payload.items():
                    setattr(existing, k, v)
        await session.commit()
        print(f"seed_templates: upserted {len(rows)} templates ({len(_fixture_rows())} from YAML).")


if __name__ == "__main__":
    asyncio.run(main())
