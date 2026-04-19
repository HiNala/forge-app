import type { Metadata } from "next";
import { PricingPageClient } from "@/components/marketing/pricing-page-client";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Starter, Pro, and Enterprise plans for Forge — trials, comparison, and billing FAQ.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · Forge",
    description: "Simple tiers for solo operators and teams. Annual billing saves two months.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
