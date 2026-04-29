import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Roadmap · GlideDesign",
  description:
    "What we are shipping next for GlideDesign: product brain, canvases, exports, and team workflows.",
  openGraph: {
    title: "Roadmap · GlideDesign",
    url: `${SITE_URL}/roadmap`,
  },
};

const SECTIONS = [
  {
    id: "integrations",
    title: "Integrations",
    bullets: [
      "Zapier public app — multi-week initiative; automate via webhook endpoints where available.",
      "Slack — outbound webhook templates for submissions and bookings.",
      "Apple Calendar via CalDAV — research phase; Google Calendar stays the supported path today.",
      "Regional payment methods — phased by market demand.",
    ],
  },
  {
    id: "webhooks",
    title: "HTTP webhooks",
    bullets: [
      "Org-scoped submission and automation webhooks ship with Automation settings when enabled for your plan.",
      "Use them with Zapier, Make, or your own ingress without waiting for our packaged Zap.",
    ],
  },
  {
    id: "canvas",
    title: "Studio canvas",
    bullets: ["Mobile and web canvas refinements tied to SSE region-editing previews.", "Multi-page ZIP export when bundled asset pipeline lands."],
  },
] as const;

export default function RoadmapPage() {
  return (
    <Container max="xl" className="py-16 sm:py-24">
      <header className="mb-14">
        <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-subtle">Product roadmap</p>
        <h1 className="mt-2 text-display-lg text-text">Now, next, later.</h1>
        <p className="mt-4 max-w-2xl text-body-sm text-text-muted">
          GlideDesign is a full product design workspace: strategy, screens, code, exports, and next moves. This is honest sequencing, not vaporware billed as shipped.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <article
            key={s.id}
            id={s.id}
            className="scroll-mt-28 rounded-[32px] border border-border bg-surface p-6 shadow-md sm:p-8"
          >
            <h2 className="text-h3 text-text">{s.title}</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 font-body text-sm leading-relaxed text-text-muted marker:text-accent">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="mt-14 text-center">
        <Link
          href="/pricing"
          className="font-body text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Back to Pricing
        </Link>
      </div>
    </Container>
  );
}
