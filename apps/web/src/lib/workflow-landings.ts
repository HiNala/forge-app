import type { Metadata } from "next";

export const WORKFLOW_SLUGS = [
  "web-page",
  "mobile-app",
  "website",
  "contact-form",
  "event-rsvp",
  "menu",
  "survey",
  "quiz",
  "coming-soon",
  "gallery",
  "link-in-bio",
  "resume",
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
  "web-page": {
    slug: "web-page",
    path: "/workflows/web-page",
    meta: {
      title: "AI single web page — fast, on-brand | Forge",
      description:
        "One focused public page: clear promise, social proof, and a next step. Built in Studio with the same analytics as the rest of Forge.",
    },
    label: "Web page",
    tileLabel: "Web page",
    heroHighlight: "One offer, one page, one next step — without fighting a full site builder.",
    workflowQuery: "landing_page",
    sectionLabel: "Web pages",
    h1: "A web page that",
    h1Accent: "gets to the point.",
    intro:
      "When you do not need a full site, you need a page that works: scannable, credible, and fast on phones. " + commonExport,
    whatYouGet: [
      { title: "A single, confident story", body: "Hero, proof, and CTA that agree with each other — not a kitchen sink." },
      { title: "Brand kit applied", body: "Colors and tone from the workspace, not a random template pack." },
      { title: "Same analytics as forms and decks", body: "See who arrived and who converted in one system." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Describe the audience, offer, and the one action you want.",
        "Forge drafts the page; you refine language and details in Studio.",
        "Publish a Forge link; connect DNS when the campaign is worth it.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "A campaign or service line that needs its own home",
        "Founders who want a real page this week, not a quarter-long CMS",
        "Operators testing an offer before building a full site",
      ],
    },
    exampleGallery: [
      { caption: "Consulting offer — CTA to book", tag: "Services" },
      { caption: "Workshop sign-up — date + time zone", tag: "Events" },
    ],
    faq: [
      { q: "Is this a whole website builder?", a: "Forge is optimized for fast mini-apps and focused pages, not a WordPress-style CMS with unlimited templates." },
      { q: "What about a multi-page site?", a: "Use the Website / web canvas flow for light IA; for a single CTA, start here first." },
    ],
    compare: {
      vs: "Carrd for a one-off page",
      honest: [
        { forge: "One workflow with forms, decks, and more", other: "Great at a single static page" },
        { forge: "Language-first iteration", other: "Visual-first" },
        { forge: "Shared analytics in Forge", other: "Varies" },
      ],
    },
    templatesQuery: "landing",
  },
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
  "link-in-bio": {
    slug: "link-in-bio",
    path: "/workflows/link-in-bio",
    meta: {
      title: "Link in bio — prettier than Linktree, tracked in Forge | Forge",
      description:
        "One mini-page of links, media, and email capture for your social profile. Branding, analytics, and a single hosted link.",
    },
    label: "Link in bio",
    tileLabel: "Link in bio",
    heroHighlight: "Your bio link, on-brand, with per-link click analytics when you need them.",
    workflowQuery: "link_in_bio",
    sectionLabel: "Link in bio",
    h1: "Your bio link,",
    h1Accent: "prettier than Linktree.",
    intro:
      "Stack every destination you need — shop, lead capture, YouTube, newsletter — in one place that still feels like you. " + commonExport,
    whatYouGet: [
      { title: "Mobile-first by default", body: "Big tap targets, clear labels, and no mystery taps." },
      { title: "On-brand, not on-template", body: "Your colors and tone — not a stock gradient." },
      { title: "Analytics that respect the format", body: "See which link earns clicks and where people bounce." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Describe you, your offer, and the links you want above the fold.",
        "Review the first layout; add or reorder blocks in plain language.",
        "Drop the one Forge link in your profile and iterate after real traffic.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Creators with more than one destination",
        "Local businesses pointing Instagram traffic to book or order",
        "Founders with a beta list plus a calendar link",
      ],
    },
    exampleGallery: [
      { caption: "Coach — book + newsletter", tag: "Services" },
      { caption: "Musician — tour + store", tag: "Creative" },
    ],
    faq: [
      { q: "Is this just Linktree?", a: "Same category, different trade-offs: deeper Forge stack (forms, decks) and a consistent analytics model." },
      { q: "Can I use my own domain?", a: "Yes on plans that include custom DNS — the link still renders from your Forge org." },
    ],
    compare: {
      vs: "Linktree, Beacons, Stan",
      honest: [
        { forge: "Tied to your whole Forge account", other: "Mature, link-first category tools" },
        { forge: "You describe; Forge composes the page", other: "You drag, duplicate, and theme" },
        { forge: "Deeper when you outgrow a single list", other: "Fastest to a plain list" },
      ],
    },
    templatesQuery: "link",
  },
  "event-rsvp": {
    slug: "event-rsvp",
    path: "/workflows/event-rsvp",
    meta: {
      title: "Event RSVP page — no spreadsheets | Forge",
      description: "A hosted invite with RSVP, guest questions, and responses in your Forge inbox. Compared to social-only invites and generic forms.",
    },
    label: "Event RSVP",
    tileLabel: "Event RSVP",
    heroHighlight: "Headcount, meals, and plus-ones in one place — with branding that looks intentional.",
    workflowQuery: "event_rsvp",
    sectionLabel: "Events",
    h1: "Your event,",
    h1Accent: "RSVP'd. No spreadsheet.",
    intro:
      "From weddings to all-hands, guests need clarity and you need a clean tally. " + commonExport,
    whatYouGet: [
      { title: "A real invite, not a bare form", body: "Date, time, and what to expect — before the questions." },
      { title: "Field mix you control", body: "Dietary, plus-ones, and custom questions when you need them." },
      { title: "Responses in one inbox", body: "Same notifications story as the rest of Forge." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Name the event, the vibe, and what you must know from guests.",
        "Forge composes a hosted RSVP; you tune wording in Studio.",
        "Share a link; track activity without chasing screenshots.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Couples and families tired of DMs and reply-all sprawl",
        "Ops teams with real catering constraints",
        "Community meetups with capacity limits",
      ],
    },
    exampleGallery: [
      { caption: "Wedding — meal + song", tag: "Social" },
      { caption: "All-hands — lunch preference", tag: "Work" },
    ],
    faq: [
      { q: "Partiful already exists", a: "If you need heavy social design, that can be right. Forge wins when you want one brand system and exports across forms, decks, and more." },
      { q: "Eventbrite-style ticketing?", a: "Forge is not a full box office. For most private events, a focused RSVP is enough." },
    ],
    compare: {
      vs: "Partiful, Paperless Post, Eventbrite",
      honest: [
        { forge: "Single Forge workspace for the rest of your pages", other: "Event-specific polish and features" },
        { forge: "Faster to a branded hosted page from language", other: "More setup for a themed invite" },
      ],
    },
    templatesQuery: "event",
  },
  menu: {
    slug: "menu",
    path: "/workflows/menu",
    meta: {
      title: "Online menu for restaurants and services | Forge",
      description: "A phone-friendly food or service menu you can link from Instagram and QR. Compared to PDF menus and POS microsites you did not have time to learn.",
    },
    label: "Menu / services",
    tileLabel: "Menu",
    heroHighlight: "Sections, prices, and dietary clues — in a page guests can actually read in line.",
    workflowQuery: "menu",
    sectionLabel: "Menus",
    h1: "Your menu,",
    h1Accent: "online in minutes.",
    intro:
      "Whether you are plating dinner or bundling services, the job is the same: a scannable list that feels on-brand. " + commonExport,
    whatYouGet: [
      { title: "Readable on phones", body: "Short lines, big category headers, and space for the details that matter." },
      { title: "Room for dietary and upsells", body: "Callouts for specials, pairings, or add-ons when you have them." },
      { title: "Same org as the rest of Forge", body: "Your logo and colors, not a random PDF export." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Describe the kind of business and how many sections you need.",
        "Forge produces a first menu layout; you refine items and copy.",
        "Share a link or QR; update prices without a file chase.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Restaurants that change specials often",
        "Salons and clinics with a services price list",
        "Studios with packages, not a full commerce cart",
      ],
    },
    exampleGallery: [
      { caption: "Wine list — by the glass", tag: "Hospitality" },
      { caption: "Salon — cut + color packages", tag: "Services" },
    ],
    faq: [
      { q: "We already have Toast or Square", a: "Point-of-sale systems win at orders. Forge is for a fast, shareable, branded public menu page when you do not need a full ordering stack." },
      { q: "Do you sync prices?", a: "In v1 you edit in Studio. Treat it as a fast front-of-house surface." },
    ],
    compare: {
      vs: "Toast, Square, or Instagram-only menus",
      honest: [
        { forge: "Speed from a text brief", other: "Deeper when already on the stack" },
        { forge: "Same handoff and analytics with other Forge pages", other: "Often separate tools" },
      ],
    },
    templatesQuery: "menu",
  },
  survey: {
    slug: "survey",
    path: "/workflows/survey",
    meta: {
      title: "Surveys on a branded page — NPS, CSAT, research | Forge",
      description: "A hosted survey you can link anywhere — with Forge analytics, not a separate login.",
    },
    label: "Survey",
    tileLabel: "Survey",
    heroHighlight: "Typeform-weight questions, Forge-weight iteration speed.",
    workflowQuery: "survey",
    sectionLabel: "Surveys",
    h1: "Surveys that",
    h1Accent: "people actually finish.",
    intro:
      "Long surveys fail on phones. Forge aims at tight question sets, clear steps, and copy that does not feel like HR homework. " + commonExport,
    whatYouGet: [
      { title: "A survey that is still a page", body: "Brand context matters — respondents see you, not a random URL." },
      { title: "Field mix for real research", body: "Ratings, single choice, and one honest open end." },
      { title: "You stay in one account", body: "No separate 'survey' login for a small org." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Name the study, audience, and what decision the answers will drive.",
        "Forge composes a first pass; you sharpen wording in Studio.",
        "Share a link; read responses in Forge and iterate the survey like any other page.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Bootstrapped teams without a research ops stack",
        "CS leaders running lightweight NPS or CSAT",
        "Event hosts with real feedback to collect",
      ],
    },
    exampleGallery: [
      { caption: "CSAT after onboarding", tag: "SaaS" },
      { caption: "Event feedback in 4 questions", tag: "Events" },
    ],
    faq: [
      { q: "Typeform is the default", a: "If you need deep logic trees and enterprise data residency, that can be right. Forge is for a hosted, branded, fast first version inside your existing Forge work." },
      { q: "Do you support 50-question research?", a: "You can, but the composer nudges toward what mobile respondents tolerate." },
    ],
    compare: {
      vs: "Typeform, Google Forms, SurveyMonkey",
      honest: [
        { forge: "Same org as the rest of your pages", other: "Mature form logic" },
        { forge: "Language-first iteration", other: "Template-first" },
        { forge: "Narrow, opinionated design", other: "Broader, heavier" },
      ],
    },
    templatesQuery: "survey",
  },
  quiz: {
    slug: "quiz",
    path: "/workflows/quiz",
    meta: {
      title: "Quizzes and product finders that convert | Forge",
      description: "Outcome quizzes and light knowledge checks on a single hosted page, with a Studio workflow behind them.",
    },
    label: "Quiz",
    tileLabel: "Quiz",
    heroHighlight: "When you need a reason to click “next” that is not a wall of form fields.",
    workflowQuery: "quiz",
    sectionLabel: "Quizzes",
    h1: "Quizzes that",
    h1Accent: "convert.",
    intro:
      "Recommend a tier, a path, or a product line with a few sharp questions. " + commonExport,
    whatYouGet: [
      { title: "A narrative, not a spreadsheet", body: "Each step earns the next; outcomes feel inevitable." },
      { title: "Outcomes and scores in copy", body: "Personality, recommendation, or a score screen — you decide the frame." },
      { title: "Handoff-ready", body: "End on a CTA that matches the recommended path." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Describe the audience, possible outcomes, and the decision you are driving.",
        "Forge drafts the quiz flow; you tune tone and order.",
        "Publish a link; pair with a simple ad or email to learn fast.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Marketers testing positioning before a big page build",
        "Sales teams with three obvious paths",
        "Founders with a 'which plan' question to answer in public",
      ],
    },
    exampleGallery: [
      { caption: "SaaS plan finder", tag: "Product" },
      { caption: "Style quiz for a course", tag: "Education" },
    ],
    faq: [
      { q: "Is this Interact or Outgrow?", a: "Those are strong when quizzes are your product. Forge is a fast, hosted quiz inside a broader page system." },
      { q: "What about proctoring?", a: "Not the goal. This is a marketing and recommendation surface, not an exam product." },
    ],
    compare: {
      vs: "Outgrow, Interact, Typeform quizzes",
      honest: [
        { forge: "Faster from prompt to a live page in Forge", other: "Deeper logic + analytics for quiz-first teams" },
        { forge: "The rest of your site lives next door", other: "Separate login and plan" },
      ],
    },
    templatesQuery: "quiz",
  },
  "coming-soon": {
    slug: "coming-soon",
    path: "/workflows/coming-soon",
    meta: {
      title: "Waitlist and coming soon pages | Forge",
      description: "Pre-launch capture with a single clear promise — and the same handoff as every other Forge page.",
    },
    label: "Coming soon",
    tileLabel: "Coming soon",
    heroHighlight: "A waitlist you can stand behind before the product is ready to demo.",
    workflowQuery: "coming_soon",
    sectionLabel: "Coming soon",
    h1: "Build a waitlist",
    h1Accent: "before the product build.",
    intro:
      "The page should answer three questions: what, when-ish, and why should I care now. " + commonExport,
    whatYouGet: [
      { title: "A focused ask", body: "Email and maybe one more field — not a pre-product CRM dump." },
      { title: "Space for a credible teaser", body: "Three short bullets, not a manifesto." },
      { title: "Same org story", body: "Your kit, your domain when ready, your analytics." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Name the product, the audience, and what early supporters get.",
        "Forge composes a coming-soon page; you tune tone and CTA in Studio.",
        "Swap to a real landing when you launch — or iterate this page into it.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Pre-seed teams whose site is still a single promise",
        "Creators with a list-first launch",
        "Local openings where foot traffic is not a channel yet",
      ],
    },
    exampleGallery: [
      { caption: "SaaS waitlist with teaser", tag: "Launch" },
      { caption: "Shop opening with date window", tag: "Retail" },
    ],
    faq: [
      { q: "Carrd already does a coming-soon", a: "Carrd is great at a one-off page. Forge is for the moment that page becomes one of many assets in a single org." },
      { q: "Countdowns and referrals?", a: "The composer nudges toward copy that can grow into those — wire-up depth depends on the roadmap." },
    ],
    compare: {
      vs: "Carrd, Mailchimp LPs, Webflow",
      honest: [
        { forge: "Faster to the first pass from a brief", other: "More visual control" },
        { forge: "Same home as forms, decks, and more", other: "Often project-by-project" },
      ],
    },
    templatesQuery: "waitlist",
  },
  gallery: {
    slug: "gallery",
    path: "/workflows/gallery",
    meta: {
      title: "Photography and design portfolio | Forge",
      description: "Image-forward portfolio pages with a structured inquiry form — for photographers, designers, and makers.",
    },
    label: "Gallery / portfolio",
    tileLabel: "Gallery",
    heroHighlight: "A gallery that is not just a drive link — and a way to start a real conversation.",
    workflowQuery: "gallery",
    sectionLabel: "Galleries",
    h1: "Your portfolio,",
    h1Accent: "beautifully.",
    intro:
      "The job is to show the work, earn trust, and make the first contact easy. " + commonExport,
    whatYouGet: [
      { title: "A grid with intent", body: "Captions and hierarchy that tell a client what you actually do." },
      { title: "An inquiry that respects time", body: "A short form — not a 20-field nightmare." },
      { title: "A single hosted story", body: "Same brand kit as the rest of your org." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Name your field, the kind of work, and the next step for a client.",
        "Forge sets up hero + grid + form; you refine in Studio with specifics.",
        "Share a link to bookers, art directors, or local leads.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Wedding and portrait photographers",
        "Designers and illustrators with a few hero projects",
        "Studios with a public inquiry path",
      ],
    },
    exampleGallery: [
      { caption: "Wedding — highlight reel + inquiry", tag: "Photo" },
      { caption: "UI kit — 4 case cards", tag: "Design" },
    ],
    faq: [
      { q: "Squarespace or Format?", a: "Those are strong, site-first hosts. Forge targets a live page fast inside a broader workstream — not a full personal site product." },
      { q: "Print sales?", a: "The roadmap can extend into commerce; v1 is lead capture and proof." },
    ],
    compare: {
      vs: "Squarespace, Format, Adobe Portfolio",
      honest: [
        { forge: "Speed from a short brief in Studio", other: "Deeper long-run site features" },
        { forge: "Same org as the rest of Forge", other: "Isolated site builder account" },
      ],
    },
    templatesQuery: "galleries",
  },
  resume: {
    slug: "resume",
    path: "/workflows/resume",
    meta: {
      title: "Resume and personal site — better than a PDF | Forge",
      description: "A scannable, mobile-friendly resume page with projects and contact — in your brand system.",
    },
    label: "Resume / site",
    tileLabel: "Resume",
    heroHighlight: "A link that is easier to read than a two-column PDF on a phone.",
    workflowQuery: "resume",
    sectionLabel: "Resumes",
    h1: "Your resume site,",
    h1Accent: "smarter than a PDF.",
    intro:
      "Hiring teams skim. Give them a page with hierarchy, not a file that fights zoom. " + commonExport,
    whatYouGet: [
      { title: "Readable structure", body: "Experience, impact, and skills in an order you control." },
      { title: "Project proof", body: "A few tight cards beat ten anonymous bullets." },
      { title: "A link you are not ashamed to send", body: "Consistent with the rest of your public Forge pages when you have them." },
    ],
    howItWorks: {
      title: "How it works",
      steps: [
        "Tell us the role, the industries, and the three wins you need visible.",
        "Forge drafts a first pass; you refine in Studio for nuance and accuracy.",
        "Send a link; export paths mature on the handoff page where enabled.",
      ],
    },
    builtFor: {
      title: "Built for",
      who: [
        "Operators job-searching in public",
        "Freelancers with a case-led story",
        "Leaders with a public bio that is not a LinkedIn clone",
      ],
    },
    exampleGallery: [
      { caption: "PM — outcomes + projects", tag: "Tech" },
      { caption: "Design — 4 case links", tag: "Creative" },
    ],
    faq: [
      { q: "Is this a replacement for LinkedIn?", a: "No — it is a page you own for applications and intros when PDFs fail on phones." },
      { q: "ATS import?", a: "The composer aims at readable first; file-oriented ATS is a different problem." },
    ],
    compare: {
      vs: "Notion, About.me, Squarespace",
      honest: [
        { forge: "Fast, opinionated page in Forge", other: "Long-running personal site feature depth" },
        { forge: "Same org as the rest of your work", other: "Separate toolchains" },
      ],
    },
    templatesQuery: "resume",
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
