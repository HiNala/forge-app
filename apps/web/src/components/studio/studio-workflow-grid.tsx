"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioGridTile = {
  id: string;
  label: string;
  teaser: string;
  /** Shown on hover / focus */
  examplePrompt: string;
  /** Priming for main /studio (page-backed generation) */
  workflowQuery?: string;
  /** Navigate to canvas Studio instead of priming text */
  studioHref?: string;
  /** Last tile: browse templates */
  browseTemplates?: boolean;
};

/** Categorized tiles — exported for template gallery filters (P-06). */
export const STUDIO_WORKFLOW_GRID_ROWS: { category: string; tiles: StudioGridTile[] }[] = [
  {
    category: "Pages & sites",
    tiles: [
      {
        id: "web_page",
        label: "Web page",
        teaser: "One focused page for an offer or story.",
        examplePrompt: "A web page for my coaching offer with hero, testimonials, and booking CTA.",
        workflowQuery: "landing-page",
      },
      {
        id: "website",
        label: "Website",
        teaser: "Multi-page site on the web canvas.",
        examplePrompt: "A three-page website for a local bakery: home, menu, and contact.",
        studioHref: "/studio/web",
      },
      {
        id: "landing",
        label: "Landing page",
        teaser: "Launch, promo, or single CTA.",
        examplePrompt: "A product launch landing with features, pricing sketch, and email capture.",
        workflowQuery: "landing-page",
      },
      {
        id: "coming_soon",
        label: "Coming soon",
        teaser: "Waitlist before you ship.",
        examplePrompt: "A coming soon page with waitlist for my SaaS beta and three teaser bullets.",
        workflowQuery: "coming-soon",
      },
    ],
  },
  {
    category: "Forms & gathering",
    tiles: [
      {
        id: "contact",
        label: "Contact / booking",
        teaser: "Leads and optional scheduling.",
        examplePrompt: "A contact form for my plumbing business with phone, address, and photo upload.",
        workflowQuery: "contact-form",
      },
      {
        id: "survey",
        label: "Survey",
        teaser: "NPS, feedback, research.",
        examplePrompt: "A 7-question customer satisfaction survey after checkout.",
        workflowQuery: "survey",
      },
      {
        id: "quiz",
        label: "Quiz",
        teaser: "Outcomes or scored tests.",
        examplePrompt: "A 6-question quiz that recommends which service tier fits the customer.",
        workflowQuery: "quiz",
      },
      {
        id: "rsvp",
        label: "Event RSVP",
        teaser: "Headcount and guest questions.",
        examplePrompt: "An RSVP page for a company party with meal choice and plus-one.",
        workflowQuery: "event-rsvp",
      },
    ],
  },
  {
    category: "Sales & business",
    tiles: [
      {
        id: "proposal",
        label: "Proposal",
        teaser: "Scope, price, accept/decline.",
        examplePrompt: "A one-page proposal for a kitchen remodel with three scope options.",
        workflowQuery: "proposal",
      },
      {
        id: "pitch_deck",
        label: "Pitch deck",
        teaser: "Slides for investors or customers.",
        examplePrompt: "A 10-slide pitch deck for a pre-seed climate hardware startup.",
        workflowQuery: "pitch-deck",
      },
      {
        id: "menu",
        label: "Menu / services",
        teaser: "Food or service menus on mobile.",
        examplePrompt: "A dinner menu for a bistro with appetizers, mains, and wine by the glass.",
        workflowQuery: "menu",
      },
      {
        id: "gallery",
        label: "Gallery / portfolio",
        teaser: "Images, proof, inquiry.",
        examplePrompt: "A wedding photography portfolio with gallery grid and booking form.",
        workflowQuery: "gallery",
      },
    ],
  },
  {
    category: "Personal & social",
    tiles: [
      {
        id: "link_in_bio",
        label: "Link in bio",
        teaser: "One link for your profile.",
        examplePrompt: "A link-in-bio for a music teacher with lesson booking, YouTube, and tip jar.",
        workflowQuery: "link-in-bio",
      },
      {
        id: "resume",
        label: "Resume / site",
        teaser: "Hire-me page smarter than a PDF.",
        examplePrompt: "A resume site for a product designer with projects, skills, and contact.",
        workflowQuery: "resume",
      },
      {
        id: "mobile_app",
        label: "Mobile app",
        teaser: "Screens on the mobile canvas.",
        examplePrompt: "A mobile home screen for a fitness app with schedule and progress cards.",
        studioHref: "/studio/mobile",
      },
      {
        id: "browse",
        label: "Browse templates",
        teaser: "Starter library for every workflow.",
        examplePrompt: "",
        browseTemplates: true,
      },
    ],
  },
];

export function StudioWorkflowGrid({
  disabled,
  onPrimePrompt,
}: {
  disabled?: boolean;
  onPrimePrompt: (prompt: string, workflowQuery?: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="mt-8 w-full max-w-4xl">
      {STUDIO_WORKFLOW_GRID_ROWS.map((row) => (
        <div key={row.category} className="mb-6 last:mb-0">
          <p className="mb-2 px-0.5 font-body text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {row.category}
          </p>
          <div
            className={cn(
              "grid gap-2",
              "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
            )}
          >
            {row.tiles.map((t) => {
              if (t.browseTemplates) {
                return (
                  <Link
                    key={t.id}
                    href="/app-templates"
                    className={cn(
                      "group flex min-h-[88px] flex-col rounded-2xl border border-dashed px-3 py-3 text-left transition-colors",
                      "border-border bg-bg-elevated/40 text-text hover:border-accent hover:text-accent",
                      disabled && "pointer-events-none opacity-50",
                    )}
                  >
                    <span className="font-medium font-body text-sm">{t.label}</span>
                    <span className="mt-1 line-clamp-2 text-xs text-text-muted group-hover:text-accent/90">
                      {t.teaser}
                    </span>
                  </Link>
                );
              }

              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled}
                  title={t.examplePrompt}
                  onClick={() => {
                    if (t.studioHref) {
                      router.push(t.studioHref);
                      return;
                    }
                    onPrimePrompt(t.examplePrompt, t.workflowQuery);
                  }}
                  className={cn(
                    "group flex min-h-[88px] min-w-0 flex-col rounded-2xl border px-3 py-3 text-left transition-colors",
                    "border-border bg-surface text-text shadow-sm hover:border-accent hover:text-accent",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <span className="font-medium font-body text-sm">{t.label}</span>
                  <span className="mt-1 line-clamp-2 text-xs text-text-muted group-hover:text-text">
                    {t.teaser}
                  </span>
                  <span className="mt-1 hidden text-[11px] text-text-subtle group-hover:line-clamp-3 sm:block">
                    {t.examplePrompt}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
