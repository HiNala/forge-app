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
    path: "/compare/typeform",
    meta: {
      title: "GlideDesign vs Typeform - AI form builder alternative | GlideDesign",
      description:
        "Typeform is survey-first. GlideDesign is a mini-app platform for branded pages, forms, analytics, decks, and proposals from one Studio.",
    },
    h1: "GlideDesign vs Typeform",
    sub: "Typeform is built for questions at scale. GlideDesign is for teams that need a branded page, a form, analytics, and the next product move in one place.",
    theyWin: [
      "Mature multi-step logic, scoring, and survey exports",
      "Brand recognition in large enterprise survey workflows",
    ],
    weWin: [
      "One workflow for pages, forms, proposals, and decks",
      "A hosted, branded result without survey-tool chrome",
      "Product strategy and code handoff alongside the form",
    ],
    bestForThem: "You are running a long research or HR survey and need deep survey operations.",
    bestForUs: "You want a good-looking form in an hour and might ship a deck or proposal next week in the same place.",
    workflowLink: "/workflows/contact-form",
  },
  calendly: {
    slug: "calendly",
    path: "/compare/calendly",
    meta: {
      title: "GlideDesign vs Calendly - booking and page in one link | GlideDesign",
      description:
        "Calendly is scheduling-first. GlideDesign bundles calendar-ready fields into branded mini-apps with analytics and product handoff.",
    },
    h1: "GlideDesign vs Calendly",
    sub: "Calendly lives and breathes scheduling rules. GlideDesign adds booking to the same surface as the rest of your offer.",
    theyWin: ["Deep scheduling rules, CRM connectors, and team round-robin"],
    weWin: [
      "A single public link that can also be a proposal, landing page, or deck",
      "Design generation, branded copy, and analytics around the booking flow",
    ],
    bestForThem: "A busy sales org that only cares about calendar routing.",
    bestForUs: "A contractor, studio, or founder who needs people to book and tell you what the job is.",
    workflowLink: "/workflows/contact-form",
  },
  carrd: {
    slug: "carrd",
    path: "/compare/carrd",
    meta: {
      title: "GlideDesign vs Carrd - AI mini-app vs one-page site tool | GlideDesign",
      description:
        "Carrd is a focused one-page site builder. GlideDesign is a mini-app platform for generated pages, forms, proposals, decks, analytics, and export.",
    },
    h1: "GlideDesign vs Carrd",
    sub: "Carrd is great at simple one-pagers. GlideDesign is for when the one-pager is one of many product surfaces you ship from the same Studio.",
    theyWin: ["Fast visual editing with a huge template set", "Low cost for a single static page"],
    weWin: [
      "The same product for a launch page, a form, a proposal, and a deck",
      "Plain-language generation when you are starting from a sentence, not a layout",
      "Analytics and handoff paths without moving tools",
    ],
    bestForThem: "A fast visual tweak to a simple one-page site with almost no product logic.",
    bestForUs: "You want to describe what you need and get a product-shaped first draft with analytics and exports.",
    workflowLink: "/workflows/landing-page",
  },
  pandadoc: {
    slug: "pandadoc",
    path: "/compare/pandadoc",
    meta: {
      title: "GlideDesign vs PandaDoc - proposal and quote alternative | GlideDesign",
      description:
        "PandaDoc is CLM and approvals at enterprise depth. GlideDesign gets a credible proposal in front of a client fast, with read tracking and export.",
    },
    h1: "GlideDesign vs PandaDoc",
    sub: "PandaDoc is contract infrastructure. GlideDesign is a fast path from scope and price to a link your client can open.",
    theyWin: ["CLM, redlines, and enterprise approval chains"],
    weWin: [
      "A first client-ready version from a short brief",
      "The same workspace as your other mini-apps",
      "A proposal that can become a page, intake form, or follow-up deck",
    ],
    bestForThem: "You need a signed paper trail across departments.",
    bestForUs: "You need a professional quote this afternoon and a clean handoff to PDF or email.",
    workflowLink: "/workflows/proposal",
  },
  "canva-pitch-decks": {
    slug: "canva-pitch-decks",
    path: "/compare/canva-pitch-decks",
    meta: {
      title: "GlideDesign vs Canva for pitch decks | GlideDesign",
      description:
        "Canva is a design surface with a massive template set. GlideDesign writes structure and first-pass copy from a prompt, then exports when needed.",
    },
    h1: "GlideDesign vs Canva for pitch decks",
    sub: "Canva is the right home for pixel-tweaking and design libraries. GlideDesign is for getting a credible narrative quickly, then exporting when a file is required.",
    theyWin: ["Templates and design assets for every industry", "Deep manual editing controls"],
    weWin: [
      "A story-shaped deck from a prompt, then slide-by-slide refinement in language",
      "Presenter-friendly web view with PDF and PPTX export paths",
      "The same product brain that can turn the deck into a landing page or proposal",
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
