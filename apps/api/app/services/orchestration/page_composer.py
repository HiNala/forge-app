"""Template assembly — Mission 03 Phase 4."""

from __future__ import annotations

import html as html_lib
import json
import logging
import re
from pathlib import Path
from string import Template

from app.services.orchestration.models import AssemblyPlan, PageIntent, SectionPlan

logger = logging.getLogger(__name__)

_COMPONENTS = Path(__file__).resolve().parent / "components"


def _read(name: str) -> str:
    p = _COMPONENTS / f"{name}.html"
    if not p.is_file():
        raise FileNotFoundError(name)
    return p.read_text(encoding="utf-8")


def _escape(s: str) -> str:
    return html_lib.escape(s, quote=True)


def _render_form_fields(fields: list[dict]) -> str:
    parts: list[str] = []
    for f in fields:
        name = str(f.get("name", "field"))
        label = str(f.get("label", name))
        ft = str(f.get("type", f.get("field_type", "text")))
        req = bool(f.get("required", False))
        req_attr = " required" if req else ""
        fid = _escape(name)
        flab = _escape(label)
        if ft == "textarea":
            parts.append(
                f'<label>{flab}<textarea name="{fid}" rows="4"{req_attr}></textarea></label>'
            )
        else:
            inp = "email" if ft == "email" else "tel" if ft == "tel" else "text"
            parts.append(
                f'<label>{flab}<input type="{inp}" name="{fid}"{req_attr} /></label>'
            )
    return "\n".join(parts)


def _sid(raw: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_-]", "", raw)
    return s or "section"


def render_section(sec: SectionPlan, *, form_action: str, section_id: str) -> str:
    props = {k: str(v) if not isinstance(v, (list, dict)) else v for k, v in sec.props.items()}
    name = sec.component
    sid = _sid(section_id)

    if name == "hero-centered":
        t = _read("hero-centered")
        return Template(t).substitute(
            section_id=sid,
            headline=_escape(str(props.get("headline", "Hello"))),
            subhead=_escape(str(props.get("subhead", ""))),
        )

    if name == "form-vertical":
        t = _read("form-vertical")
        raw_fields = props.get("fields")
        if isinstance(raw_fields, str):
            try:
                raw_fields = json.loads(raw_fields)
            except json.JSONDecodeError:
                raw_fields = []
        if not isinstance(raw_fields, list):
            raw_fields = []
        fields_html = _render_form_fields(raw_fields)
        return Template(t).substitute(
            section_id=sid,
            form_action=_escape(form_action),
            fields_html=fields_html,
            submit_label=_escape(str(props.get("submit_label", "Submit"))),
        )

    if name == "cta-bar":
        t = _read("cta-bar")
        return Template(t).substitute(
            section_id=sid,
            text=_escape(str(props.get("text", "Questions? Call us."))),
            phone=_escape(str(props.get("phone", "")).replace("tel:", "")),
        )

    if name == "footer-minimal":
        t = _read("footer-minimal")
        return Template(t).substitute(
            section_id=sid,
            footer_text=_escape(str(props.get("footer_text", "Built with Forge"))),
        )

    if name == "proposal-accept-decline":
        t = _read("proposal-accept-decline.html")
        return Template(t).substitute(
            section_id=sid,
            accept_label=_escape(str(props.get("accept_label", "Accept"))),
            decline_label=_escape(str(props.get("decline_label", "Decline"))),
        )

    logger.warning("unknown_component %s", name)
    return f'<!-- unknown component: {html_lib.escape(name)} -->'


def assemble_html(
    plan: AssemblyPlan,
    *,
    title: str,
    slug: str,
    primary: str,
    secondary: str,
) -> str:
    form_action = f"/p/{slug}/submit"
    parts: list[str] = []
    for i, sec in enumerate(plan.sections):
        sid = f"{sec.component}-{i}"
        parts.append(render_section(sec, form_action=form_action, section_id=sid))
    body = "\n".join(parts)
    shell = _read("shell")
    theme = plan.theme or {}
    primary_c = str(theme.get("primary", primary))
    secondary_c = str(theme.get("secondary", secondary))
    if not re.match(r"^#[0-9A-Fa-f]{3,8}$", primary_c):
        primary_c = primary
    if not re.match(r"^#[0-9A-Fa-f]{3,8}$", secondary_c):
        secondary_c = secondary
    # String replace (not Template) so section HTML cannot inject extra $ placeholders.
    return (
        shell.replace("$title", _escape(title))
        .replace("$primary", primary_c)
        .replace("$secondary", secondary_c)
        .replace("$body", body)
    )


def apply_plan_constraints(intent: PageIntent, plan: AssemblyPlan) -> AssemblyPlan:
    """Ensure required components exist for page_type (Mission 03)."""
    secs = list(plan.sections)
    names = [s.component for s in secs]

    if intent.page_type in ("booking-form", "contact-form", "rsvp") and not any(
        n.startswith("form") for n in names
    ):
        fl: list[dict] = []
        if intent.fields:
            fl = [
                {
                    "name": f.name,
                    "label": f.label,
                    "type": f.field_type,
                    "required": f.required,
                }
                for f in intent.fields
            ]
        else:
            fl = [
                {"name": "name", "label": "Name", "type": "text", "required": True},
                {"name": "email", "label": "Email", "type": "email", "required": True},
            ]
        insert_at = 1 if secs else 0
        secs.insert(
            insert_at,
            SectionPlan(
                component="form-vertical",
                props={"fields": fl, "submit_label": "Submit"},
            ),
        )

    names = [s.component for s in secs]
    if intent.page_type == "proposal" and "proposal-accept-decline" not in names:
        secs.append(
            SectionPlan(
                component="proposal-accept-decline",
                props={"accept_label": "Accept proposal", "decline_label": "Decline"},
            )
        )

    return AssemblyPlan(theme=plan.theme, sections=secs)


def default_assembly_plan(intent: PageIntent) -> AssemblyPlan:
    sub = f"A {intent.tone} page — {intent.title_suggestion}"
    sections: list[SectionPlan] = [
        SectionPlan(
            component="hero-centered",
            props={"headline": intent.title_suggestion, "subhead": sub},
        ),
    ]
    if intent.fields:
        fl = [
            {
                "name": f.name,
                "label": f.label,
                "type": f.field_type,
                "required": f.required,
            }
            for f in intent.fields
        ]
        sections.append(
            SectionPlan(
                component="form-vertical",
                props={"fields": fl, "submit_label": "Submit"},
            )
        )
    sections.append(
        SectionPlan(
            component="footer-minimal",
            props={"footer_text": "Built with Forge"},
        )
    )
    primary = "#2563EB"
    if intent.brand_overrides and "primary" in intent.brand_overrides:
        primary = str(intent.brand_overrides["primary"])
    return AssemblyPlan(theme={"primary": primary, "mood": intent.tone}, sections=sections)
