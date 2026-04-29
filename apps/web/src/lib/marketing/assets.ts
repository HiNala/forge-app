export const marketingAssets = {
  templateCards: {
    websites: "/marketing/templates/websites.svg",
    mobileApps: "/marketing/templates/mobile-apps.svg",
    pitchDecks: "/marketing/templates/pitch-decks.svg",
    forms: "/marketing/templates/forms.svg",
    proposals: "/marketing/templates/proposals.svg",
  },
  gallery: Array.from({ length: 32 }, (_, index) => `/marketing/templates/gallery-${index + 1}.svg`),
  community: Array.from({ length: 8 }, (_, index) => `/marketing/templates/community-${index + 1}.svg`),
  workflows: Array.from({ length: 6 }, (_, index) => `/marketing/illustrations/workflow-${index + 1}.svg`),
  og: Array.from({ length: 6 }, (_, index) => `/marketing/og/page-${index + 1}.svg`),
  avatars: Array.from({ length: 6 }, (_, index) => `/marketing/avatars/persona-${index + 1}.svg`),
  product: {
    warRoomHero: "/marketing/product/war-room-hero.svg",
  },
} as const;

export type MarketingAssets = typeof marketingAssets;
