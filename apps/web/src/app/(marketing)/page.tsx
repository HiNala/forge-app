import type { Metadata } from "next";
import { FaqAccordion } from "@/components/marketing/faq-accordion";
import { FinalCta } from "@/components/marketing/final-cta";
import { GallerySection } from "@/components/marketing/gallery-section";
import { HeroDemoLazy } from "@/components/marketing/hero-demo-lazy";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingJsonLd } from "@/components/marketing/json-ld";
import { Container } from "@/components/ui/container";
import { LANDING_FAQ, SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Pages from a sentence",
  description:
    "Describe what you need in plain English. Forge builds a branded, hosted page — forms, RSVPs, menus, proposals, and more.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Forge — Pages from a sentence",
    description:
      "AI-powered mini-pages for teams. Describe a page, publish a link, collect responses.",
    url: SITE_URL,
    siteName: "Forge",
    type: "website",
  },
};

export default function MarketingHomePage() {
  return (
    <>
      <MarketingJsonLd />
      <section className="relative">
        <Container max="xl">
          <div className="mx-auto max-w-[65ch] px-0 pt-16 text-center sm:pt-24">
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-text sm:text-5xl md:text-6xl">
              Describe what you need.
              <br />
              <span className="text-accent">Get a page.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-[65ch] text-lg leading-relaxed text-text-muted sm:text-xl">
              Forge turns a sentence into a hosted, branded mini-page — forms, RSVPs, menus,
              proposals, and more.
            </p>
          </div>
        </Container>
        <HeroDemoLazy />
      </section>
      <HowItWorks />
      <GallerySection />
      <section className="border-t border-border py-16 sm:py-20">
        <Container max="xl">
          <h2 className="text-center font-display text-3xl font-semibold text-text sm:text-4xl">
            Questions
          </h2>
          <p className="mx-auto mt-4 max-w-[65ch] text-center text-lg text-text-muted">
            Straight answers — no spin.
          </p>
          <FaqAccordion items={LANDING_FAQ} className="mx-auto mt-10 max-w-3xl" />
        </Container>
      </section>
      <FinalCta />
    </>
  );
}
