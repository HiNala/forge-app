/** Central marketing copy and route lists (Mission FE-02). */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://forge.app";

export const EXAMPLES_SLUGS = [
  "booking",
  "rsvp",
  "menu",
  "proposal",
  "contact",
  "landing",
] as const;

export type ExampleSlug = (typeof EXAMPLES_SLUGS)[number];

export const TEMPLATE_CARDS: {
  slug: ExampleSlug;
  name: string;
  tag: string;
  description: string;
}[] = [
  {
    slug: "booking",
    name: "Small jobs booking",
    tag: "Forms",
    description: "Name, phone, preferred date — routed to your inbox.",
  },
  {
    slug: "rsvp",
    name: "Team event RSVP",
    tag: "Events",
    description: "Meal choice, plus-one, and reminders.",
  },
  {
    slug: "menu",
    name: "Daily specials",
    tag: "Hospitality",
    description: "Lightweight menu with today’s items.",
  },
  {
    slug: "proposal",
    name: "Sales proposal",
    tag: "Sales",
    description: "Tiers, scope, and a clear accept / decline.",
  },
  {
    slug: "contact",
    name: "Contact + uploads",
    tag: "Forms",
    description: "Attachments for briefs or portfolios.",
  },
  {
    slug: "landing",
    name: "Product launch",
    tag: "Marketing",
    description: "Hero, proof points, and a single CTA.",
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
  ];
