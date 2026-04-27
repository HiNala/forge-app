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
    # Link in bio (P-06)
    ComponentDef("link_in_bio_avatar_block", "link_in_bio", "Circular avatar, name, one-line bio"),
    ComponentDef("link_in_bio_link_card", "link_in_bio", "Full-width tappable destination link row"),
    ComponentDef("link_in_bio_social_row", "link_in_bio", "Row of small social / platform links"),
    ComponentDef("link_in_bio_featured_block", "link_in_bio", "Highlighted feature / latest item"),
    ComponentDef("link_in_bio_embed", "link_in_bio", "Spotify, YouTube, or newsletter embed (URL + title)"),
    ComponentDef("link_in_bio_subscribe_form", "link_in_bio", "Slim email capture block"),
    # Surveys
    ComponentDef("survey_step_container", "form", "Wrapper for a single multi-step screen"),
    ComponentDef("survey_progress_bar", "form", "Step X of Y progress indicator text"),
    ComponentDef("survey_step_navigation", "form", "Back / next controls (via CTAs)"),
    ComponentDef("survey_question_intro", "form", "Large question + helper copy"),
    ComponentDef("field_likert_scale", "field", "Satisfaction 1-5/1-10 as radio chips"),
    ComponentDef("field_emoji_rating", "field", "5 emoji options"),
    ComponentDef("field_ranking", "field", "Ordered list drag hint (static text)"),
    ComponentDef("field_matrix", "field", "Grid of the same options per row"),
    ComponentDef("field_open_ended_long", "field", "Large textarea for essays"),
    # Quiz
    ComponentDef("quiz_intro_screen", "content", "Quiz title, rules, CTA to start"),
    ComponentDef("quiz_question_screen", "form", "Question + 2-6 options"),
    ComponentDef("quiz_result_screen", "content", "Outcome narrative + CTA"),
    ComponentDef("quiz_score_screen", "content", "Score summary + review"),
    ComponentDef("field_quiz_image_choice", "field", "Image-style choices (use URLs if provided)"),
    # Coming soon
    ComponentDef("coming_soon_hero", "hero", "Launch title + tagline + countdown text"),
    ComponentDef("coming_soon_email_capture", "form", "Email + 'notify me' button"),
    ComponentDef("coming_soon_referral_block", "content", "Referral URL + position copy"),
    ComponentDef("coming_soon_features_preview", "content", "Three feature bullets for the launch"),
    ComponentDef("coming_soon_team_block", "content", "Team avatars and bios"),
    # Gallery extras
    ComponentDef("gallery_hero", "gallery", "Name + short bio for photography sites"),
    ComponentDef("gallery_lightbox", "gallery", "Note for lightbox behavior (static hint)"),
    ComponentDef("gallery_collection_header", "gallery", "Sub-gallery title + blurb"),
    ComponentDef("gallery_about_block", "content", "Longer bio, skills, proof"),
    ComponentDef("gallery_inquiry_form", "form", "Hire / book form"),
    # Resume
    ComponentDef("resume_hero", "content", "Name, role, headshot, contact icons"),
    ComponentDef("resume_summary_block", "content", "2-3 short paragraphs"),
    ComponentDef("resume_experience_card", "content", "Role with bullets"),
    ComponentDef("resume_skills_grid", "content", "Skill chips by category"),
    ComponentDef("resume_education_card", "content", "Degree / institution + dates"),
    ComponentDef("resume_certifications_block", "content", "List of credentials"),
    ComponentDef("resume_publications_list", "content", "Publications or talks"),
    ComponentDef("resume_projects_grid", "content", "Highlighted projects with links"),
    ComponentDef("resume_testimonial_block", "trust", "Short recommendation quote"),
    ComponentDef("resume_download_pdf_button", "cta", "CTA to download PDF (anchor)"),
    # Event extras
    ComponentDef("event_hero", "rsvp", "Event cover + key facts"),
    ComponentDef("event_details_card", "content", "What/when/where/dress code"),
    ComponentDef("event_rsvp_form", "form", "RSVP with yes/no/maybe and guests"),
    ComponentDef("event_count_indicator", "content", "Going / maybe counts (copy only)"),
    ComponentDef("event_map_embed", "content", "Map URL / address block"),
    ComponentDef("event_add_to_calendar", "cta", "Add to calendar CTA list"),
    # Menu extras
    ComponentDef("menu_section_header", "menu", "Large category label"),
    ComponentDef("menu_item_row", "menu", "Line item with price + dietary chips text"),
    ComponentDef("menu_item_card_image", "menu", "Menu line with image slot"),
    ComponentDef("menu_item_callout", "menu", "Highlight note for a dish"),
    ComponentDef("menu_legend_block", "menu", "Dietary legend"),
    ComponentDef("menu_specials_banner", "menu", "Rotating special text"),
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
