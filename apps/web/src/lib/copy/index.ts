/**
 * Centralized user-facing strings (V2-P01). Import from here so positioning shifts
 * stay tractable. Feature-specific copy can re-export or compose these.
 */

export const brand = {
  name: "GlideDesign",
  oneLiner:
    "Describe what you want: strategy, screens, code, decks, forms, or a site. GlideDesign builds it, tracks it, and hands it back.",
  tagline: "Glide from idea to product",
  homeHeroSubhead:
    "Strategy, screens, code, proposals, pitch decks, landing pages, mobile flows, and websites. Describe what you want. GlideDesign builds it.",
  homeHeroTrackingLine:
    "Built-in tracking. Real submissions inbox. Never touch a database.",
  /** Studio — empty state under greeting */
  studioEmptyHint:
    "Describe a product surface: a form, landing page, proposal, pitch deck, mobile screen, or website. GlideDesign builds it.",
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
    "Export to HTML, PDF, PPTX, or design handoff (where available) — or keep the mini-app on GlideDesign, hosted and tracked.",
} as const;

export const emailSubjects = {
  welcome: "Welcome to GlideDesign — let’s build something",
  invite: (org: string) => `You’re invited to ${org} on GlideDesign`,
  newSubmission: (page: string) => `New response — ${page}`,
  billingAlert: (org: string) => `Payment issue — ${org}`,
} as const;

/**
 * BP-05 keyed registry additions — migrate product chrome incrementally toward single export shape.
 */
export const forgeRegistry = {
  billing: {
    checkoutStripeNote: "Checkout opens Stripe in a secure window.",
  },
  action: {
    publishPage: "Publish page",
    continue: "Continue",
    done: "Done",
    saveChanges: "Save changes",
  },
  loading: {
    portal: "Opening billing portal…",
  },
} as const;
