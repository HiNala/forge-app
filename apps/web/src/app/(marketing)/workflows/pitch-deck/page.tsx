import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "Pitch decks",
  description: "Investor-ready decks from your story — web-native, presentable, exportable.",
};

export default function WorkflowPitchDeckPage() {
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <span className="section-label mb-4">Pitch decks</span>
      <h1 className="mt-3 font-display text-[clamp(40px,6vw,72px)] font-bold leading-[0.95] tracking-tight text-text">
        Your narrative,
        <br />
        <span className="text-accent">one slide at a time.</span>
      </h1>
      <p className="mt-5 max-w-[60ch] font-body text-lg font-light leading-relaxed text-text-muted">
        Describe the arc you need — Forge composes a scrollable deck with presenter mode, analytics per slide,
        and exports when you need a file.
      </p>
      <ul className="mt-8 space-y-2 font-body text-sm text-text">
        {[
          "Narrative frameworks for common pitch stories",
          "Charts and imagery with progressive loading",
          "PDF and PPTX export from Page Detail",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent shrink-0" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup?workflow=pitch_deck"
          className="inline-flex min-h-11 items-center rounded-xl bg-text px-6 py-3 font-body text-sm font-semibold text-bg transition-opacity hover:opacity-80"
        >
          Start free →
        </Link>
        <Link href="/templates?q=deck" className="inline-flex min-h-11 items-center font-body text-sm font-medium text-text-muted underline-offset-4 hover:underline">
          Browse templates
        </Link>
      </div>
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="font-display text-2xl font-bold text-text">Frequently asked</h2>
        <dl className="mt-6 divide-y divide-border">
          <div className="py-4">
            <dt className="font-body text-sm font-bold text-text">Is this PowerPoint?</dt>
            <dd className="mt-1.5 font-body text-sm font-light text-text-muted">The canonical experience is web-native; exports are for offline sharing.</dd>
          </div>
          <div className="py-4">
            <dt className="font-body text-sm font-bold text-text">Can I present offline?</dt>
            <dd className="mt-1.5 font-body text-sm font-light text-text-muted">Use presenter mode in the browser when online; export PPTX for offline rooms.</dd>
          </div>
        </dl>
      </section>
      <FinalCta />
    </Container>
  );
}
