/** Central marketing copy and route lists (Mission FE-02). */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://glidedesign.ai";

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
    a: "A single-purpose, hosted surface you ship with GlideDesign: a form, a landing page, a proposal, a deck, a simple site. One link, analytics in GlideDesign, no database to configure.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes on Pro and above: point DNS at GlideDesign and we provision TLS. The Free tier uses GlideDesign-hosted links until you upgrade.",
  },
  {
    q: "Is GlideDesign like Lovable, Bolt, or Cursor?",
    a: "No. Those are for coding full applications. GlideDesign is for turning intent into product strategy, screens, code, decks, and shareable mini-apps without running infrastructure.",
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
    a: "Yes. Export formats depend on the workflow; everything can stay live on GlideDesign in the meantime.",
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
    a: "Yes. Free is real, but strict: 100 weekly credits, 3 published mini-apps, GlideDesign badge, and community support. Paid tiers add serious usage headroom, domains, exports, and support.",
  },
  {
    q: "Do you charge for AI separately?",
    a: "No surprise AI line items — usage is part of the plan limits you see, presented honestly as a percentage bar, not a wall of token math.",
  },
  {
    q: "What is the difference between Pro and Max?",
    a: "Max is for teams that live in GlideDesign: 10,000 weekly credits, priority generation, seats, SSO, and dedicated support. Pro is the best fit for most growing teams.",
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

export const PRICING_COMPARISON: {
  feature: string;
  free: string;
  pro: string;
  max5: string;
  max20: string;
}[] = [
  { feature: "Published mini-apps", free: "1", pro: "25", max5: "100", max20: "500" },
  { feature: "Form submissions / month", free: "50", pro: "5,000", max5: "50,000", max20: "250,000" },
  { feature: "Generation credits / week", free: "100", pro: "2,500", max5: "10,000", max20: "10,000" },
  { feature: "Weekly credit cap", free: "100", pro: "2,500", max5: "10,000", max20: "10,000" },
  { feature: "Concurrent generations", free: "1", pro: "2", max5: "5", max20: "15" },
  { feature: "Custom domains", free: "—", pro: "1", max5: "10", max20: "Unlimited" },
  { feature: "Team seats (included)", free: "1", pro: "3", max5: "10", max20: "25" },
  { feature: "Analytics", free: "Basic", pro: "Full", max5: "Full", max20: "Full" },
  { feature: '"Made with GlideDesign" badge', free: "On", pro: "Off", max5: "Off", max20: "Off" },
  { feature: "Support", free: "Email (best effort)", pro: "Priority", max5: "Priority + fast lane", max20: "Priority + highest" },
  { feature: "Exports (PDF, PPTX, …)", free: "Core", pro: "Full", max5: "Advanced", max20: "All" },
  { feature: "AI provider (backend)", free: "GlideDesign-managed", pro: "GlideDesign-managed", max5: "GlideDesign-managed", max20: "Optional org override" },
];
