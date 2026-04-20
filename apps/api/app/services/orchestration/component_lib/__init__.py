"""Component catalog + Jinja rendering (Mission O-03)."""

from app.services.orchestration.component_lib.catalog import (
    COMPONENT_CATALOG,
    catalog_markdown_summary,
    component_names,
)
from app.services.orchestration.component_lib.render import (
    extract_form_schema_hints,
    render_full_document,
    render_top_level_component,
)
from app.services.orchestration.component_lib.schema import ComponentNode, ComponentTree, ProposalComponentTree

__all__ = [
    "COMPONENT_CATALOG",
    "catalog_markdown_summary",
    "component_names",
    "ComponentNode",
    "ComponentTree",
    "ProposalComponentTree",
    "extract_form_schema_hints",
    "render_full_document",
    "render_top_level_component",
]
