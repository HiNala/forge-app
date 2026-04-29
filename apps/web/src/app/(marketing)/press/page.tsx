import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { GlideDesignLogo } from "@/components/icons/logo";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Press kit | GlideDesign",
  description: "Logos, boilerplate, product overview, and press contact for GlideDesign — the mini-app platform.",
  alternates: { canonical: "/press" },
  openGraph: {
    title: "Press kit · GlideDesign",
    description: "Download brand assets, boilerplate, and contact the team.",
    url: `${SITE_URL}/press`,
  },
};

const BOILER = {
  one: "GlideDesign is a mini-app platform: describe a form, landing page, proposal, deck, or site, and GlideDesign hosts it with analytics and export paths so teams can move fast without running a database.",
  three:
    "GlideDesign is a mini-app platform for real businesses. Teams describe what they need in plain language and receive hosted pages and flows — contact forms, proposals, pitch decks, landings, and (on the roadmap) mobile and web canvas exports. " +
    "Work stays on-brand, analytics show what happened after the link went out, and handoff formats meet teams where they build next. " +
    "GlideDesign is built to feel calm and direct — fewer tools, one Studio, honest usage limits.",
  five:
    "Lucy and similar operators were tired of gluing together forms, document tools, and one-off pages. " +
    "GlideDesign answers with one Studio: describe the outcome, get a link, see analytics, export when the work graduates. " +
    "The product is intentionally narrower than a full app builder — that focus is the point. " +
    "Positioning, pricing, and canvas depth continue to follow public missions (V2). " +
    "Press: press@glidedesign.ai — we respond to journalists and podcast producers within two U.S. business days when we can help.",
} as const;

export default function PressPage() {
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <h1 className="font-display text-[clamp(36px,5vw,56px)] font-bold text-text">Press kit</h1>
      <p className="mt-4 max-w-[60ch] font-body text-lg font-light text-text-muted">
        Logos, boilerplate, and how to reach us. High-res product screenshots and founder photo ship as the asset pack is finalized — placeholders noted below.
      </p>

      <section className="mt-12 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-bold text-text">Logos</h2>
        <p className="mt-2 font-body text-sm text-text-muted">
          SVG and PNG (light, dark, monochrome) — use the in-app mark as a stand-in until the public asset pack is published to this URL.
        </p>
        <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-surface p-6">
          <GlideDesignLogo className="text-accent" size="lg" />
          <p className="font-body text-sm text-text-muted">
            Vector: see <code className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs">apps/web/src/components/icons/logo</code> in the repo, or
            contact <a className="text-accent underline" href="mailto:press@glidedesign.ai">press@glidedesign.ai</a> for a zip.
          </p>
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-bold text-text">Product visuals</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-text-muted">
          <li>12× hi-res (planned): six workflow families × Studio, hosted page, and export moment.</li>
          <li>30s screen recording (planned): from prompt to live link in one take.</li>
        </ul>
        <p className="mt-4 font-body text-sm text-text-muted">Placeholder image slot for OG-style preview (replace when assets land):</p>
        <div className="relative mt-2 aspect-1200/630 w-full max-w-2xl overflow-hidden rounded-2xl border border-dashed border-border bg-bg-elevated">
          <div className="absolute inset-0 flex items-center justify-center font-body text-sm text-text-subtle">
            Hero / Studio composite — 1200×630
          </div>
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-bold text-text">Founder</h2>
        <p className="mt-2 font-body text-sm text-text-muted">Photo (Brian) — TBD. Square crop, print-ready, light background.</p>
        <div className="mt-3 flex h-40 w-40 items-center justify-center rounded-full border border-dashed border-border bg-surface text-xs text-text-subtle">
          Photo
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-bold text-text">Boilerplate</h2>
        <div className="mt-4 space-y-4 font-body text-sm leading-relaxed text-text-muted">
          <p>
            <span className="font-semibold text-text">One sentence. </span>
            {BOILER.one}
          </p>
          <p>
            <span className="font-semibold text-text">Three sentences. </span>
            {BOILER.three}
          </p>
          <p>
            <span className="font-semibold text-text">Five sentences. </span>
            {BOILER.five}
          </p>
        </div>
      </section>

      <section className="mt-10 border-t border-border pt-10">
        <h2 className="font-display text-2xl font-bold text-text">Press contact</h2>
        <p className="mt-2 font-body text-sm text-text-muted">
          <a className="text-accent underline" href="mailto:press@glidedesign.ai">
            press@glidedesign.ai
          </a>
        </p>
        <p className="mt-4 font-body text-sm">
          <Link className="text-accent underline" href="/">
            glidedesign.ai
          </Link>{" "}
          — {SITE_URL}
        </p>
      </section>
    </Container>
  );
}
