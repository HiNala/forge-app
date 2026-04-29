"""Region tree diff — AL-03."""

from __future__ import annotations

from app.services.orchestration.component_tree_diff import diff_component_trees, validate_region_edit


def test_diff_reports_modified_leaf() -> None:
    orig = {"root": {"title": {"text": "A"}}}
    refined = {"root": {"title": {"text": "B"}}}
    diff = diff_component_trees(orig, refined)
    assert diff.modified and diff.modified[0][0].endswith("text")


def test_element_scope_blocks_out_of_tree_changes() -> None:
    tree = {"screen": [{"id": "hero", "title": {"text": "Stay"}}]}
    refined = dict(tree)
    refined["footer"] = {"note": {"text": "x"}}
    v = validate_region_edit(tree, refined, scope="element", element_ref="hero")
    assert len(v) >= 1


def test_element_scope_allows_subtree_updates() -> None:
    tree = {"panel": [{"id": "cta", "label": {"text": "Book"}}]}
    refined = {"panel": [{"id": "cta", "label": {"text": "Reserve"}}]}
    v = validate_region_edit(tree, refined, scope="element", element_ref="cta")
    assert v == []
