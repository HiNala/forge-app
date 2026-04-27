/**
 * Studio copy — aligned with marketing hero placeholders (FE-02) and mission FE-04 chips.
 */

/** Rotates in the empty-state textarea — one line per workflow surface (P-06). */
export const STUDIO_PLACEHOLDERS = [
  "a mobile app screen for service appointments with date and notes",
  "a two-page website for a local coffee shop with menu and contact",
  "a focused web page for my coaching offer with testimonials and a booking CTA",
  "a coming soon page with waitlist for my SaaS beta and three teaser bullets",
  "a contact form for my small construction business",
  "a 7-question customer satisfaction survey after checkout",
  "a 6-question quiz that recommends which service tier fits the customer",
  "an RSVP page for a company party with meal choice and plus-one",
  "a one-page sales proposal with accept and decline",
  "a 6-slide pitch deck for a pre-seed robotics startup",
  "a dinner menu for a bistro with appetizers, mains, and wine by the glass",
  "a wedding photography portfolio with gallery grid and booking form",
  "a link-in-bio for a music teacher with lesson booking, YouTube, and newsletter",
  "a resume site for a product designer with projects, skills, and contact",
] as const;

export type StudioStarterId =
  | "booking"
  | "contact"
  | "rsvp"
  | "menu"
  | "proposal"
  | "surprise";

export type StudioStarterChip = {
  id: StudioStarterId;
  /** Single line shown on the chip (includes middle dot where spec uses ·). */
  label: string;
  prompt: string;
};

const SURPRISE_POOL: Omit<StudioStarterChip, "id">[] = [
  {
    label: "Booking form",
    prompt:
      "A booking form for small jobs with name, phone, job description, and preferred date.",
  },
  {
    label: "Contact form",
    prompt: "A contact form for a local business with name, email, and message.",
  },
  {
    label: "Event RSVP",
    prompt: "An RSVP page for an event with meal choice and guest count.",
  },
  {
    label: "Daily menu",
    prompt: "A daily specials menu with sections and prices for a café.",
  },
  {
    label: "Proposal",
    prompt: "A one-page sales proposal with pricing options and a clear CTA.",
  },
  {
    label: "Portfolio",
    prompt: "A creative portfolio page showcasing my best client work with case studies and outcomes.",
  },
  {
    label: "Waitlist",
    prompt: "A pre-launch waitlist page for my new SaaS product with email capture and key benefits.",
  },
  {
    label: "Link in bio",
    prompt: "A link-in-bio page for a fitness coach with name, bio, and links to course, newsletter, and booking.",
  },
  {
    label: "FAQ page",
    prompt: "A FAQ page for a home renovation contractor answering common questions about pricing, timeline, and process.",
  },
];

/** Six suggestion chips — "Surprise me" picks a random category. */
export const STUDIO_STARTER_CHIPS: StudioStarterChip[] = [
  {
    id: "booking",
    label: "Booking form",
    prompt:
      "A booking form for small repair jobs with name, phone, job description, and preferred date.",
  },
  {
    id: "contact",
    label: "Contact form",
    prompt:
      "A contact form with name, email, phone optional, and a message field for a retail shop.",
  },
  {
    id: "rsvp",
    label: "Event RSVP",
    prompt: "An RSVP page for a team event with meal choice and plus-one option.",
  },
  {
    id: "menu",
    label: "Daily menu",
    prompt: "A daily specials menu page for a café with sections and prices.",
  },
  {
    id: "proposal",
    label: "Proposal",
    prompt: "A one-page sales proposal with pricing tiers and a strong call to action.",
  },
  {
    id: "surprise",
    label: "Surprise me",
    prompt: "",
  },
];

export function resolveSurprisePrompt(): string {
  const pick = SURPRISE_POOL[Math.floor(Math.random() * SURPRISE_POOL.length)]!;
  return pick.prompt;
}

/** Smaller chips under flagship workflow cards — prime only, no auto-submit (W-04). */
export const STUDIO_SECONDARY_CHIPS: { id: string; label: string; prompt: string }[] = [
  { id: "rsvp2", label: "Event RSVP", prompt: "An RSVP page for my event with meal choice and guest count." },
  { id: "menu2", label: "Menu", prompt: "A daily specials menu for our restaurant with sections and prices." },
  { id: "landing2", label: "Landing", prompt: "A one-page landing for my product with hero, features, and CTA." },
  { id: "promo2", label: "Promotion", prompt: "A short promotion page for a limited-time sale with urgency and CTA." },
  { id: "portfolio2", label: "Portfolio", prompt: "A portfolio page showcasing my design work with case studies and client results." },
  { id: "waitlist2", label: "Waitlist", prompt: "A coming-soon waitlist page for my new product with email capture and benefits." },
  { id: "linkinbio2", label: "Link in bio", prompt: "A link-in-bio page for my social media profile with my name, bio, and key links." },
  { id: "faq2", label: "FAQ page", prompt: "A frequently asked questions page for my business with common customer questions and clear answers." },
  { id: "surprise2", label: "Surprise me", prompt: "" },
];

/** Default refine chips when `html.complete` does not include `refine_suggestions`. */
export const DEFAULT_REFINE_CHIPS = [
  "Make it more minimal",
  "Dark color scheme",
  "Add pricing",
  "Bigger CTA",
  "Add a phone number",
  "Change the tone",
] as const;

export const SECTION_EDIT_QUICK_CHIPS = [
  "Shorter copy",
  "Bolder headline",
  "Different image",
] as const;
