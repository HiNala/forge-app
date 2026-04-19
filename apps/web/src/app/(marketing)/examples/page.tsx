import type { Metadata } from "next";
import Link from "next/link";
import { GallerySection } from "@/components/marketing/gallery-section";
import { Container } from "@/components/ui/container";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Examples",
  description:
    "Hand-picked template previews — booking, RSVP, menus, proposals, and more built with Forge.",
  alternates: { canonical: "/examples" },
  openGraph: {
    title: "Examples · Forge",
    description: "See what Forge generates for real use cases.",
    url: `${SITE_URL}/examples`,
    type: "website",
  },
};

export default function ExamplesPage() {
  return (
    <>
      {/* Header */}
      <section className="border-b border-border pb-14 pt-20 sm:pb-16 sm:pt-28">
        <Container max="xl">
          <div className="max-w-[42ch]">
            <span className="section-label mb-4">Examples</span>
            <h1 className="font-display text-[clamp(40px,6vw,72px)] font-bold leading-[0.95] tracking-tight text-text">
              Pages built
              <br />
              <span className="text-accent">in one sentence.</span>
            </h1>
            <p className="mt-5 font-body text-lg font-light leading-relaxed text-text-muted">
              Each example below was generated from a single prompt. Open any card to see the live
              HTML — then sign in to clone it into your workspace.
            </p>
          </div>
        </Container>
      </section>

      {/* Gallery */}
      <GallerySection />

      {/* Bottom CTA */}
      <section className="border-t border-border py-16 sm:py-20">
        <Container max="xl" className="text-center">
          <h2 className="font-display text-[clamp(28px,4vw,52px)] font-bold leading-[0.95] tracking-tight text-text">
            Ready to build yours?
          </h2>
          <p className="mx-auto mt-4 max-w-[40ch] font-body text-base font-light text-text-muted">
            Describe what you need in plain language. Forge builds and hosts it in seconds.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup?source=examples"
              className="inline-flex min-h-11 items-center rounded-xl bg-text px-6 py-3 font-body text-sm font-semibold text-bg transition-opacity hover:opacity-80"
            >
              Start free →
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center font-body text-sm font-medium text-text-muted underline-offset-4 hover:underline"
            >
              See how it works
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
