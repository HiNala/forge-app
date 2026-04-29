import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "GlideDesign — Glide from idea to product",
    template: "%s · GlideDesign",
  },
  description:
    "GlideDesign is the AI design tool that turns plain English into strategy, screens, code, and next moves.",
  openGraph: {
    title: "GlideDesign — Glide from idea to product",
    description:
      "AI-powered product design: describe once, get strategy, screens, code, and next moves.",
    type: "website",
    siteName: "GlideDesign",
    images: ["/marketing/og/page-1.svg"],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@glidedesignai",
    images: ["/marketing/og/page-1.svg"],
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
