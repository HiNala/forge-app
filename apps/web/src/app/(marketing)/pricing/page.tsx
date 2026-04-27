import type { Metadata } from "next";
import { PricingPageClient } from "@/components/marketing/pricing-page-client";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Pricing — Free, Pro, Max | Forge",
  description:
    "Free, Pro, and Max tiers for the Forge mini-app platform. Session-based usage with a weekly cap — honest limits, no surprise AI line items. Details finalize with billing (V2-P04).",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing · Forge",
    description: "Free, Pro, and Max. See usage the way you will feel it: one clear percentage bar.",
    url: `${SITE_URL}/pricing`,
    type: "website",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
