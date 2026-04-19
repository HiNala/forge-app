import type { Metadata } from "next";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FinalCta } from "@/components/marketing/final-cta";
import { GallerySection } from "@/components/marketing/gallery-section";
import { HeroDemoLazy } from "@/components/marketing/hero-demo-lazy";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingJsonLd } from "@/components/marketing/json-ld";
import { StatsSection } from "@/components/marketing/stats-section";
import { TestimonialsSection } from "@/components/marketing/testimonials-section";
import { TickerSection } from "@/components/marketing/ticker-section";
import { Container } from "@/components/ui/container";
import { LANDING_FAQ, SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Type a sentence. Get a live page.",
  description:
    "Describe what you need — booking form, RSVP, daily menu, sales proposal — and Forge builds and hosts it in seconds.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Forge — Type a sentence. Get a live page.",
    description:
      "AI-powered mini-pages. Describe a page, get a hosted link, collect responses.",
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
      <section className="relative overflow-hidden pb-0 pt-20 sm:pt-28 lg:pt-32">
        <div className="hero-orb" aria-hidden />
        <div className="relative z-10 text-center">
          <Container max="xl">
            <h1 className="animate-fade-up font-display text-[clamp(52px,8vw,96px)] font-bold leading-[0.93] tracking-tight text-text">
              Type a sentence.
              <br />
              <span className="text-accent">Get a live page.</span>
            </h1>
            <p className="animate-fade-up-d1 mx-auto mt-6 max-w-[50ch] font-body text-lg font-light leading-relaxed text-text-muted">
              Booking forms, RSVPs, daily menus, sales proposals — describe it once
              and Forge builds, hosts, and tracks it. No code, no designer.
            </p>
          </Container>
          <HeroDemoLazy />
        </div>
      </section>

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
