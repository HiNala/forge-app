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
    q: "Can I use my own domain?",
    a: "Yes on Pro and above — point your DNS at Forge and we’ll provision TLS. Starter uses forge-hosted links until you upgrade.",
  },
  {
    q: "What happens if I exceed my submission quota?",
    a: "We’ll email you before hard blocks. You can upgrade, archive old pages, or add a metered bundle.",
  },
  {
    q: "Is this like Lovable or Bolt?",
    a: "Forge is narrower and calmer: one hosted page per use case (forms, RSVPs, menus), brand kit baked in, and a Studio built for refinement — not a full app IDE.",
  },
  {
    q: "What AI model powers it?",
    a: "We route prompts through providers we can rotate for quality and latency; you don’t pick a model in v1. Details are in our security page for teams.",
  },
  {
    q: "Do you charge per submission?",
    a: "No — plans are by seats, pages, and automation volume. Heavy public traffic may need Enterprise.",
  },
  {
    q: "GDPR and data residency?",
    a: "We process as a processor under our DPA (Enterprise). EU hosting options are on the roadmap; talk to us if required now.",
  },
  {
    q: "Can I export my page HTML?",
    a: "Yes — snapshots are yours. Studio also keeps publish history for rollback.",
  },
  {
    q: "Do you offer refunds?",
    a: "Monthly plans can be cancelled anytime; we don’t prorate the current period. Annual plans follow the terms at checkout.",
  },
];

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "What’s included in the trial?",
    a: "Full product on Starter limits for 14 days. Card required only when you pick a paid plan.",
  },
  {
    q: "Can I switch plans mid-cycle?",
    a: "Yes — upgrades prorate; downgrades apply on the next renewal.",
  },
  {
    q: "Do you invoice for Enterprise?",
    a: "Yes — NET30 available on annual contracts.",
  },
  {
    q: "Nonprofits or education pricing?",
    a: "Contact us — we keep a small discount pool.",
  },
  {
    q: "How does annual billing work?",
    a: "Pay yearly and get roughly two months free versus month-to-month. You can switch at renewal.",
  },
  {
    q: "What payment methods do you take?",
    a: "Stripe checkout accepts major cards. Enterprise can pay by invoice where agreed.",
  },
  {
    q: "Do taxes apply?",
    a: "Where required, tax is calculated at checkout based on your billing address.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — monthly plans stop at period end; annual plans follow the terms shown at purchase.",
  },
];

export const PRICING_COMPARISON: { feature: string; starter: string; pro: string; enterprise: string }[] =
  [
    { feature: "Live pages", starter: "5", pro: "50", enterprise: "Custom" },
    { feature: "Submissions / mo", starter: "500", pro: "10k", enterprise: "Custom" },
    { feature: "Custom domain", starter: "—", pro: "Yes", enterprise: "Yes" },
    { feature: "Team seats", starter: "1", pro: "5", enterprise: "Unlimited" },
    { feature: "Automations", starter: "Basic", pro: "Full", enterprise: "Full + SLA" },
    { feature: "Analytics retention", starter: "30 days", pro: "12 months", enterprise: "Custom" },
    { feature: "Support", starter: "Email", pro: "Priority", enterprise: "Dedicated" },
    { feature: "SSO / SAML", starter: "—", pro: "—", enterprise: "Add-on" },
    { feature: "Data export", starter: "Yes", pro: "Yes", enterprise: "Yes" },
    { feature: "Uptime commitment", starter: "Best effort", pro: "Best effort", enterprise: "SLA" },
    { feature: "Billing", starter: "Card", pro: "Card", enterprise: "Invoice" },
    { feature: "Sandbox / staging", starter: "—", pro: "1", enterprise: "Unlimited" },
    { feature: "Calendar integrations", starter: "—", pro: "Yes", enterprise: "Yes" },
    { feature: "API access", starter: "—", pro: "Read", enterprise: "Read/write" },
    { feature: "White-label remove Forge", starter: "—", pro: "—", enterprise: "Add-on" },
  ];
