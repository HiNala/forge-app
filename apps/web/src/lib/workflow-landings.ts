import type { Metadata } from "next";

export const WORKFLOW_SLUGS = [
  "mobile-app",
  "website",
  "contact-form",
  "proposal",
  "pitch-deck",
  "landing-page",
] as const;

export type WorkflowSlug = (typeof WORKFLOW_SLUGS)[number];

export type WorkflowLandingContent = {
  slug: WorkflowSlug;
  path: string;
  meta: { title: string; description: string };
  label: string;
  tileLabel: string;
  /** Short line for hero rotator. */
  heroHighlight: string;
  workflowQuery: string;
  sectionLabel: string;
  h1: string;
  h1Accent: string;
  intro: string;
  whatYouGet: { title: string; body: string }[];
  howItWorks: { title: string; steps: [string, string, string] };
  builtFor: { title: string; who: [string, string, string] };
  exampleGallery: { caption: string; tag?: string }[];
  faq: { q: string; a: string }[];
  compare: {
    vs: string;
    honest: { forge: string; other: string }[];
  };
  templatesQuery?: string;
};

const commonExport =
  "Take it with you: export paths depend on the workflow (HTML, PDF, PPTX, or design handoff as we ship V2). Or keep it on Forge — hosted, tracked, updatable in one place.";

export const WORKFLOW_LANDINGS: Record<WorkflowSlug, WorkflowLandingContent> = {
  "mobile-app": {
    slug: "mobile-app",
    path: "/workflows/mobile-app",
    meta: {
      title: "AI mobile app design tool — screens from a prompt | Forge",
      description:
        "Design mobile app screens by describing them. Prototype fast, refine by area, export when you are ready. An AI mini-app builder for product teams and founders.",
    },
    label: "Mobile app design",
    tileLabel: "Mobile app",
    heroHighlight: "Mobile screens you can describe, refine, and hand off — without living in a design tool all day.",
    workflowQuery: "mobile_app",
    sectionLabel: "Mobile app screens",
    h1: "Design mobile app screens",
    h1Accent: "by describing them.",
    intro:
      "No blank canvas standoff. Tell Forge what the screen is for, iterate in Studio, and export to your stack or design workflow when the concept is right.",
    whatYouGet: [
      { title: "On-brand layouts fast", body: "Start from a short brief — login, list, settings, checkout — and get a credible first pass you can refine." },
      { title: "Refine the part you mean", body: "Click a region and direct changes there so you are not rewriting the whole screen every time." },
      { title: "Export on your terms", body: "Hand off to Figma or code paths as we complete V2 exports — the hosted preview stays on Forge for reviews." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Describe the flow or screen in one or two sentences.",
        "Review the generated screen in Studio; refine by section when something feels off.",
        "Share a link for feedback, track engagement, and export when you are ready to implement.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Founders validating an idea before hiring design",
        "PMs and operators who need a believable visual for a team meeting",
        "Designers who want a first cut to react to, not a blank frame",
      ],
    },
    exampleGallery: [
      { caption: "Contractor job intake — iOS", tag: "Form" },
      { caption: "Café order status — list + detail", tag: "Commerce" },
      { caption: "Studio booking — time picker", tag: "Scheduling" },
    ],
    faq: [
      { q: "Is this a full mobile app builder?", a: "No — Forge targets screens and small flows for speed and handoff, not a native app backend." },
      { q: "Do I need design skills?", a: "You need a point of view on what the screen should do. Forge handles structure and a sensible first layout." },
      { q: "What about Android vs iOS?", a: "You can steer the look in prompts; platform-specific export is part of the ongoing canvas roadmap (V2-P02/P03)." },
      { q: "Can I replace Figma for production UI?", a: "Figma is still the system-of-record for deep design work. Forge wins when you would rather describe than draw the first pass." },
    ],
    compare: {
      vs: "Figma for ideation",
      honest: [
        { forge: "Faster from zero to something you can show", other: "Deeper systems, components, and team libraries" },
        { forge: "Narrow scope — the screen you need now", other: "Broad canvas — you bring the structure" },
        { forge: "Plain-language edits", other: "Pixel control by default" },
      ],
    },
  },
  website: {
    slug: "website",
    path: "/workflows/website",
    meta: {
      title: "AI website & web page builder — multi-page, responsive | Forge",
      description:
        "Prototype a simple website: responsive layouts, clear IA, and a live link. An AI mini-app platform alternative to one-off static builders.",
    },
    label: "Website / web page",
    tileLabel: "Website",
    heroHighlight: "A browser-frame canvas for a site people can actually click through — with mobile and tablet previews in mind.",
    workflowQuery: "website",
    sectionLabel: "Websites & web pages",
    h1: "Websites and pages",
    h1Accent: "from a clear brief.",
    intro:
      "Multi-page or focused landing: describe the audience, the offer, and the next step. Forge builds a navigable first version you refine like any other mini-app.",
    whatYouGet: [
      { title: "Sensible information architecture", body: "Home, pricing, about, contact — the boring pages, done with taste so you are not pasting lorem." },
      { title: "Responsive by default", body: "Desktop first with awareness for smaller breakpoints as the canvas work lands (V2-P03)." },
      { title: "Same analytics story", body: "When it is live, know what people opened and where they dropped off." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Describe the site: who it is for, what they should do, and what must be on the page.",
        "Forge drafts pages and structure; you refine copy and layout in plain language.",
        "Publish to a Forge link or export when the project matures (export matrix on /handoff).",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Small businesses that have outgrown a single link-in-bio",
        "Startups that need a credible site before a redesign sprint",
        "Operators running a timeboxed campaign page",
      ],
    },
    exampleGallery: [
      { caption: "Local service — 4-page site", tag: "SMB" },
      { caption: "Product launch — pricing + FAQ", tag: "Launch" },
      { caption: "Consulting — case study + CTA", tag: "Services" },
    ],
    faq: [
      { q: "Is this WordPress?", a: "No. Forge is for fast, opinionated first versions and handoff — not a plugin ecosystem or arbitrary CMS." },
      { q: "Can I use my own domain?", a: "Yes on paid plans where custom domains are enabled; check pricing for the tier that includes DNS." },
      { q: "What about e-commerce checkout?", a: "We focus on the story, lead capture, and handoff. Heavy carts are not the core promise in v1." },
    ],
    compare: {
      vs: "Carrd or Framer for a simple site",
      honest: [
        { forge: "One product for forms, decks, and pages — same workflow", other: "Often best at pure visual site building" },
        { forge: "AI-first draft from language", other: "You drag until it looks right" },
        { forge: "Handoff + hosting story in one place", other: "Varies by tool" },
      ],
    },
  },
  "contact-form": {
    slug: "contact-form",
    path: "/workflows/contact-form",
    meta: {
      title: "AI form builder with booking & analytics | Forge",
      description:
        "A Typeform- and Calendly-class alternative: branded forms, optional scheduling, submissions in one inbox. Part of the Forge mini-app platform.",
    },
    label: "Contact & booking",
    tileLabel: "Contact form",
    heroHighlight: "Branded lead capture and booking — one link, fewer tools.",
    workflowQuery: "contact_form",
    sectionLabel: "Contact & booking",
    h1: "Stop phone tag",
    h1Accent: "with customers.",
    intro:
      "Describe the fields you need — Forge generates a hosted, on-brand page. Connect calendars in Settings so bookings land where you already work.",
    whatYouGet: [
      { title: "Lead capture tuned to you", body: "The questions your business needs — not a generic form dump." },
      { title: "Optional pick-a-time scheduling", body: "Keep one link; fewer round trips." },
      { title: "Inbox + analytics", body: "Responses and page metrics in the same place you run everything else in Forge." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "List what you need to know and whether booking matters.",
        "Forge builds the first version; you refine wording and field order in Studio.",
        "Publish, share, and let submissions notify you the way you already work.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Contractors and trades quoting small jobs",
        "Studios and clinics booking consultations",
        "Anyone who was about to use another generic form",
      ],
    },
    exampleGallery: [
      { caption: "Roofing quote — photos + address", tag: "Trades" },
      { caption: "Photography — session type + date", tag: "Creative" },
      { caption: "Dentist — new patient + insurance", tag: "Health" },
    ],
    faq: [
      { q: "Do I need a separate booking tool?", a: "Forge keeps the form and hand-off together; you connect a calendar in Settings for availability." },
      { q: "Is this a Typeform clone?", a: "If you need enterprise survey logic, Typeform can still be right. Forge wins on branded, fast pages with Forge analytics in one account." },
      { q: "Can I change the form later?", a: "Yes — open the page in Studio and refine in plain language." },
    ],
    compare: {
      vs: "Typeform or Google Forms",
      honest: [
        { forge: "On-brand, hosted page with our analytics model", other: "Mature form logic in established tools" },
        { forge: "Same Studio workflow as decks and proposals", other: "Survey-first mental model" },
        { forge: "Narrow, calm scope", other: "Sometimes more than you need" },
      ],
    },
    templatesQuery: "contact",
  },
  proposal: {
    slug: "proposal",
    path: "/workflows/proposal",
    meta: {
      title: "AI proposal generator — track opens & exports | Forge",
      description:
        "Send professional proposals and quotes. Read tracking, clear CTAs, PDF export. Compared to PandaDoc for speed, not for legal CLM features.",
    },
    label: "Proposals & quotes",
    tileLabel: "Proposal",
    heroHighlight: "A client-ready proposal with a link — not a PDF chase.",
    workflowQuery: "proposal",
    sectionLabel: "Proposals & quotes",
    h1: "Win the job before",
    h1Accent: "the competition replies.",
    intro:
      "Turn scope, pricing, and terms into a single client-facing page — clear enough to act on, detailed enough to trust. " + commonExport,
    whatYouGet: [
      { title: "Structured pricing and line items", body: "Show options without turning it into a spreadsheet email." },
      { title: "Client decisions in one place", body: "Questions and next steps live with the offer." },
      { title: "Read tracking in Forge", body: "Know who opened which section from Page Detail — where enabled." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Summarize the job, the options, and what “yes” means.",
        "Forge lays out a readable proposal; you refine tone and details.",
        "Send a link; follow up with context from read activity when available.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Contractors sending scoped quotes the same day",
        "Consultancies packaging discovery + deliverables",
        "Small agencies that still email PDFs in 2026",
      ],
    },
    exampleGallery: [
      { caption: "Fence project — two tiers + photos", tag: "Trades" },
      { caption: "Discovery + roadmap — 30-day", tag: "Consulting" },
      { caption: "Retainer — clear scope, clear price", tag: "Agency" },
    ],
    faq: [
      { q: "Is this legally binding?", a: "Forge helps you present terms; your counsel defines enforceability." },
      { q: "PandaDoc already works for us", a: "PandaDoc shines at CLM and enterprise approvals. Forge aims at speed to a first client-ready page and honest read tracking in Forge." },
    ],
    compare: {
      vs: "PandaDoc or Proposify",
      honest: [
        { forge: "Fast draft from a short brief", other: "Workflows around approvals and redlines" },
        { forge: "Same handoff and analytics frame as the rest of Forge", other: "Contract-centric feature depth" },
      ],
    },
    templatesQuery: "proposal",
  },
  "pitch-deck": {
    slug: "pitch-deck",
    path: "/workflows/pitch-deck",
    meta: {
      title: "AI pitch deck generator — web-native, export to PPTX | Forge",
      description:
        "Turn a story into a presentable deck. An AI alternative to static Canva deck templates for founders who need structure fast.",
    },
    label: "Pitch decks",
    tileLabel: "Pitch deck",
    heroHighlight: "A clear narrative in slides — with export when the room needs a file.",
    workflowQuery: "pitch_deck",
    sectionLabel: "Pitch decks",
    h1: "Your narrative,",
    h1Accent: "one slide at a time.",
    intro:
      "Describe the arc you need — Forge composes a web-native, scrollable deck with presenter-friendly structure and export paths from Page Detail when you need PPTX or PDF.",
    whatYouGet: [
      { title: "Story, not just decoration", body: "Headline flow that matches how investors and customers actually read." },
      { title: "Per-slide polish in language", body: "Refine a slide without retyping the whole deck." },
      { title: "Export for offline rooms", body: "PPTX/PDF from Page Detail for the projector moments." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Tell us the audience, the ask, and the three things they must remember.",
        "Review the first structure; fix slide-by-slide or ask for a tone pass.",
        "Present from the web or export for a partner who wants a file.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Founders in the two weeks before a partner meeting",
        "Operators turning a memo into a room-ready walkthrough",
        "Anyone allergic to a blank 16:9",
      ],
    },
    exampleGallery: [
      { caption: "Seed narrative — problem, wedge, ask", tag: "Startup" },
      { caption: "Agency new business — case proof", tag: "Agency" },
      { caption: "Internal all-hands — metrics + next bets", tag: "Ops" },
    ],
    faq: [
      { q: "Is this PowerPoint?", a: "The main experience is web-native. Exports are for when you are offline or forced into a file." },
      { q: "Can I match our brand template?", a: "Bring brand tokens; refine slides to your taste. Rigid brand lock is not the goal in v1." },
    ],
    compare: {
      vs: "Canva pitch deck templates",
      honest: [
        { forge: "Structure and copy from a prompt", other: "Huge template library, manual text" },
        { forge: "Same place as forms and landing pages for your org", other: "Design-tool workflow" },
      ],
    },
    templatesQuery: "deck",
  },
  "landing-page": {
    slug: "landing-page",
    path: "/workflows/landing-page",
    meta: {
      title: "AI landing page generator — hosted, on-brand | Forge",
      description:
        "One-page marketing sites: hero, social proof, and a clear CTA. A Carrd- and Lander-class option inside the Forge mini-app platform.",
    },
    label: "Landing page",
    tileLabel: "Landing page",
    heroHighlight: "One page with a point of view — not a template maze.",
    workflowQuery: "landing_page",
    sectionLabel: "Landing pages",
    h1: "One page,",
    h1Accent: "one job.",
    intro:
      "Product launch, event, waitlist, or service — describe the promise and the next step. Forge gives you a fast hosted page you can track like every other mini-app. " + commonExport,
    whatYouGet: [
      { title: "Hero, proof, and CTA that agree", body: "A single story instead of a kitchen-sink layout." },
      { title: "On-brand the first time", body: "Your brand kit, not a random gradient pack." },
      { title: "Analytics that match your form", body: "See who arrived and who converted in one system." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Say who it is for, what they get, and what to click next.",
        "Forge composes layout and copy; you tighten claims and add specifics.",
        "Ship the link; iterate after real traffic, not guessing.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Small launches and limited-time promos",
        "Creators and coaches with one primary offer",
        "Teams that need a credible page this week, not a quarter-long CMS project",
      ],
    },
    exampleGallery: [
      { caption: "Waitlist — two benefits + form", tag: "Launch" },
      { caption: "Local service — one call-to-action", tag: "SMB" },
      { caption: "Webinar sign-up — date + time zone", tag: "Events" },
    ],
    faq: [
      { q: "Carrd already does this", a: "Carrd is great for simple sites. Forge adds a shared Studio for forms, decks, and more — and one analytics story." },
      { q: "Do I need a domain on day one?", a: "You can start on a Forge link and connect DNS when the campaign deserves it." },
    ],
    compare: {
      vs: "Carrd or a marketing landing builder",
      honest: [
        { forge: "Same handoff and analytics across workflows", other: "Strong at single pages; separate tools for forms and decks" },
        { forge: "Language-first iteration", other: "Visual-first" },
      ],
    },
    templatesQuery: "landing",
  },
};

export function getWorkflowLanding(slug: string): WorkflowLandingContent | null {
  if (WORKFLOW_SLUGS.includes(slug as WorkflowSlug)) {
    return WORKFLOW_LANDINGS[slug as WorkflowSlug];
  }
  return null;
}

export function workflowMetadata(slug: WorkflowSlug): Metadata {
  const w = WORKFLOW_LANDINGS[slug];
  return {
    title: w.meta.title,
    description: w.meta.description,
    alternates: { canonical: w.path },
    openGraph: {
      title: w.meta.title,
      description: w.meta.description,
    },
  };
}
