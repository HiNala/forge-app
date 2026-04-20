"""Mission O-03 — Jinja rendering."""

from app.services.orchestration.component_lib.render import render_full_document, render_top_level_component
from app.services.orchestration.component_lib.schema import ComponentNode, ComponentTree
from app.services.orchestration.planning_models import BrandTokens


def test_render_contact_like_tree() -> None:
    tree = ComponentTree(
        page_title="Contact",
        components=[
            ComponentNode(
                name="hero_split",
                props={"headline": "Hello", "subtitle": "Sub"},
                section_id="hero",
            ),
            ComponentNode(
                name="form_stacked",
                props={"submit_label": "Go"},
                section_id="form",
                children=[
                    ComponentNode(
                        name="field_email",
                        props={"name": "email", "label": "Email", "required": True},
                        section_id="e",
                    ),
                ],
            ),
            ComponentNode(name="footer_minimal", props={"footer_text": "X"}, section_id="foot"),
        ],
    )
    brand = BrandTokens(primary="#112233", secondary="#445566")
    html = render_full_document(tree, brand, form_action="/p/o/p/submit")
    assert "data-forge-section" in html
    assert "form" in html.lower()
    assert "email" in html.lower()


def test_render_top_level_fragment() -> None:
    node = ComponentNode(name="cta_primary", props={"text": "Book", "href": "#"}, section_id="cta")
    html = render_top_level_component(node, BrandTokens(), form_action="/x")
    assert "Book" in html
    assert 'data-forge-section="cta"' in html
