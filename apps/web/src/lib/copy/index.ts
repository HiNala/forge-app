/**
 * Centralized user-facing strings (V2-P01). Import from here so positioning shifts
 * stay tractable. Feature-specific copy can re-export or compose these.
 */

export const brand = {
  name: "Forge",
  oneLiner:
    "Describe what you want — a form, a landing page, a proposal, a deck, a mobile screen, or a site. Forge builds it, tracks it, and hands it back. No database to manage.",
  tagline: "Mini-apps in minutes",
  homeHeroSubhead:
    "Forms, proposals, pitch decks, landing pages, mobile screens, websites. Describe what you want. Forge builds it, tracks it, and hands it back.",
  homeHeroTrackingLine:
    "Built-in tracking. Real submissions inbox. Never touch a database.",
  /** Studio — empty state under greeting */
  studioEmptyHint:
    "Describe a mini-app — a form, a landing page, a proposal, a pitch deck, a mobile screen, or a website. Forge builds it.",
  myPagesSubtitleWhenEmpty: "Nothing here yet — open Studio, describe a mini-app, and publish when it feels right.",
  trustLine: "Trusted by contractors, makers, and founders who needed a link yesterday.",
} as const;

export const cta = {
  startFree: "Start free",
  seeHow: "See how it works",
  signIn: "Sign in",
} as const;

export const productTerms = {
  /** Prefer in Studio / empty states; still say “page” in Page Detail when clearer. */
  miniApp: "mini-app",
  miniApps: "mini-apps",
} as const;

export const handoff = {
  takeWithYou: "Take it with you",
  handoffLine:
    "Export to HTML, PDF, PPTX, or design handoff (where available) — or keep the mini-app on Forge, hosted and tracked.",
} as const;

export const emailSubjects = {
  welcome: "Welcome to Forge — let’s build something",
  invite: (org: string) => `You’re invited to ${org} on Forge`,
  newSubmission: (page: string) => `New response — ${page}`,
  billingAlert: (org: string) => `Payment issue — ${org}`,
} as const;
