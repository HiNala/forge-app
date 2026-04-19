"""Curated template definitions for Mission 09 — imported by ``scripts/seed_templates.py``.

Each HTML uses ``template_finalize`` placeholders: ``__ORG_SLUG__``, ``__PAGE_SLUG__``,
``$title``, ``$primary``, ``$secondary``, and shell tokens matching ``components/shell.html``.
"""

from __future__ import annotations

from typing import Any

_SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>$title</title>
  <style>
    :root {{
      --brand-primary: $primary;
      --brand-secondary: $secondary;
      --brand-text: #111827;
      --brand-bg: #fafafa;
    }}
    body {{ font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0;
      color: var(--brand-text); background: var(--brand-bg); line-height: 1.5; }}
    .forge-hero {{ padding: 3rem 1.5rem;
      background: linear-gradient(135deg, var(--brand-primary)22, transparent); }}
    .forge-hero h1 {{ margin: 0 0 0.5rem; font-size: 2rem; }}
    .forge-sub {{ opacity: 0.9; margin: 0; }}
    .forge-form {{ padding: 1.5rem; max-width: 40rem; margin: 0 auto; }}
    .forge-form-inner label {{ display: block; margin-bottom: 1rem; }}
    .forge-form-inner input, .forge-form-inner textarea, .forge-form-inner select {{
      width: 100%; box-sizing: border-box; padding: 0.5rem; margin-top: 0.25rem; }}
    .forge-submit {{ margin-top: 1rem; padding: 0.6rem 1.2rem; background: var(--brand-primary);
      color: #fff; border: none; border-radius: 6px; cursor: pointer; }}
    .forge-grid {{ display: grid; gap: 1rem; max-width: 56rem; margin: 0 auto; padding: 1.5rem; }}
    .forge-card {{ border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background: #fff; }}
    .forge-muted {{ color: #4b5563; font-size: 0.95rem; }}
    .forge-footer {{ padding: 1rem; text-align: center; font-size: 0.875rem; opacity: 0.8; }}
  </style>
</head>
<body>
{body}
</body>
</html>"""


def _pack(title: str, inner_body: str) -> str:
    raw = _SHELL.format(body=inner_body)
    return (
        raw.replace("$title", title)
        .replace("$primary", "#2563EB")
        .replace("$secondary", "#64748B")
    )


def _form_block(
    headline: str,
    sub: str,
    fields: list[tuple[str, str, str]],
    submit: str = "Submit",
) -> str:
    rows = []
    for name, label, typ in fields:
        req = " required" if name in ("email", "phone", "name") else ""
        if typ == "textarea":
            rows.append(
                f'<label>{label}<textarea name="{name}" rows="3"{req}></textarea></label>'
            )
        elif typ == "select":
            opts = "<option>Choose…</option><option>Option A</option><option>Option B</option>"
            rows.append(f'<label>{label}<select name="{name}"{req}>{opts}</select></label>')
        else:
            inp = "email" if typ == "email" else "tel" if typ == "tel" else "date" if typ == "date" else "text"
            rows.append(f'<label>{label}<input type="{inp}" name="{name}"{req} /></label>')
    fields_html = "\n".join(rows)
    return f"""
<section class="forge-hero">
  <h1>{headline}</h1>
  <p class="forge-sub">{sub}</p>
</section>
<section class="forge-form">
  <form class="forge-form-inner" method="post" action="/p/__ORG_SLUG__/__PAGE_SLUG__/submit">
    {fields_html}
    <button class="forge-submit" type="submit">{submit}</button>
  </form>
</section>
<section class="forge-footer">Built with Forge</section>
"""


def _landing(headline: str, sub: str, cta: str) -> str:
    return f"""
<section class="forge-hero">
  <h1>{headline}</h1>
  <p class="forge-sub">{sub}</p>
</section>
<section class="forge-form">
  <form class="forge-form-inner" method="post" action="/p/__ORG_SLUG__/__PAGE_SLUG__/submit">
    <label>Email<input type="email" name="email" required /></label>
    <label>Full name<input type="text" name="name" required /></label>
    <button class="forge-submit" type="submit">{cta}</button>
  </form>
</section>
<section class="forge-footer">Built with Forge</section>
"""


def _menu(headline: str, items: list[str]) -> str:
    lis = "\n".join(f"<li>{x}</li>" for x in items)
    return f"""
<section class="forge-hero"><h1>{headline}</h1><p class="forge-sub">Updated weekly</p></section>
<section class="forge-grid">
  <div class="forge-card"><h2>Featured</h2><ul>{lis}</ul></div>
  <div class="forge-card"><h2>Notes</h2><p class="forge-muted">Ask about allergens.</p></div>
</section>
<section class="forge-form">
  <form class="forge-form-inner" method="post" action="/p/__ORG_SLUG__/__PAGE_SLUG__/submit">
    <label>Party size<input type="number" name="party" min="1" /></label>
    <label>Date<input type="date" name="date" /></label>
    <button class="forge-submit" type="submit">Request a table</button>
  </form>
</section>
<section class="forge-footer">Built with Forge</section>
"""


def _gallery(headline: str, caption: str) -> str:
    return f"""
<section class="forge-hero"><h1>{headline}</h1><p class="forge-sub">{caption}</p></section>
<section class="forge-grid">
  <div class="forge-card"><p class="forge-muted">Gallery slot A — drop your best image in Studio.</p></div>
  <div class="forge-card"><p class="forge-muted">Gallery slot B</p></div>
  <div class="forge-card"><p class="forge-muted">Gallery slot C</p></div>
</section>
<section class="forge-form">
  <form class="forge-form-inner" method="post" action="/p/__ORG_SLUG__/__PAGE_SLUG__/submit">
    <label>Email<input type="email" name="email" required /></label>
    <label>Message<textarea name="message" rows="3"></textarea></label>
    <button class="forge-submit" type="submit">Inquire</button>
  </form>
</section>
<section class="forge-footer">Built with Forge</section>
"""


def _proposal(headline: str, scope: str) -> str:
    return f"""
<section class="forge-hero"><h1>{headline}</h1><p class="forge-sub">{scope}</p></section>
<section class="forge-grid">
  <div class="forge-card"><h2>Deliverables</h2><p class="forge-muted">Timeline, milestones, and revision rounds.</p></div>
  <div class="forge-card"><h2>Investment</h2><p class="forge-muted">Detailed in your proposal PDF.</p></div>
</section>
<section class="forge-form">
  <form class="forge-form-inner" method="post" action="/p/__ORG_SLUG__/__PAGE_SLUG__/submit">
    <label>Name<input type="text" name="name" required /></label>
    <label>Email<input type="email" name="email" required /></label>
    <label>Decision notes<textarea name="notes" rows="3"></textarea></label>
    <button class="forge-submit" type="submit">Record response</button>
  </form>
</section>
<section class="forge-footer">Built with Forge</section>
"""


def _promo(headline: str, sub: str) -> str:
    return _landing(headline, sub, "Get the offer")


def _booking(headline: str, sub: str) -> str:
    return _form_block(
        headline,
        sub,
        [
            ("name", "Full name", "text"),
            ("email", "Email", "email"),
            ("phone", "Phone", "tel"),
            ("slot", "Preferred time window", "text"),
        ],
        "Book",
    )


# slug, name, description, category, page_type, html_builder
_RAW: list[tuple[str, str, str, str, str, Any]] = [
    (
        "contractor-small-jobs",
        "Contractor Small Jobs Form",
        "Capture scope, budget range, and photos for quick residential fixes.",
        "forms",
        "contact-form",
        _form_block(
            "Small jobs intake",
            "Tell us what broke — we reply with a ballpark within one business day.",
            [
                ("name", "Name", "text"),
                ("phone", "Phone", "tel"),
                ("address", "Job address", "text"),
                ("details", "Describe the work", "textarea"),
            ],
        ),
    ),
    (
        "event-rsvp",
        "Event RSVP",
        "Meal choice, allergies, and guest count for company events.",
        "forms",
        "rsvp",
        _form_block(
            "You are invited",
            "Help us plan seating and catering.",
            [
                ("name", "Full name", "text"),
                ("email", "Work email", "email"),
                ("guests", "Additional guests", "text"),
                ("meal", "Meal preference", "select"),
            ],
            "RSVP",
        ),
    ),
    (
        "tutoring-inquiry",
        "Tutoring Inquiry",
        "Subject, grade level, and weekly availability for academic coaching.",
        "forms",
        "contact-form",
        _form_block(
            "Tutoring request",
            "We match students with vetted tutors within 48 hours.",
            [
                ("parent", "Parent / guardian name", "text"),
                ("email", "Email", "email"),
                ("student", "Student grade", "text"),
                ("subject", "Subject focus", "text"),
            ],
        ),
    ),
    (
        "photography-consultation",
        "Photography Consultation",
        "Session type, location, and creative direction for shoots.",
        "forms",
        "contact-form",
        _form_block(
            "Plan your shoot",
            "Share mood boards or Pinterest links in the notes field.",
            [
                ("name", "Name", "text"),
                ("email", "Email", "email"),
                ("date", "Preferred date", "date"),
                ("notes", "Creative direction", "textarea"),
            ],
        ),
    ),
    (
        "restaurant-reservation",
        "Restaurant Reservation",
        "Party size, seating preference, and occasion notes.",
        "forms",
        "booking-form",
        _form_block(
            "Reserve a table",
            "We confirm by SMS when your slot is locked in.",
            [
                ("name", "Name", "text"),
                ("phone", "Phone", "tel"),
                ("party", "Party size", "text"),
                ("datetime", "Preferred date & time", "text"),
            ],
            "Request",
        ),
    ),
    (
        "auto-repair-estimate",
        "Auto Repair Estimate",
        "Vehicle, mileage, and symptoms for service writers.",
        "forms",
        "contact-form",
        _form_block(
            "Service intake",
            "Upload photos at pickup — this gets the bay ready.",
            [
                ("name", "Name", "text"),
                ("phone", "Phone", "tel"),
                ("vehicle", "Year make model", "text"),
                ("issue", "What are you noticing?", "textarea"),
            ],
        ),
    ),
    (
        "daycare-enrollment",
        "Daycare Enrollment",
        "Child age, schedule, and emergency contacts.",
        "forms",
        "contact-form",
        _form_block(
            "Enrollment inquiry",
            "We will send handbook and immunization checklist.",
            [
                ("parent", "Parent name", "text"),
                ("email", "Email", "email"),
                ("child", "Child age", "text"),
                ("schedule", "Desired schedule", "textarea"),
            ],
        ),
    ),
    (
        "lawn-care-request",
        "Lawn Care Request",
        "Lot size, services, and gate codes for crews.",
        "forms",
        "contact-form",
        _form_block(
            "Request a quote",
            "Weekly mowing, fertilization, and seasonal cleanups.",
            [
                ("name", "Name", "text"),
                ("address", "Property address", "text"),
                ("phone", "Phone", "tel"),
                ("services", "Services needed", "textarea"),
            ],
        ),
    ),
    (
        "freelance-design-proposal",
        "Freelance Design Proposal",
        "Brand refresh with discovery, concepts, and handoff.",
        "proposals",
        "proposal",
        _proposal(
            "Design engagement",
            "Two concept rounds, component library, and async reviews.",
        ),
    ),
    (
        "construction-project-bid",
        "Construction Project Bid",
        "GC-ready scope summary with schedule milestones.",
        "proposals",
        "proposal",
        _proposal(
            "Project bid overview",
            "Mobilization, inspections, and contingency assumptions.",
        ),
    ),
    (
        "marketing-services-proposal",
        "Marketing Services Proposal",
        "Retainer scope with channel mix and reporting cadence.",
        "proposals",
        "proposal",
        _proposal(
            "Marketing proposal",
            "Paid social, lifecycle email, and weekly performance snapshots.",
        ),
    ),
    (
        "coaching-package-proposal",
        "Coaching Package Proposal",
        "Session cadence, outcomes, and accountability checkpoints.",
        "proposals",
        "proposal",
        _proposal(
            "Coaching package",
            "Six sessions, async check-ins, and shared goal tracker.",
        ),
    ),
    (
        "product-launch",
        "Product Launch",
        "Hero, value props, and a single waitlist form.",
        "landing",
        "landing",
        _landing(
            "Ship something people want",
            "Join the waitlist — founders get early pricing.",
            "Join waitlist",
        ),
    ),
    (
        "waitlist-landing",
        "Waitlist",
        "Minimal capture for upcoming drops.",
        "landing",
        "landing",
        _landing(
            "Get notified",
            "We never spam — one email on launch day.",
            "Notify me",
        ),
    ),
    (
        "event-registration",
        "Event Registration",
        "Workshop signup with seat limits.",
        "landing",
        "landing",
        _landing(
            "Save your seat",
            "Hands-on lab — laptops provided.",
            "Register",
        ),
    ),
    (
        "course-enrollment",
        "Course Enrollment",
            "Cohort start date and experience level.",
        "landing",
        "landing",
        _landing(
            "Join the cohort",
            "Live sessions plus async projects.",
            "Apply",
        ),
    ),
    (
        "podcast-episode",
        "Podcast Episode",
            "Episode summary with subscribe CTA.",
        "landing",
        "landing",
        _landing(
            "Listen & subscribe",
            "New episodes every Tuesday.",
            "Subscribe",
        ),
    ),
    (
        "newsletter-signup",
        "Newsletter Signup",
            "Weekly insights with one-click unsubscribe.",
        "landing",
        "landing",
        _landing(
            "The Forge Field Notes",
            "Templates, launches, and ops tips.",
            "Subscribe",
        ),
    ),
    (
        "coffee-shop-menu",
        "Coffee Shop Menu",
        "Espresso classics and seasonal drinks.",
        "menus",
        "menu",
        _menu(
            "Northside Coffee",
            [
                "Espresso — $3.50",
                "Oat latte — $5.25",
                "Seasonal pour-over — $4.75",
            ],
        ),
    ),
    (
        "food-truck-menu",
        "Food Truck Menu",
        "Rotating tacos and sides for events.",
        "menus",
        "menu",
        _menu(
            "Rolling Kitchen",
            [
                "Carnitas taco — $4",
                "Veggie bowl — $11",
                "Agua fresca — $3",
            ],
        ),
    ),
    (
        "prix-fixe-dinner",
        "Prix Fixe Dinner",
        "Chef’s tasting with optional wine pairing notes.",
        "menus",
        "menu",
        _menu(
            "Four-course evening",
            [
                "Amuse",
                "Chilled starter",
                "Main event",
                "Dessert",
            ],
        ),
    ),
    (
        "photography-portfolio",
        "Photography Portfolio",
        "Portfolio grid with inquiry form.",
        "galleries",
        "landing",
        _gallery(
            "Moments in light",
            "Weddings and editorial — travel available.",
        ),
    ),
    (
        "art-show",
        "Art Show",
        "Opening night details with RSVP.",
        "galleries",
        "landing",
        _gallery(
            "Winter salon",
            "Limited capacity — RSVP required.",
        ),
    ),
    (
        "real-estate-listing",
        "Real Estate Listing",
        "Property highlights with showing requests.",
        "galleries",
        "landing",
        _gallery(
            "Bright 3BR walkable to transit",
            "Open houses Saturday & Sunday.",
        ),
    ),
    (
        "wedding-rsvp",
        "Wedding RSVP",
        "Meal choice and song requests.",
        "events",
        "rsvp",
        _form_block(
            "Together forever",
            "We can’t wait to celebrate with you.",
            [
                ("name", "Guest name", "text"),
                ("email", "Email", "email"),
                ("meal", "Meal preference", "select"),
                ("song", "Song request", "text"),
            ],
            "RSVP",
        ),
    ),
    (
        "workplace-event",
        "Workplace Event",
        "All-hands RSVP with dietary needs.",
        "events",
        "rsvp",
        _form_block(
            "All-hands + lunch",
            "Please respond by Friday for catering.",
            [
                ("name", "Name", "text"),
                ("email", "Email", "email"),
                ("diet", "Dietary needs", "textarea"),
            ],
            "Confirm",
        ),
    ),
    (
        "holiday-sale",
        "Holiday Sale",
            "Limited-time banner with offer capture.",
        "promotions",
        "landing",
        _promo(
            "Holiday savings",
            "20% off bundles through New Year’s — online & in-store.",
        ),
    ),
    (
        "flash-discount",
        "Flash Discount",
            "Urgent CTA with countdown copy.",
        "promotions",
        "landing",
        _promo(
            "24-hour flash",
            "Use code FORGE24 at checkout.",
        ),
    ),
    (
        "consultation-slot",
        "Consultation Slot",
            "Pick a time window for a strategy call.",
        "booking",
        "booking-form",
        _booking(
            "Book a consultation",
            "30-minute Zoom — agenda sent after booking.",
        ),
    ),
    (
        "studio-time",
        "Studio Time",
            "Reserve recording or rehearsal blocks.",
        "booking",
        "booking-form",
        _booking(
            "Reserve studio time",
            "Engineer on duty for evening slots.",
        ),
    ),
    (
        "workshop-signup",
        "Workshop Signup",
            "Hands-on class with materials fee.",
        "booking",
        "booking-form",
        _booking(
            "Workshop signup",
            "Materials included — bring a laptop.",
        ),
    ),
    (
        "tour-booking",
        "Tour Booking",
            "Facility tours for prospects and partners.",
        "booking",
        "booking-form",
        _booking(
            "Schedule a tour",
            "We host small groups weekdays at 10am and 2pm.",
        ),
    ),
]


def curated_templates() -> list[dict[str, Any]]:
    """Return rows ready for ``Template`` upsert."""
    out: list[dict[str, Any]] = []
    for i, (slug, name, desc, cat, ptype, fragment) in enumerate(_RAW):
        html = _pack(name, fragment)
        out.append(
            {
                "slug": slug,
                "name": name,
                "description": desc,
                "category": cat,
                "html": html,
                "form_schema": {
                    "fields": [
                        {"name": "email", "label": "Email", "type": "email", "required": True},
                    ]
                },
                "intent_json": {"page_type": ptype, "source": "seed_mission09"},
                "is_published": True,
                "sort_order": i * 10,
            }
        )
    return out
