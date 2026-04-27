import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { COMPARE_PAGES, COMPARE_SLUGS } from "@/lib/compare-pages";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Compare",
  description: "Honest side-by-sides: Forge vs Typeform, Calendly, Carrd, PandaDoc, and Canva for decks.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Compare | Forge",
    url: `${SITE_URL}/compare`,
  },
};

export default function CompareHubPage() {
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <span className="section-label mb-4">Compare</span>
      <h1 className="font-display text-[clamp(36px,5vw,56px)] font-bold leading-[0.95] text-text">
        Honest side-by-sides
      </h1>
      <p className="mt-4 max-w-[55ch] font-body text-lg font-light text-text-muted">
        We are not a generic &quot;we&apos;re the best for everyone&quot; company. These pages name where other tools
        are stronger, when Forge is the right fit, and when you should use both.
      </p>
      <ul className="mt-10 space-y-3">
        {COMPARE_SLUGS.map((slug) => {
          const c = COMPARE_PAGES[slug];
          return (
            <li key={slug}>
              <Link
                href={`/compare/forge-vs-${slug}`}
                className="block rounded-2xl border border-border bg-surface p-4 font-body text-text transition hover:border-accent"
              >
                <span className="font-semibold">{c.h1}</span>
                <span className="ml-2 text-sm text-text-muted">— {c.sub.slice(0, 90)}…</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Container>
  );
}
