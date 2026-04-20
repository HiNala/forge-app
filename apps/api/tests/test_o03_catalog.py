"""Mission O-03 — component catalog size."""

from app.services.orchestration.component_lib.catalog import COMPONENT_CATALOG, catalog_markdown_summary, component_names


def test_at_least_forty_components() -> None:
    assert len(COMPONENT_CATALOG) >= 40


def test_catalog_summary_non_empty() -> None:
    s = catalog_markdown_summary()
    assert "hero_full_bleed" in s
    assert len(s) > 200


def test_unique_names() -> None:
    names = component_names()
    assert len(names) == len(set(names))
