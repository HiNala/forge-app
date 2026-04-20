import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Forge — Describe what you need. Get a page.",
    template: "%s · Forge",
  },
  description:
    "Describe what you need — Forge streams a real page preview, then hosts it. Forms, RSVPs, menus, proposals.",
  openGraph: {
    title: "Forge — Describe what you need. Get a page.",
    description:
      "Hosted mini-pages from one prompt. Live demo on the homepage; examples and pricing inside.",
    type: "website",
  },
};

/** Avoid static prerender edge cases for marketing routes that share global providers. */
export const dynamic = "force-dynamic";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-bg">
      <MarketingNav />
      <main className="flex flex-1 flex-col">{children}</main>
      <MarketingFooter />
    </div>
  );
}
