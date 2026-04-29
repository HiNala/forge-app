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


_GOOGLE_FONTS_FAMILIES: dict[str, str] = {
    # Display fonts
    "playfair display": "Playfair+Display:wght@400;600;700",
    "playfair": "Playfair+Display:wght@400;600;700",
    "merriweather": "Merriweather:wght@400;700",
    "lora": "Lora:wght@400;600;700",
    "cormorant": "Cormorant+Garamond:wght@400;600;700",
    "dm serif": "DM+Serif+Display",
    "dm serif display": "DM+Serif+Display",
    "libre baskerville": "Libre+Baskerville:wght@400;700",
    # Sans-serif
    "inter": "Inter:wght@400;500;600;700",
    "geist": "Geist:wght@400;500;600;700",
    "outfit": "Outfit:wght@400;500;600;700",
    "plus jakarta sans": "Plus+Jakarta+Sans:wght@400;500;600;700",
    "dm sans": "DM+Sans:wght@400;500;600;700",
    "figtree": "Figtree:wght@400;500;600;700",
    "nunito": "Nunito:wght@400;500;600;700",
    "poppins": "Poppins:wght@400;500;600;700",
    "raleway": "Raleway:wght@400;500;600;700",
    "space grotesk": "Space+Grotesk:wght@400;500;600;700",
    "josefin sans": "Josefin+Sans:wght@400;600;700",
    # Mono
    "jetbrains mono": "JetBrains+Mono:wght@400;500",
    "ibm plex mono": "IBM+Plex+Mono:wght@400;500",
}

_FONT_CSS_VAR_FALLBACK = "system-ui, -apple-system, sans-serif"
_SERIF_FALLBACK = "Georgia, 'Times New Roman', serif"


def _fonts_link(brand: BrandTokens) -> str:
    """Build Google Fonts <link> tag for brand fonts, with Inter as base."""
    families: list[str] = []
    # Always include Inter as the body font baseline
    base_inter = "Inter:wght@400;500;600;700"
    families.append(base_inter)

    seen: set[str] = {base_inter}

    def _add(name: str | None) -> None:
        if not name:
            return
        key = name.lower().strip()
        spec = _GOOGLE_FONTS_FAMILIES.get(key)
        if spec and spec not in seen:
            families.append(spec)
            seen.add(spec)

    _add(brand.display_font)
    _add(brand.body_font)

    families_param = "&".join(f"family={f}" for f in families)
    url = f"https://fonts.googleapis.com/css2?{families_param}&display=swap"
    return f'<link href="{url}" rel="stylesheet">'


def _font_css_overrides(brand: BrandTokens) -> str:
    """CSS variable overrides for brand fonts."""
    lines: list[str] = []
    if brand.display_font:
        key = brand.display_font.lower().strip()
        gf_name = brand.display_font  # use as-is for CSS font-family
        # Check if it's a serif font for fallback
        serif_keys = {"playfair", "merriweather", "lora", "cormorant", "dm serif", "libre baskerville"}
        fallback = _SERIF_FALLBACK if any(k in key for k in serif_keys) else _FONT_CSS_VAR_FALLBACK
        lines.append(f"  --font-display: '{gf_name}', {fallback};")
    if brand.body_font:
        key = brand.body_font.lower().strip()
        serif_keys = {"playfair", "merriweather", "lora", "cormorant", "dm serif", "libre baskerville"}
        fallback = _SERIF_FALLBACK if any(k in key for k in serif_keys) else _FONT_CSS_VAR_FALLBACK
        lines.append(f"  --font-body: '{brand.body_font}', {fallback};")
    if not lines:
        return ""
    return "\n    :root {\n" + "\n".join(lines) + "\n    }"


def render_full_document(
    tree: ComponentTree,
    brand: BrandTokens,
    *,
    form_action: str,
    visual_dir: str = "warm",
) -> str:
    """Full HTML document using the GlideDesign shell template."""
    body = render_component_tree_body(tree, brand, form_action=form_action)
    title = tree.page_title or "Page"
    primary = brand.primary if re.match(r"^#[0-9A-Fa-f]{3,8}$", brand.primary or "") else "#2563EB"
    secondary = brand.secondary if re.match(r"^#[0-9A-Fa-f]{3,8}$", brand.secondary or "") else "#0F172A"

    # Build font link + optional CSS overrides
    fonts_html = _fonts_link(brand)
    font_override_css = _font_css_overrides(brand)
    if font_override_css:
        fonts_html += f"\n  <style>{font_override_css}\n  </style>"

    # Sanitize visual_dir to a known value
    valid_dirs = {"warm", "minimal", "bold", "playful", "formal"}
    vdir = visual_dir if visual_dir in valid_dirs else "warm"

    shell = _SHELL.read_text(encoding="utf-8")
    return (
        shell.replace("$title", html_lib.escape(title))
        .replace("$primary", primary)
        .replace("$secondary", secondary)
        .replace("$fonts_link", fonts_html)
        .replace("$visual_dir", vdir)
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
