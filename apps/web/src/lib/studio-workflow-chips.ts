/**
 * Secondary suggestion row for Studio empty state (W-04) — primes only.
 */

export type SecondaryStudioChip = {
  id: string;
  label: string;
  prime: string;
};

export const STUDIO_SECONDARY_CHIPS: SecondaryStudioChip[] = [
  { id: "rsvp", label: "Event RSVP", prime: "An RSVP page for " },
  { id: "menu", label: "Menu", prime: "A daily specials menu for " },
  { id: "landing", label: "Landing", prime: "A landing page for " },
  { id: "promo", label: "Promotion", prime: "A promotional page for " },
  { id: "gallery", label: "Gallery", prime: "A photo gallery for " },
  { id: "surprise", label: "Surprise me", prime: "" },
];
