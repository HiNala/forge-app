"""Registered component vocabulary — Mission O-03.

Adding a component: append to ``COMPONENT_CATALOG``, add ``templates/{name}.jinja.html``
or rely on ``generic_semantic.html`` fallback in the renderer.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ComponentDef:
    name: str
    family: str
    description: str


# 40+ named components across families (IDs are stable API for LLM output).
COMPONENT_CATALOG: list[ComponentDef] = [
    # Heroes
    ComponentDef("hero_full_bleed", "hero", "Full-bleed hero with headline, subhead, optional media"),
    ComponentDef("hero_split", "hero", "Split layout: copy + visual"),
    ComponentDef("hero_centered_minimal", "hero", "Centered minimal hero — one idea"),
    ComponentDef("hero_with_media", "hero", "Hero with image or video slot"),
    # Content
    ComponentDef("paragraph_block", "content", "One or more paragraphs"),
    ComponentDef("bullet_block", "content", "Bulleted list with optional title"),
    ComponentDef("quote_pullout", "content", "Pull quote with attribution"),
    ComponentDef("numbered_steps", "content", "Ordered steps"),
    ComponentDef("definition_list", "content", "Term / definition pairs"),
    # Forms
    ComponentDef("form_stacked", "form", "Vertical stacked fields + submit"),
    ComponentDef("form_two_column", "form", "Two-column responsive form"),
    ComponentDef("form_inline", "form", "Compact inline controls"),
    ComponentDef("form_wizard", "form", "Multi-step wizard shell"),
    # Fields
    ComponentDef("field_text", "field", "Single-line text"),
    ComponentDef("field_email", "field", "Email input"),
    ComponentDef("field_phone", "field", "Tel / phone"),
    ComponentDef("field_textarea", "field", "Multi-line text"),
    ComponentDef("field_select", "field", "Dropdown"),
    ComponentDef("field_radio_chips", "field", "Radio as chips"),
    ComponentDef("field_checkbox_grid", "field", "Checkbox grid"),
    ComponentDef("field_file_upload", "field", "File upload"),
    ComponentDef("field_date", "field", "Date picker"),
    ComponentDef("field_time", "field", "Time picker"),
    ComponentDef("field_address", "field", "Address block"),
    ComponentDef("field_slot_picker", "field", "Booking slot picker (calendar context)"),
    # Trust
    ComponentDef("testimonial_card", "trust", "Single testimonial"),
    ComponentDef("testimonial_carousel", "trust", "Multiple testimonials"),
    ComponentDef("logo_wall", "trust", "Logo grid"),
    ComponentDef("rating_line", "trust", "Star rating + copy"),
    ComponentDef("license_badge", "trust", "License / certification badge"),
    ComponentDef("years_in_business_badge", "trust", "Years in business callout"),
    # CTA
    ComponentDef("cta_primary", "cta", "Primary button block"),
    ComponentDef("cta_button_with_subtext", "cta", "Button + supporting line"),
    ComponentDef("cta_two_options", "cta", "Two choices side by side"),
    ComponentDef("cta_full_width", "cta", "Full-width CTA strip"),
    # Pricing
    ComponentDef("price_card", "pricing", "Single price card"),
    ComponentDef("price_table", "pricing", "Comparison table"),
    ComponentDef("line_items_table", "pricing", "Line items with qty × rate"),
    ComponentDef("price_summary_block", "pricing", "Subtotal, tax, total"),
    # Proposal
    ComponentDef("proposal_cover", "proposal", "Cover: title, client, date, number"),
    ComponentDef("scope_phase_card", "proposal", "Scope phase with deliverables"),
    ComponentDef("terms_accordion", "proposal", "Terms in accordion sections"),
    ComponentDef("signature_block", "proposal", "Accept / sign area"),
    # Deck slides (layouts from W-03 narrative)
    ComponentDef("slide_title", "deck", "Title / cover slide"),
    ComponentDef("slide_bullets", "deck", "Bullet slide"),
    ComponentDef("slide_big_number", "deck", "Big metric slide"),
    ComponentDef("slide_chart", "deck", "Chart placeholder slide"),
    ComponentDef("slide_two_column", "deck", "Two-column slide"),
    ComponentDef("slide_closing", "deck", "Thank you / contact"),
    # Footer
    ComponentDef("footer_minimal", "footer", "Minimal footer"),
    ComponentDef("footer_with_contact", "footer", "Footer + contact"),
    ComponentDef("footer_legal", "footer", "Footer + legal links"),
    # Aliases / extras to reach catalog breadth
    ComponentDef("gallery_grid", "gallery", "Responsive image grid"),
    ComponentDef("promo_banner", "promotion", "Promotional strip"),
    ComponentDef("rsvp_header", "rsvp", "RSVP event header"),
    ComponentDef("menu_section", "menu", "Menu category + items"),
]


def catalog_markdown_summary() -> str:
    """Inject into composer system prompts (auto-generated section)."""
    lines = ["## Available components\n"]
    current_family = ""
    for c in COMPONENT_CATALOG:
        if c.family != current_family:
            current_family = c.family
            lines.append(f"\n### {current_family}\n")
        lines.append(f"- `{c.name}` — {c.description}\n")
    return "".join(lines)


def component_names() -> list[str]:
    return [c.name for c in COMPONENT_CATALOG]
