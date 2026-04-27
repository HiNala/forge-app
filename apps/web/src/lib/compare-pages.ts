import type { Metadata } from "next";
import { SITE_URL } from "@/lib/marketing-content";

export const COMPARE_SLUGS = [
  "typeform",
  "calendly",
  "carrd",
  "pandadoc",
  "canva-pitch-decks",
] as const;

export type CompareSlug = (typeof COMPARE_SLUGS)[number];

type CompareBlock = {
  slug: CompareSlug;
  path: string;
  meta: { title: string; description: string };
  h1: string;
  sub: string;
  theyWin: string[];
  weWin: string[];
  bestForThem: string;
  bestForUs: string;
  workflowLink: string;
};

export const COMPARE_PAGES: Record<CompareSlug, CompareBlock> = {
  typeform: {
    slug: "typeform",
    path: "/compare/forge-vs-typeform",
    meta: {
      title: "Forge vs Typeform — AI form builder alternative | Forge",
      description:
        "Typeform is survey-first. Forge is a mini-app for branded pages, analytics in Forge, and the same Studio for decks and proposals. Honest tradeoffs.",
    },
    h1: "Forge vs Typeform",
    sub: "Typeform is built for questions at scale. Forge is for people who need a page that matches their business and a single home for analytics.",
    theyWin: [
      "Mature multi-step logic, scoring, and survey exports",
      "Brand recognition in large enterprises",
    ],
    weWin: [
      "One workflow for pages, forms, proposals, and decks in Forge",
      "A hosted, branded result without survey-tool chrome",
    ],
    bestForThem: "You are running a long research or HR survey and need A/B blocks and team workspaces.",
    bestForUs: "You are a small business that wanted a good-looking form in an hour — and might ship a deck next week in the same place.",
    workflowLink: "/workflows/contact-form",
  },
  calendly: {
    slug: "calendly",
    path: "/compare/forge-vs-calendly",
    meta: {
      title: "Forge vs Calendly — booking + page in one link | Forge",
      description:
        "Calendly is scheduling-first. Forge bundles calendar-ready fields into a branded mini-app for one link, fewer logins, and the rest of your Forge work.",
    },
    h1: "Forge vs Calendly",
    sub: "Calendly lives and breathes round-robin, routing rules, and team calendars. Forge adds booking to the same surface as the rest of your offer.",
    theyWin: [
      "Deep scheduling rules, CRM connectors, and team round-robin",
    ],
    weWin: [
      "A single public link that is also a proposal, a landing, or a deck when you need that",
    ],
    bestForThem: "A busy sales org that only cares about the calendar, not a bespoke page.",
    bestForUs: "A contractor, studio, or founder who said “I just need people to book and tell me what the job is.”",
    workflowLink: "/workflows/contact-form",
  },
  carrd: {
    slug: "carrd",
    path: "/compare/forge-vs-carrd",
    meta: {
      title: "Forge vs Carrd — AI mini-app vs one-page site builder | Forge",
      description:
        "Carrd is a focused one-page site builder. Forge is the mini-app platform: describe a page, add forms, proposals, and decks, track everything together.",
    },
    h1: "Forge vs Carrd",
    sub: "Carrd is great at simple one-pagers. Forge is for when the “one-pager” is one of many things you ship from the same Studio.",
    theyWin: ["Fast visual editing with a huge template set", "Low cost for a single static page"],
    weWin: [
      "The same product for a launch page, a form, a proposal, and a deck",
      "Plain-language generation when you are starting from a sentence, not a layout",
    ],
    bestForThem: "A fast visual tweak to a one-page site with almost no copy.",
    bestForUs: "You are okay typing what you need and want analytics and handoff paths without starting over in another tool.",
    workflowLink: "/workflows/landing-page",
  },
  pandadoc: {
    slug: "pandadoc",
    path: "/compare/forge-vs-pandadoc",
    meta: {
      title: "Forge vs PandaDoc — proposal & quote alternative | Forge",
      description:
        "PandaDoc is CLM and approvals at enterprise depth. Forge gets a credible proposal in front of a client fast, with read tracking in Forge when enabled.",
    },
    h1: "Forge vs PandaDoc",
    sub: "PandaDoc is contract infrastructure. Forge is a fast path from “here is what I will do and what it costs” to a link your client can open.",
    theyWin: [
      "CLM, redlines, and enterprise approval chains",
    ],
    weWin: [
      "A first client-ready version from a short brief",
      "The same org account as your other mini-apps",
    ],
    bestForThem: "You need a signed paper trail across departments.",
    bestForUs: "You need a professional quote this afternoon and a clean handoff to PDF or email.",
    workflowLink: "/workflows/proposal",
  },
  "canva-pitch-decks": {
    slug: "canva-pitch-decks",
    path: "/compare/forge-vs-canva-pitch-decks",
    meta: {
      title: "Forge vs Canva for pitch decks | Forge",
      description:
        "Canva is a design surface with a massive template set. Forge writes structure and first-pass copy from a prompt so you are not starting from a blank 16:9.",
    },
    h1: "Forge vs Canva for pitch decks",
    sub: "Canva is the right home for pixel-tweaking and design libraries. Forge is for a credible narrative quickly — then you export when a file is required.",
    theyWin: [
      "Templates and design assets for every industry",
    ],
    weWin: [
      "A story-shaped deck from a prompt, then slide-by-slide refinement in language",
      "Presenter-friendly web view with export when you need PPTX or PDF from Page Detail",
    ],
    bestForThem: "You already know the story and are polishing pixels.",
    bestForUs: "You have the meeting in two days and need something coherent on the screen first.",
    workflowLink: "/workflows/pitch-deck",
  },
};

export function compareMetadata(slug: CompareSlug): Metadata {
  const c = COMPARE_PAGES[slug];
  return {
    title: c.meta.title,
    description: c.meta.description,
    alternates: { canonical: c.path },
    openGraph: {
      title: c.meta.title,
      description: c.meta.description,
      url: `${SITE_URL}${c.path}`,
      type: "article",
    },
  };
}
