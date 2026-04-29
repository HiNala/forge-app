import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { FinalCta } from "@/components/marketing/final-cta";
import { handoff } from "@/lib/copy";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Export & handoff — take your mini-app with you | GlideDesign",
  description:
    "What ships today and what is on the canvas roadmap: HTML, PDF, PPTX, Figma, Next.js, Expo. Or keep it hosted on GlideDesign with full analytics.",
  alternates: { canonical: "/handoff" },
  openGraph: {
    title: "Export & handoff | GlideDesign",
    description: "Every workflow has a path off GlideDesign when you are ready. Until then, one hosted link and honest analytics.",
    url: `${SITE_URL}/handoff`,
    type: "website",
  },
};

const ROWS: { surface: string; today: string; next: string }[] = [
  { surface: "Contact & booking", today: "Hosted page, submissions inbox, HTML snapshots", next: "Embeddable widget, tighter calendar sync" },
  { surface: "Landing page", today: "Hosted page, export snapshots as available", next: "Static export packs, Framer-style handoff" },
  { surface: "Proposal", today: "Share link, signed PDF / export from Page Detail", next: "Same path, clearer checklist in product" },
  { surface: "Pitch deck", today: "Web deck, PPTX / PDF from Page Detail", next: "Presenter mode polish" },
  { surface: "Mobile screen / website (canvas)", today: "Preview in Studio", next: "Expo / Next.js / Figma layers (V2-P02, V2-P03)" },
];

export default function HandoffPage() {
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <span className="section-label mb-4">Handoff</span>
      <h1 className="font-display text-[clamp(40px,6vw,64px)] font-bold leading-[0.95] text-text">
        {handoff.takeWithYou}
      </h1>
      <p className="mt-5 max-w-[60ch] font-body text-lg font-light text-text-muted">
        {handoff.handoffLine}
      </p>

      <div className="mt-10 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] border-collapse text-left font-body text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-elevated">
              <th className="px-4 py-3 font-semibold">Surface</th>
              <th className="px-4 py-3 font-semibold">In GlideDesign now</th>
              <th className="px-4 py-3 font-semibold">On the roadmap</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.surface} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-text">{r.surface}</td>
                <td className="px-4 py-3 text-text-muted">{r.today}</td>
                <td className="px-4 py-3 text-text-muted">{r.next}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-8 font-body text-sm text-text-muted">
        30s video walkthrough: Figma import of a mobile screen and a Vercel deploy of an exported static page will ship with the canvas export missions.{" "}
        <Link className="text-accent underline-offset-4 hover:underline" href="/workflows/mobile-app">
          Mobile workflow
        </Link>{" "}
        ·{" "}
        <Link className="text-accent underline-offset-4 hover:underline" href="/workflows/website">
          Web workflow
        </Link>
      </p>
      <FinalCta />
    </Container>
  );
}
