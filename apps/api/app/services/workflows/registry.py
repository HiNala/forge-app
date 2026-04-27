"""Single source of truth for user-facing workflow metadata — Mission P-06.

Composer classes live in ``orchestration.composer``; this module holds display + routing hints
for API, Studio, and marketing. Keys match ``WorkflowPlanType`` / query params where applicable.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class WorkflowDefinition:
    slug: str
    display_name: str
    description: str
    category: str
    icon: str
    page_type: str | None
    """Stored ``pages.page_type`` when a page-backed workflow; None for canvas-only (mobile, website)."""
    composer_key: str
    credits_per_generation: int = 3
    comparison_alternative: str = ""
    export_formats: tuple[str, ...] = (
        "hosted",
        "html_static",
        "submissions_csv",
        "webhook_snippet",
        "domain_handoff_txt",
    )
    studio_path: str = "/studio"
    """In-app path; canvas workflows use /studio/mobile and /studio/web."""


# Four rows × four tiles: pages & sites · forms & gathering · sales & business · personal & social
WORKFLOW_REGISTRY: dict[str, WorkflowDefinition] = {
    "web_page": WorkflowDefinition(
        slug="web_page",
        display_name="Web page",
        description="A focused public web page for one offer, story, or CTA.",
        category="pages_sites",
        icon="file",
        page_type="landing",
        composer_key="landing",
        export_formats=(
            "hosted",
            "html_static",
            "html_zip",
            "nextjs_project",
            "framer_json",
            "webflow_json",
            "vercel_deploy",
            "submissions_csv",
            "webhook_snippet",
            "domain_handoff_txt",
        ),
        comparison_alternative="Carrd, Framer, Webflow (single page)",
    ),
    "website": WorkflowDefinition(
        slug="website",
        display_name="Website",
        description="Multi-page site structure on the web canvas (IA + responsive).",
        category="pages_sites",
        icon="layout",
        page_type=None,
        composer_key="generic",
        studio_path="/studio/web",
        export_formats=(
            "figma",
            "html_zip",
            "nextjs_project",
            "framer_json",
            "webflow_json",
            "vercel_deploy",
            "hosted",
            "webhook_snippet",
            "domain_handoff_txt",
        ),
        comparison_alternative="Squarespace, Webflow, Framer",
    ),
    "landing": WorkflowDefinition(
        slug="landing",
        display_name="Landing page",
        description="One-page marketing for launches, signups, and promos.",
        category="pages_sites",
        icon="rocket",
        page_type="landing",
        composer_key="landing",
        export_formats=(
            "hosted",
            "html_static",
            "html_zip",
            "nextjs_project",
            "framer_json",
            "webflow_json",
            "vercel_deploy",
            "submissions_csv",
            "webhook_snippet",
            "domain_handoff_txt",
        ),
        comparison_alternative="Unbounce, Leadpages, Webflow",
    ),
    "coming_soon": WorkflowDefinition(
        slug="coming_soon",
        display_name="Coming soon",
        description="Waitlist, countdown, and pre-launch capture.",
        category="pages_sites",
        icon="timer",
        page_type="coming_soon",
        composer_key="coming_soon",
        export_formats=(
            "hosted",
            "html_static",
            "html_zip",
            "vercel_deploy",
            "waitlist_csv",
            "webhook_snippet",
            "domain_handoff_txt",
        ),
        comparison_alternative="Carrd waitlists, Mailchimp LPs, Webflow",
    ),
    "contact_form": WorkflowDefinition(
        slug="contact_form",
        display_name="Contact / booking",
        description="Leads, quotes, and optional time booking.",
        category="forms_gathering",
        icon="mail",
        page_type="contact-form",
        composer_key="contact_form",
        export_formats=(
            "hosted",
            "html_static",
            "submissions_csv",
            "embed_iframe",
            "embed_script",
            "webhook_snippet",
            "qr_png",
            "domain_handoff_txt",
        ),
        comparison_alternative="Typeform, Tally, Calendly (booking)",
    ),
    "survey": WorkflowDefinition(
        slug="survey",
        display_name="Survey",
        description="NPS, feedback, and multi-question research flows.",
        category="forms_gathering",
        icon="bar-chart",
        page_type="survey",
        composer_key="survey",
        export_formats=(
            "hosted",
            "html_static",
            "submissions_csv",
            "embed_iframe",
            "typeform_json",
            "webhook_snippet",
            "domain_handoff_txt",
        ),
        comparison_alternative="Typeform, Google Forms, SurveyMonkey",
    ),
    "quiz": WorkflowDefinition(
        slug="quiz",
        display_name="Quiz",
        description="Outcomes, recommendations, and scored knowledge checks.",
        category="forms_gathering",
        icon="help-circle",
        page_type="quiz",
        composer_key="quiz",
        export_formats=(
            "hosted",
            "html_static",
            "submissions_csv",
            "embed_iframe",
            "quiz_interactive_html",
            "typeform_json",
            "webhook_snippet",
            "domain_handoff_txt",
        ),
        comparison_alternative="Outgrow, Interact, Typeform logic",
    ),
    "event_rsvp": WorkflowDefinition(
        slug="event_rsvp",
        display_name="Event RSVP",
        description="Invites, headcount, and guest questions.",
        category="forms_gathering",
        icon="calendar-check",
        page_type="rsvp",
        composer_key="event_rsvp",
        export_formats=(
            "hosted",
            "html_static",
            "submissions_csv",
            "embed_iframe",
            "ics_event",
            "webhook_snippet",
            "domain_handoff_txt",
        ),
        comparison_alternative="Partiful, Paperless Post, Eventbrite",
    ),
    "proposal": WorkflowDefinition(
        slug="proposal",
        display_name="Proposal",
        description="Scoping, pricing tables, and accept/decline.",
        category="sales_business",
        icon="file-text",
        page_type="proposal",
        composer_key="proposal",
        credits_per_generation=5,
        export_formats=(
            "pdf_signed",
            "pdf_unsigned",
            "html_static",
            "docx",
            "google_doc",
            "email_html",
            "hosted",
            "domain_handoff_txt",
        ),
        comparison_alternative="PandaDoc, Proposify, PDF templates",
    ),
    "pitch_deck": WorkflowDefinition(
        slug="pitch_deck",
        display_name="Pitch deck",
        description="Slide narratives for investors and customers.",
        category="sales_business",
        icon="presentation",
        page_type="pitch_deck",
        composer_key="generic",
        credits_per_generation=6,
        export_formats=(
            "pptx",
            "pdf",
            "google_slides",
            "keynote",
            "slide_png_zip",
            "speaker_notes",
            "hosted",
            "domain_handoff_txt",
        ),
        comparison_alternative="Pitch, Google Slides, Figma",
    ),
    "menu": WorkflowDefinition(
        slug="menu",
        display_name="Menu / services",
        description="Restaurants, salons, and service list menus made scannable on phones.",
        category="sales_business",
        icon="utensils",
        page_type="menu",
        composer_key="menu",
        export_formats=(
            "html_static",
            "html_zip",
            "print_pdf",
            "qr_png",
            "menu_xlsx",
            "hosted",
            "domain_handoff_txt",
        ),
        comparison_alternative="Toast, Square, Instagram PDF menus",
    ),
    "gallery": WorkflowDefinition(
        slug="gallery",
        display_name="Gallery / portfolio",
        description="Image-forward showcase with inquiry and proof.",
        category="sales_business",
        icon="image",
        page_type="gallery",
        composer_key="gallery",
        export_formats=(
            "html_static",
            "html_zip",
            "submissions_csv",
            "gallery_images_zip",
            "webhook_snippet",
            "hosted",
            "domain_handoff_txt",
        ),
        comparison_alternative="Squarespace, Format, Adobe Portfolio",
    ),
    "link_in_bio": WorkflowDefinition(
        slug="link_in_bio",
        display_name="Link in bio",
        description="One mini-page of links, media, and capture for your profile.",
        category="personal_social",
        icon="link",
        page_type="link_in_bio",
        composer_key="link_in_bio",
        export_formats=(
            "html_static",
            "html_zip",
            "submissions_csv",
            "webhook_snippet",
            "qr_png",
            "hosted",
            "domain_handoff_txt",
        ),
        comparison_alternative="Linktree, Beacons, Stan",
    ),
    "resume": WorkflowDefinition(
        slug="resume",
        display_name="Resume / personal site",
        description="A modern resume page that reads on every device.",
        category="personal_social",
        icon="user",
        page_type="resume",
        composer_key="resume",
        export_formats=(
            "pdf",
            "docx",
            "json_resume",
            "html_static",
            "html_zip",
            "hosted",
            "domain_handoff_txt",
        ),
        comparison_alternative="Notion, About.me, Squarespace",
    ),
    "mobile_app": WorkflowDefinition(
        slug="mobile_app",
        display_name="Mobile app",
        description="iOS-style screens and flows in Studio.",
        category="personal_social",
        icon="smartphone",
        page_type=None,
        composer_key="generic",
        studio_path="/studio/mobile",
        export_formats=(
            "figma",
            "expo_project",
            "html_prototype",
            "png_screens",
            "lottie",
            "domain_handoff_txt",
        ),
        comparison_alternative="Figma, Playground AI",
    ),
}


def all_workflow_definitions() -> list[WorkflowDefinition]:
    return list(WORKFLOW_REGISTRY.values())


def get_workflow_definition(key: str) -> WorkflowDefinition | None:
    return WORKFLOW_REGISTRY.get(key)


def registry_public_dicts() -> list[dict[str, Any]]:
    """JSON-serializable rows for any future /workflows API."""
    return [
        {
            "key": k,
            "display_name": v.display_name,
            "description": v.description,
            "category": v.category,
            "icon": v.icon,
            "page_type": v.page_type,
            "studio_path": v.studio_path,
            "credits_per_generation": v.credits_per_generation,
            "export_formats": list(v.export_formats),
        }
        for k, v in WORKFLOW_REGISTRY.items()
    ]
