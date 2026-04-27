import type { Metadata } from "next";
import Link from "next/link";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FinalCta } from "@/components/marketing/final-cta";
import { GallerySection } from "@/components/marketing/gallery-section";
import { HeroDemoLazy } from "@/components/marketing/hero-demo-lazy";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingJsonLd } from "@/components/marketing/json-ld";
import { DifferentiationSection } from "@/components/marketing/differentiation-section";
import { WorkflowHeroPanel } from "@/components/marketing/workflow-hero-panel";
import { StatsSection } from "@/components/marketing/stats-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { TickerSection } from "@/components/marketing/ticker-section";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cta, brand } from "@/lib/copy";
import { LANDING_FAQ, SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Forge — mini-apps in minutes | AI form, deck, landing, and page builder",
  description:
    "The AI mini-app platform: forms, landing pages, proposals, pitch decks, mobile screens, and sites. Describe it, ship it, share it, track it — no database to run.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Forge — mini-apps in minutes",
    description:
      "Describe what you need. Forge builds hosted mini-apps you can share, track, and export.",
    url: SITE_URL,
    siteName: "Forge",
    type: "website",
  },
};

export default function MarketingHomePage() {
  return (
    <>
      <MarketingJsonLd />

      {/* HERO */}
      <section
        className="relative overflow-hidden pb-0 pt-20 sm:pt-28 lg:pt-32"
        id="top"
        aria-label="Marketing hero"
      >
        <div className="hero-orb" aria-hidden />
        <div className="relative z-10 text-center">
          <Container max="xl">
            <h1 className="animate-fade-up font-display text-[clamp(52px,8vw,96px)] font-bold leading-[0.93] tracking-tight text-text">
              {brand.tagline}
            </h1>
            <p className="animate-fade-up-d1 mx-auto mt-6 max-w-[50ch] font-body text-lg font-light leading-relaxed text-text-muted">
              {brand.homeHeroSubhead}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="min-h-11 min-w-[8.5rem]">
                <Link href="/signup?source=hero">{cta.startFree}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="min-h-11">
                <a href="#demo">{cta.seeHow}</a>
              </Button>
            </div>
            <p className="mt-4 font-body text-sm font-light text-text-subtle">
              {brand.trustLine}
            </p>
            <WorkflowHeroPanel />
          </Container>
          <div id="demo" className="scroll-mt-20">
            <HeroDemoLazy />
          </div>
        </div>
      </section>

      <DifferentiationSection />

      {/* TICKER */}
      <TickerSection />

      {/* STATS */}
      <StatsSection />

      {/* HOW IT WORKS */}
      <HowItWorks />

      {/* GALLERY */}
      <GallerySection />

      {/* TESTIMONIALS */}
      <TestimonialsSection />

      {/* FAQ */}
      <section className="border-t border-border py-20 sm:py-24">
        <Container max="xl">
          <div className="mb-12">
            <span className="section-label mb-3">Common questions</span>
            <h2 className="font-display text-[clamp(28px,3.5vw,46px)] font-bold leading-[1] tracking-tight text-text">
              Straight answers.
            </h2>
          </div>
          <FaqAccordion items={LANDING_FAQ} className="max-w-3xl" />
        </Container>
      </section>

      {/* CTA */}
      <FinalCta />
    </>
  );
}
