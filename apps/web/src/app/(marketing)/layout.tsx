import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Forge — Pages from a sentence",
    template: "%s · Forge",
  },
  description:
    "Describe what you need in plain English. Forge builds a branded, hosted page — forms, RSVPs, menus, and more.",
  openGraph: {
    title: "Forge — Pages from a sentence",
    description:
      "AI-powered mini-app builder for teams. Describe a page, publish a link, collect responses.",
    type: "website",
  },
};

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <MarketingNav />
      <main className="flex flex-1 flex-col">{children}</main>
      <MarketingFooter />
    </div>
  );
}
