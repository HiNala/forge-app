"""Jinja rendering for ComponentTree — deterministic HTML from catalog templates."""

from __future__ import annotations

import html as html_lib
import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.services.orchestration.component_lib.schema import ComponentNode, ComponentTree
from app.services.orchestration.planning_models import BrandTokens

_TEMPLATES = Path(__file__).resolve().parent / "templates"
_SHELL = Path(__file__).resolve().parent.parent / "components" / "shell.html"


def _template_file_for(component_name: str) -> str:
    candidate = _TEMPLATES / f"{component_name}.jinja.html"
    if candidate.is_file():
        return f"{component_name}.jinja.html"
    return "generic_semantic.jinja.html"


def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
    )


def _render_node(
    env: Environment,
    node: ComponentNode,
    brand: BrandTokens,
    *,
    form_action: str,
) -> str:
    tpl_name = _template_file_for(node.name)
    tpl = env.get_template(tpl_name)
    child_html: list[str] = []
    for ch in node.children:
        child_html.append(_render_node(env, ch, brand, form_action=form_action))
    return tpl.render(
        name=node.name,
        props=node.props,
        section_id=node.section_id,
        brand=brand,
        form_action=form_action,
        children_html="\n".join(child_html),
    )


def render_top_level_component(
    node: ComponentNode,
    brand: BrandTokens,
    *,
    form_action: str,
) -> str:
    """Render a single top-level section (for SSE streaming)."""
    return _render_node(_env(), node, brand, form_action=form_action)


def render_component_tree_body(
    tree: ComponentTree,
    brand: BrandTokens,
    *,
    form_action: str,
) -> str:
    """Render inner body HTML (sections only)."""
    env = _env()
    parts: list[str] = []
    for node in tree.components:
        parts.append(_render_node(env, node, brand, form_action=form_action))
    return "\n".join(parts)


def render_full_document(
    tree: ComponentTree,
    brand: BrandTokens,
    *,
    form_action: str,
) -> str:
    """Full HTML document using the Forge shell template."""
    body = render_component_tree_body(tree, brand, form_action=form_action)
    title = tree.page_title or "Page"
    primary = brand.primary if re.match(r"^#[0-9A-Fa-f]{3,8}$", brand.primary or "") else "#2563EB"
    secondary = brand.secondary if re.match(r"^#[0-9A-Fa-f]{3,8}$", brand.secondary or "") else "#0F172A"
    shell = _SHELL.read_text(encoding="utf-8")
    return (
        shell.replace("$title", html_lib.escape(title))
        .replace("$primary", primary)
        .replace("$secondary", secondary)
        .replace("$body", body)
    )


def extract_form_schema_hints(tree: ComponentTree) -> dict[str, object] | None:
    """Walk tree for form fields — best-effort for Page.form_schema."""
    fields: list[dict[str, object]] = []
    forge_booking: dict[str, object] | None = None

    def walk(n: ComponentNode) -> None:
        nonlocal forge_booking
        if n.name == "field_slot_picker":
            fb: dict[str, object] = {"enabled": True}
            dur = n.props.get("duration_minutes")
            if dur is not None:
                try:
                    fb["duration_minutes"] = int(dur)
                except (TypeError, ValueError):
                    fb["duration_minutes"] = 30
            else:
                fb["duration_minutes"] = 30
            cal = n.props.get("calendar_id")
            if cal:
                fb["calendar_id"] = str(cal)
            forge_booking = fb
        if n.name.startswith("field_"):
            ft = n.name.removeprefix("field_")
            fields.append(
                {
                    "name": str(n.props.get("name", "field")),
                    "label": str(n.props.get("label", "Field")),
                    "type": ft if ft in ("email", "tel", "textarea", "file") else "text",
                    "required": bool(n.props.get("required", False)),
                }
            )
        for c in n.children:
            walk(c)

    for n in tree.components:
        walk(n)
    if not fields and not forge_booking:
        return None
    out: dict[str, object] = {}
    if fields:
        out["fields"] = fields
    if forge_booking:
        out["forge_booking"] = forge_booking
    return out
