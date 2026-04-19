"""Narrative frameworks for pitch decks (W-03) — (layout, role, content_hint)."""

from __future__ import annotations

# fmt: off
SEQUOIA_PITCH = [
    ("title_cover", "title", "Company name + memorable tagline"),
    ("single_takeaway", "problem", "What pain are you solving—one crisp sentence"),
    ("single_takeaway", "why_now", "Why this market moment—regulation, behavior shift, cost curve"),
    ("single_takeaway", "solution", "What you do in one sentence; how it’s 10x better"),
    ("big_number", "market_size", "TAM / SAM / SOM in rounded, investor-readable numbers"),
    ("chart", "competition", "2x2 or positioning map; who's winning adjacent"),
    ("bullet_list", "product", "3–5 differentiators—features tied to outcomes"),
    ("three_column", "business_model", "How you charge; LTV/CAC intuition if known"),
    ("chart", "traction", "Revenue, users, or engagement—up‑and‑to‑the‑right"),
    ("team_grid", "team", "Founders + key hires; logos of prior wins"),
    ("single_takeaway", "ask", "Round size, use of funds, timeline"),
    ("closing", "close", "Contact + single next step"),
]

Y_COMBINATOR_PITCH = [
    ("title_cover", "title", "Company + one-line description"),
    ("single_takeaway", "problem", "Who has the pain and why incumbents fail"),
    ("single_takeaway", "solution", "What you built and why now"),
    ("big_number", "market", "Market you’ll dominate first"),
    ("bullet_list", "product", "What the product does today"),
    ("chart", "traction", "Growth proof—revenue or users"),
    ("single_takeaway", "business_model", "How you get paid"),
    ("team_grid", "team", "Why this team will win"),
    ("single_takeaway", "ask", "What you’re raising; milestones"),
    ("closing", "close", "Thanks + contact"),
]

NFX_PITCH = [
    ("title_cover", "title", "Company + network tagline"),
    ("single_takeaway", "network_effects", "Why your product gets stronger with scale"),
    ("single_takeaway", "problem", "Fragmentation you eliminate"),
    ("chart", "loops", "Flywheel or loop diagram narrative"),
    ("bullet_list", "product", "Core interactions that reinforce the network"),
    ("chart", "traction", "Liquidity, density, retention"),
    ("three_column", "moat", "Defensibility beyond features"),
    ("team_grid", "team", "Builders of networks"),
    ("single_takeaway", "ask", "Capital to accelerate loops"),
    ("closing", "close", "Close"),
]

PRODUCT_LAUNCH = [
    ("title_cover", "title", "Product name + launch theme"),
    ("section_header", "why_now", "Why customers care today"),
    ("single_takeaway", "hero_value", "Primary outcome for the buyer"),
    ("bullet_list", "features", "3–5 flagship capabilities"),
    ("image_with_caption", "product", "Hero visual story (image prompt)"),
    ("chart", "proof", "Beta metrics or waitlist"),
    ("timeline", "rollout", "Phased launch"),
    ("comparison_table", "alternatives", "You vs status quo"),
    ("single_takeaway", "cta", "How to get started"),
    ("closing", "close", "Thank you"),
]

INTERNAL_STRATEGY = [
    ("title_cover", "title", "Strategy title + period"),
    ("section_header", "context", "Market & company snapshot"),
    ("single_takeaway", "priority", "North star for the half"),
    ("bullet_list", "bets", "3–5 strategic bets"),
    ("timeline", "roadmap", "Key milestones"),
    ("four_quadrant", "portfolio", "Initiatives by impact / effort"),
    ("chart", "metrics", "Operating metrics trend"),
    ("process_flow", "execution", "How work flows"),
    ("closing", "close", "Q&A"),
]

ALL_HANDS = [
    ("title_cover", "title", "Quarter + theme"),
    ("big_number", "headline_metric", "One headline result"),
    ("bullet_list", "wins", "What went well"),
    ("bullet_list", "lessons", "What we learned"),
    ("section_header", "outlook", "Priorities ahead"),
    ("team_grid", "spotlights", "People shout-outs"),
    ("closing", "close", "How to contribute"),
]

SALES_PITCH = [
    ("title_cover", "title", "Value prop title"),
    ("single_takeaway", "pain", "Buyer pain in their words"),
    ("bullet_list", "solution", "How you solve it"),
    ("comparison_table", "vs_alternatives", "Why you vs DIY / competitor"),
    ("chart", "roi", "Quantified value"),
    ("process_flow", "onboarding", "How rollout works"),
    ("quote", "proof", "Customer quote"),
    ("single_takeaway", "commercial", "Packages / next step"),
    ("closing", "close", "Contact"),
]

CONFERENCE_TALK = [
    ("title_cover", "title", "Talk title + speaker"),
    ("section_header", "agenda", "What you'll learn"),
    ("single_takeaway", "thesis", "Core argument"),
    ("bullet_list", "pillars", "3 pillars of evidence"),
    ("chart", "data", "Supporting data story"),
    ("quote", "perspective", "Expert or user perspective"),
    ("timeline", "history", "How we got here"),
    ("closing", "close", "Takeaways + social"),
]

TEACHING_LECTURE = [
    ("title_cover", "title", "Lesson title"),
    ("section_header", "objectives", "Learning outcomes"),
    ("single_takeaway", "concept", "Core concept"),
    ("bullet_list", "detail", "Key points"),
    ("process_flow", "method", "Step-by-step"),
    ("chart", "example", "Illustrative data"),
    ("quote", "reading", "Further reading"),
    ("closing", "close", "Summary"),
]

BEFORE_AFTER_BRIDGE = [
    ("title_cover", "title", "Transformation story"),
    ("section_header", "before", "Old world pain"),
    ("section_header", "after", "New world outcome"),
    ("section_header", "bridge", "How you bridge the gap"),
    ("bullet_list", "proof", "Evidence"),
    ("closing", "close", "Invitation"),
]

GENERIC_10 = [
    ("title_cover", "title", "Deck title"),
    ("single_takeaway", "point1", "First key idea"),
    ("single_takeaway", "point2", "Second key idea"),
    ("bullet_list", "details", "Supporting bullets"),
    ("chart", "data", "Data slide"),
    ("quote", "quote", "Memorable quote"),
    ("image_full", "visual", "Hero visual"),
    ("timeline", "plan", "Plan over time"),
    ("single_takeaway", "summary", "Recap"),
    ("closing", "close", "Next steps"),
]

# Shorter variants / aliases used by template gallery seeds
INVESTOR_CLASSIC_10 = [
    ("title_cover", "title", "Company"),
    ("single_takeaway", "problem", "Problem"),
    ("single_takeaway", "solution", "Solution"),
    ("big_number", "market", "Market sizing"),
    ("bullet_list", "product", "Product"),
    ("chart", "traction", "Traction"),
    ("three_column", "model", "Business model"),
    ("team_grid", "team", "Team"),
    ("single_takeaway", "financials", "Financial snapshot"),
    ("closing", "close", "Ask + contact"),
]

SEED_INVESTOR = [
    ("title_cover", "title", "Company"),
    ("single_takeaway", "insight", "Insight / founder story"),
    ("single_takeaway", "problem", "Pain"),
    ("single_takeaway", "solution", "Wedge solution"),
    ("bullet_list", "traction", "Early traction"),
    ("team_grid", "team", "Why this team"),
    ("chart", "market", "Market sketch"),
    ("single_takeaway", "ask", "Ask"),
    ("closing", "close", "Contact"),
]

PRODUCT_LAUNCH_B = PRODUCT_LAUNCH
PRODUCT_LAUNCH_C = PRODUCT_LAUNCH

QBR_ROADMAP = [
    ("title_cover", "title", "Quarterly business review"),
    ("big_number", "kpi", "Headline KPI"),
    ("bullet_list", "highlights", "Highlights"),
    ("bullet_list", "misses", "Gaps / misses"),
    ("timeline", "roadmap", "Roadmap"),
    ("four_quadrant", "priorities", "Prioritization"),
    ("closing", "close", "Next quarter focus"),
]

SALES_ENTERPRISE = [
    ("title_cover", "title", "Enterprise value"),
    ("single_takeaway", "context", "Customer context"),
    ("bullet_list", "capabilities", "Capabilities"),
    ("comparison_table", "vendors", "Landscape"),
    ("bullet_list", "security", "Security & compliance"),
    ("process_flow", "rollout", "Rollout"),
    ("quote", "reference", "Reference"),
    ("closing", "close", "Commercial next step"),
]

FRAMEWORKS: dict[str, list[tuple[str, str, str]]] = {
    "SEQUOIA_PITCH": SEQUOIA_PITCH,
    "Y_COMBINATOR_PITCH": Y_COMBINATOR_PITCH,
    "NFX_PITCH": NFX_PITCH,
    "PRODUCT_LAUNCH": PRODUCT_LAUNCH,
    "INTERNAL_STRATEGY": INTERNAL_STRATEGY,
    "ALL_HANDS": ALL_HANDS,
    "SALES_PITCH": SALES_PITCH,
    "CONFERENCE_TALK": CONFERENCE_TALK,
    "TEACHING_LECTURE": TEACHING_LECTURE,
    "BEFORE_AFTER_BRIDGE": BEFORE_AFTER_BRIDGE,
    "GENERIC_10": GENERIC_10,
    "INVESTOR_CLASSIC_10": INVESTOR_CLASSIC_10,
    "SEED_INVESTOR": SEED_INVESTOR,
    "PRODUCT_LAUNCH_B": PRODUCT_LAUNCH_B,
    "PRODUCT_LAUNCH_C": PRODUCT_LAUNCH_C,
    "QBR_ROADMAP": QBR_ROADMAP,
    "SALES_ENTERPRISE": SALES_ENTERPRISE,
}

DEFAULT_FRAMEWORK_KEY = "GENERIC_10"


def resolve_framework_key(name: str | None) -> str:
    """Map API/intent name to a defined framework; fall back to generic."""
    if not name:
        return DEFAULT_FRAMEWORK_KEY
    k = name.strip().upper().replace(" ", "_")
    if k in FRAMEWORKS:
        return k
    # Common synonyms
    aliases = {
        "YC": "Y_COMBINATOR_PITCH",
        "Y_COMBINATOR": "Y_COMBINATOR_PITCH",
        "SEQUOIA": "SEQUOIA_PITCH",
        "NFX": "NFX_PITCH",
        "INTERNAL": "INTERNAL_STRATEGY",
        "ALLHANDS": "ALL_HANDS",
        "SALES": "SALES_PITCH",
        "CONFERENCE": "CONFERENCE_TALK",
        "TEACHING": "TEACHING_LECTURE",
        "BAB": "BEFORE_AFTER_BRIDGE",
    }
    return aliases.get(k, DEFAULT_FRAMEWORK_KEY)
