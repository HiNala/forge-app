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
      <p className="text-sm font-medium uppercase tracking-wide text-accent font-body">Workflow</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl">
        Your narrative, one slide at a time.
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-text-muted font-body">
        Describe the arc you need — Forge composes a scrollable deck with presenter mode, analytics per slide,
        and exports when you need a file.
      </p>
      <ul className="mt-8 list-disc space-y-2 pl-5 text-text font-body">
        <li>Narrative frameworks for common pitch stories</li>
        <li>Charts and imagery with progressive loading</li>
        <li>PDF and PPTX export from Page Detail</li>
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup?workflow=pitch_deck"
          className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm"
        >
          Start free
        </Link>
        <Link href="/templates?q=deck" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
          Browse templates
        </Link>
      </div>
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="font-display text-2xl font-semibold text-text">FAQ</h2>
        <dl className="mt-6 space-y-4 text-sm text-text-muted font-body">
          <div>
            <dt className="font-medium text-text">Is this PowerPoint?</dt>
            <dd className="mt-1">The canonical experience is web-native; exports are for offline sharing.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Can I present offline?</dt>
            <dd className="mt-1">Use presenter mode in the browser when online; export PPTX for offline rooms.</dd>
          </div>
        </dl>
      </section>
      <FinalCta />
    </Container>
  );
}
