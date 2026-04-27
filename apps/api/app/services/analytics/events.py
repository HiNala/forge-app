"""Authoritative analytics event taxonomy (GL-01). New types require a DB migration."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal

Scope = Literal["public", "authenticated", "both"]


@dataclass(frozen=True)
class EventDefinition:
    name: str
    category: str
    scope: Scope
    required_properties: list[str]
    optional_properties: list[str]
    description: str


def _rows() -> list[tuple[str, str, Scope, list[str], list[str], str]]:
    """(name, category, scope, required, optional, description)."""
    p_page = ["page_id"]
    p_page_opt = [
        "referrer",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
    ]
    traffic_opt = p_page_opt + [
        "duration_ms",
        "section_id",
        "dwell_ms",
        "scroll_pct",
        "target",
        "url",
        "media_id",
    ]
    form_opt = [
        "field_id",
        "field",
        "error_code",
        "status",
    ] + p_page_opt
    studio_opt = ["page_id", "section_id", "provider", "setting_name", "target_plan"]
    return [
        # Traffic
        ("page_view", "traffic", "public", p_page, traffic_opt, "Initial render of a published page."),
        (
            "page_leave",
            "traffic",
            "public",
            p_page,
            traffic_opt + ["duration_ms"],
            "Visitor left the page (beforeunload).",
        ),
        ("section_dwell", "traffic", "public", p_page, traffic_opt, "Section visible ≥3s (IntersectionObserver)."),
        ("section_exit", "traffic", "public", p_page, traffic_opt, "Section left viewport; time-in-section."),
        ("scroll_depth", "traffic", "public", p_page, traffic_opt, "Scroll milestone 25/50/75/100."),
        ("click", "traffic", "public", p_page, traffic_opt + ["element_id"], "Tracked data-forge-track click."),
        ("cta_click", "traffic", "public", p_page, traffic_opt, "CTA click."),
        ("media_play", "traffic", "public", p_page, traffic_opt, "Embedded media play."),
        ("media_pause", "traffic", "public", p_page, traffic_opt, "Embedded media pause."),
        ("media_complete", "traffic", "public", p_page, traffic_opt, "Embedded media completed."),
        ("outbound_link", "traffic", "public", p_page, traffic_opt + ["url"], "External link click."),
        (
            "link_click",
            "traffic",
            "public",
            p_page,
            traffic_opt + ["url", "link_label", "link_id"],
            "Explicit link-in-bio / tracked link tap (data-forge-analytics).",
        ),
        (
            "menu_item_view",
            "traffic",
            "public",
            p_page,
            traffic_opt + ["item_id", "item_name", "section_id"],
            "Menu item focused, expanded, or highlighted.",
        ),
        # Forms
        ("form_view", "form", "public", p_page, form_opt, "Form entered viewport."),
        ("form_start", "form", "public", p_page, form_opt, "First field focus."),
        ("form_field_focus", "form", "public", p_page + ["field_id"], form_opt, "Field focused (deduped per session)."),
        ("form_field_touch", "form", "public", p_page + ["field_id"], form_opt, "User typed ≥1 char in field."),
        ("form_field_blur_valid", "form", "public", p_page + ["field_id"], form_opt, "Blur with valid value."),
        (
            "form_field_blur_invalid",
            "form",
            "public",
            p_page + ["field_id"],
            form_opt + ["error_code"],
            "Blur with validation error.",
        ),
        (
            "form_field_abandon",
            "form",
            "public",
            p_page + ["field_id"],
            form_opt,
            "Touched field not completed on abandon.",
        ),
        ("form_submit_attempt", "form", "public", p_page, form_opt, "Submit clicked."),
        (
            "form_submit_success",
            "form",
            "public",
            p_page,
            form_opt + ["submission_id"],
            "Server accepted submission (2xx).",
        ),
        ("form_submit_error", "form", "public", p_page, form_opt, "Submit failed (4xx/5xx)."),
        ("form_abandon", "form", "public", p_page, form_opt, "Left without submit after ≥5s on form."),
        (
            "rsvp_submit",
            "form",
            "public",
            p_page,
            form_opt + ["submission_id", "response"],
            "RSVP response recorded (alias semantics on top of form success).",
        ),
        (
            "survey_step_complete",
            "form",
            "public",
            p_page,
            form_opt + ["step_index", "step_id", "question_id"],
            "Visitor advanced one step in a multi-step survey.",
        ),
        (
            "quiz_complete",
            "form",
            "public",
            p_page,
            form_opt + ["outcome", "score", "total"],
            "Quiz finished; outcome id or score summary.",
        ),
        # Booking
        ("slot_picker_view", "booking", "public", p_page, form_opt, "Booking slot picker shown."),
        ("slot_picker_date_navigate", "booking", "public", p_page, form_opt + ["date"], "Date changed in picker."),
        ("slot_hover", "booking", "public", p_page, form_opt + ["slot_id"], "Hovered slot ≥500ms."),
        ("slot_click", "booking", "public", p_page, form_opt + ["slot_id"], "Slot selected."),
        ("slot_hold_created", "booking", "both", p_page, form_opt + ["hold_id"], "Hold created server-side."),
        ("slot_hold_expired", "booking", "both", p_page, form_opt, "Hold expired."),
        ("slot_released", "booking", "public", p_page, form_opt, "User cancelled slot selection."),
        # Proposal
        ("proposal_view", "proposal", "public", p_page, form_opt, "Proposal opened."),
        (
            "proposal_section_view",
            "proposal",
            "public",
            p_page + ["section_id"],
            form_opt,
            "Proposal section in viewport.",
        ),
        ("proposal_question_submit", "proposal", "public", p_page, form_opt, "Inline Q&A submitted."),
        ("proposal_accept_click", "proposal", "public", p_page, form_opt, "Accept button clicked."),
        ("proposal_accept_success", "proposal", "both", p_page, form_opt, "Proposal signed successfully."),
        ("proposal_decline", "proposal", "public", p_page, form_opt, "Declined."),
        ("proposal_print", "proposal", "public", p_page, form_opt, "Print dialog."),
        ("proposal_download", "proposal", "public", p_page, form_opt, "Download action."),
        # Deck
        ("deck_view", "deck", "public", p_page, form_opt, "Deck scroll mode."),
        (
            "slide_view",
            "deck",
            "public",
            p_page + ["slide_id"],
            form_opt + ["slide_index"],
            "Slide scrolled into view.",
        ),
        ("slide_dwell", "deck", "public", p_page + ["slide_id"], form_opt + ["dwell_ms"], "≥3s on slide."),
        ("present_start", "deck", "public", p_page, form_opt, "Presenter / fullscreen mode."),
        ("present_slide_view", "deck", "public", p_page + ["slide_id"], form_opt, "Slide in present mode."),
        (
            "present_slide_dwell",
            "deck",
            "public",
            p_page + ["slide_id"],
            form_opt + ["dwell_ms"],
            "Dwell in present mode.",
        ),
        ("present_end", "deck", "public", p_page, form_opt + ["reason"], "Exited present mode."),
        ("deck_export_click", "deck", "public", p_page, form_opt + ["format"], "Export PDF/PPTX/Slides."),
        # Studio & in-app
        ("studio_prompt_submit", "studio", "authenticated", [], studio_opt + ["prompt_len"], "Prompt sent in Studio."),
        ("studio_workflow_selected", "studio", "authenticated", [], studio_opt + ["workflow"], "Workflow chip."),
        ("studio_section_edit_open", "studio", "authenticated", [], studio_opt, "Section editor opened."),
        ("studio_section_edit_submit", "studio", "authenticated", [], studio_opt, "Section edit saved."),
        ("studio_refine_chip_click", "studio", "authenticated", [], studio_opt + ["chip"], "Refine chip."),
        ("studio_provider_switch", "studio", "authenticated", [], studio_opt, "LLM provider switch."),
        (
            "studio_preview_viewport_change",
            "studio",
            "authenticated",
            [],
            studio_opt + ["viewport"],
            "Preview viewport.",
        ),
        ("studio_revision_open", "studio", "authenticated", [], studio_opt + ["revision_id"], "Revision opened."),
        ("studio_revision_restore", "studio", "authenticated", [], studio_opt + ["revision_id"], "Revision restored."),
        ("page_publish_click", "studio", "authenticated", ["page_id"], studio_opt, "Publish clicked."),
        ("page_publish_success", "studio", "authenticated", ["page_id"], studio_opt, "Publish succeeded."),
        ("page_unpublish", "studio", "authenticated", ["page_id"], studio_opt, "Unpublished."),
        ("page_delete", "studio", "authenticated", ["page_id"], studio_opt, "Page deleted."),
        ("page_duplicate", "studio", "authenticated", ["page_id"], studio_opt, "Duplicated."),
        (
            "dashboard_view",
            "studio",
            "authenticated",
            [],
            studio_opt + ["route"],
            "App shell / dashboard route viewed (SPA navigation; optional route string).",
        ),
        ("dashboard_filter_change", "studio", "authenticated", [], studio_opt + ["filter"], "Dashboard filter."),
        ("dashboard_search", "studio", "authenticated", [], studio_opt + ["query"], "Dashboard search."),
        ("page_detail_view", "studio", "authenticated", ["page_id"], studio_opt, "Page detail viewed."),
        ("submissions_tab_open", "studio", "authenticated", ["page_id"], studio_opt, "Submissions tab."),
        (
            "submission_reply_send",
            "studio",
            "authenticated",
            ["page_id"],
            studio_opt + ["submission_id"],
            "Reply sent.",
        ),
        ("template_use_click", "studio", "authenticated", [], studio_opt + ["template_id"], "Template chosen."),
        (
            "export_initiated",
            "studio",
            "authenticated",
            ["page_id"],
            studio_opt + ["format", "workflow"],
            "Unified export run started (P-07).",
        ),
        (
            "export_completed",
            "studio",
            "authenticated",
            ["page_id"],
            studio_opt + ["format", "workflow"],
            "Unified export finished successfully.",
        ),
        (
            "export_failed",
            "studio",
            "authenticated",
            ["page_id"],
            studio_opt + ["format", "workflow", "error_code"],
            "Unified export failed or was rejected.",
        ),
        ("integration_connect", "studio", "authenticated", [], studio_opt + ["provider"], "Integration OAuth start."),
        ("settings_change", "studio", "authenticated", [], studio_opt + ["setting_name"], "Settings changed."),
        # Lifecycle
        ("signup_start", "lifecycle", "authenticated", [], studio_opt, "Onboarding viewed."),
        ("signup_complete", "lifecycle", "authenticated", [], studio_opt, "Signup finished."),
        ("onboarding_step_complete", "lifecycle", "authenticated", [], studio_opt + ["step"], "Onboarding step."),
        ("first_page_created", "lifecycle", "authenticated", ["page_id"], studio_opt, "First page created."),
        ("first_page_published", "lifecycle", "authenticated", ["page_id"], studio_opt, "First publish."),
        (
            "first_submission_received",
            "lifecycle",
            "authenticated",
            ["page_id"],
            studio_opt,
            "First inbound submission.",
        ),
        ("first_proposal_accepted", "lifecycle", "authenticated", ["page_id"], studio_opt, "First proposal accepted."),
        ("plan_upgrade_click", "lifecycle", "authenticated", [], studio_opt + ["target_plan"], "Upgrade click."),
        ("plan_upgrade_success", "lifecycle", "authenticated", [], studio_opt + ["plan"], "Upgrade succeeded."),
        ("plan_downgrade", "lifecycle", "authenticated", [], studio_opt, "Downgrade."),
        ("plan_cancel", "lifecycle", "authenticated", [], studio_opt, "Subscription cancelled."),
        ("billing_portal_open", "lifecycle", "authenticated", [], studio_opt, "Stripe portal opened."),
        ("trial_ended", "lifecycle", "authenticated", [], studio_opt, "Trial ended."),
        ("invitation_sent", "lifecycle", "authenticated", [], studio_opt + ["email"], "Invite sent."),
        ("invitation_accepted", "lifecycle", "authenticated", [], studio_opt, "Invite accepted."),
        # Quota & errors
        ("quota_warning_view", "error", "authenticated", [], studio_opt + ["metric", "percent"], "Quota warning UI."),
        ("quota_exceeded_view", "error", "authenticated", [], studio_opt + ["metric"], "Quota exceeded UI."),
        (
            "error_boundary_caught",
            "error",
            "authenticated",
            [],
            studio_opt + ["component", "error_code"],
            "React error boundary.",
        ),
        (
            "api_error_surfaced",
            "error",
            "authenticated",
            [],
            studio_opt + ["endpoint", "status", "code"],
            "API error toast.",
        ),
        # Identity stitching
        (
            "identity_merge",
            "lifecycle",
            "both",
            ["visitor_id", "user_id"],
            ["reason"],
            "Links anonymous visitor_id to authenticated user_id.",
        ),
    ]


EVENTS: dict[str, EventDefinition] = {
    name: EventDefinition(
        name=name,
        category=cat,
        scope=scope,
        required_properties=req,
        optional_properties=opt,
        description=desc,
    )
    for name, cat, scope, req, opt, desc in _rows()
}

_CUSTOM_RE = re.compile(r"^custom\.[a-z0-9][a-z0-9_.-]*$", re.IGNORECASE)


def is_valid_event_type(name: str, *, custom_names: frozenset[str] | None = None) -> bool:
    if name in EVENTS:
        return True
    if _CUSTOM_RE.match(name):
        return custom_names is None or name in custom_names
    return False


def validate_event_payload(
    event_type: str,
    metadata: dict[str, Any] | None,
    *,
    custom_names: frozenset[str] | None = None,
) -> tuple[bool, str | None]:
    """Return (ok, error_message)."""
    if not is_valid_event_type(event_type, custom_names=custom_names):
        return False, f"Unknown or disallowed event_type: {event_type}"
    # Custom events: required props enforced via custom_names + separate lookup (empty here).
    req = EVENTS[event_type].required_properties if event_type in EVENTS else []
    md = metadata or {}
    for k in req:
        if k not in md or md[k] is None:
            return False, f"Missing required metadata property: {k}"
    return True, None
