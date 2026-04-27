/** Central marketing copy and route lists (Mission FE-02). */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://forge.app";

export const EXAMPLES_SLUGS = [
  "contractor-small-jobs",
  "event-rsvp",
  "coffee-shop-menu",
  "freelance-design-proposal",
  "product-launch",
  "consultation-slot",
] as const;

export type ExampleSlug = (typeof EXAMPLES_SLUGS)[number];

export const TEMPLATE_CARDS: {
  slug: ExampleSlug;
  name: string;
  tag: string;
  description: string;
}[] = [
  {
    slug: "contractor-small-jobs",
    name: "Contractor small jobs",
    tag: "Forms",
    description: "Scope, budget, and site notes for quick residential fixes.",
  },
  {
    slug: "event-rsvp",
    name: "Event RSVP",
    tag: "Events",
    description: "Meal choice, allergies, and headcount for company events.",
  },
  {
    slug: "coffee-shop-menu",
    name: "Coffee shop menu",
    tag: "Hospitality",
    description: "Espresso classics with a reservation line.",
  },
  {
    slug: "freelance-design-proposal",
    name: "Design proposal",
    tag: "Proposals",
    description: "Discovery, concepts, and handoff in one calm page.",
  },
  {
    slug: "product-launch",
    name: "Product launch",
    tag: "Landing",
    description: "Hero, value props, and a single waitlist form.",
  },
  {
    slug: "consultation-slot",
    name: "Consultation booking",
    tag: "Booking",
    description: "Pick a window — agenda follows by email.",
  },
];

export const LANDING_FAQ: { q: string; a: string }[] = [
  {
    q: "What is a mini-app?",
    a: "A single-purpose, hosted surface you ship with Forge: a form, a landing page, a proposal, a deck, a simple site. One link, analytics in Forge, no database to configure.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes on Pro and above — point DNS at Forge and we provision TLS. The Free tier uses Forge-hosted links until you upgrade.",
  },
  {
    q: "Is Forge like Lovable, Bolt, or Cursor?",
    a: "No — those are for shipping full applications and code. Forge is for fast, on-brand pages and content mini-apps: forms, proposals, decks, and landing pages you can share and track without running infrastructure.",
  },
  {
    q: "What AI powers Studio?",
    a: "We route prompts through providers we can change for quality and cost. You do not pick a model — details for teams are in our security pages.",
  },
  {
    q: "Do you charge per form submission?",
    a: "No separate per-submission fee on the published plans. Fair use and rate limits are expressed as session-based usage with weekly caps (see Pricing).",
  },
  {
    q: "Can I take my work elsewhere?",
    a: "Yes — that is the point. Export formats depend on the workflow; everything can stay live on Forge in the meantime.",
  },
  {
    q: "GDPR and data residency?",
    a: "We process as a processor under our DPA where contractually in place. EU hosting is on the roadmap; talk to us if you have a hard requirement now.",
  },
  {
    q: "Do you offer refunds?",
    a: "Monthly plans can be cancelled anytime; we do not prorate the current period. Annual terms are shown at checkout.",
  },
];

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "What happens if I hit my limit?",
    a: "You will see a clear usage bar (session-based with a weekly cap). We email before hard blocks. Upgrade or wait for the next window — final numbers land with billing (V2-P04).",
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes — upgrades take effect on the terms shown at checkout; downgrades apply on the next renewal where applicable.",
  },
  {
    q: "Is the Free tier really free?",
    a: "Yes — a real tier for trying Forge. Paid tiers add usage headroom, domains, and team features. Exact entitlements follow Stripe when wired.",
  },
  {
    q: "Do you charge for AI separately?",
    a: "No surprise AI line items — usage is part of the plan limits you see, presented honestly as a percentage bar, not a wall of token math.",
  },
  {
    q: "What is the difference between Pro and Max?",
    a: "Max is for people who live in Forge: higher limits, priority support, and headroom for daily shipping. Pro is the best fit for most growing teams. Details track V2-P04.",
  },
  {
    q: "How does annual billing work?",
    a: "Pay yearly and save versus month-to-month. You can switch at renewal.",
  },
  {
    q: "What payment methods do you take?",
    a: "Stripe checkout for cards. Invoicing for larger seats is available where we agree in writing.",
  },
  {
    q: "Do taxes apply?",
    a: "Where required, tax is calculated at checkout from your billing address.",
  },
];

export const PRICING_COMPARISON: { feature: string; free: string; pro: string; max: string }[] = [
  { feature: "Live mini-apps (pages)", free: "3", pro: "25", max: "100" },
  { feature: "Form submissions / mo (guidance)", free: "200", pro: "5k", max: "25k" },
  { feature: "Session usage & weekly cap", free: "Entry", pro: "Standard", max: "High" },
  { feature: "Custom domain + TLS", free: "—", pro: "Yes", max: "Yes" },
  { feature: "Team seats", free: "1", pro: "5", max: "15" },
  { feature: "Automations", free: "—", pro: "Core", max: "Full" },
  { feature: "Analytics retention", free: "14 days", pro: "12 months", max: "24 months" },
  { feature: "Support", free: "Email", pro: "Priority", max: "Priority + same-day" },
  { feature: "Exports (PDF, PPTX, HTML, …)", free: "Core", pro: "Full", max: "Full" },
  { feature: "Calendar integrations", free: "—", pro: "Yes", max: "Yes" },
  { feature: "API access", free: "—", pro: "Read", max: "Read/write" },
  { feature: "SSO / SAML", free: "—", pro: "—", max: "Add-on" },
];
