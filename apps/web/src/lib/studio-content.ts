/**
 * Studio copy — aligned with marketing hero placeholders (FE-02) and mission FE-04 chips.
 */

/** Same rotation as `HeroDemo` PLACEHOLDERS (marketing). */
export const STUDIO_PLACEHOLDERS = [
  "a booking page for my small construction business",
  "a contact form with file uploads for photographers",
  "a one-page sales proposal with accept and decline",
  "an RSVP page for a company holiday party",
  "a daily specials menu for our café",
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
  { id: "gallery2", label: "Gallery", prompt: "A simple image gallery page with captions for my portfolio." },
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
