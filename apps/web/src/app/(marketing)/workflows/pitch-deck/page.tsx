import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pitch decks | Forge",
  description: "Investor-ready decks from your story — presenter mode included.",
};

export default function WorkflowPitchDeckPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent font-body">Workflow</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-text">
        Decks that survive partner meetings
      </h1>
      <p className="mt-4 text-lg text-text-muted font-body">
        Narrative frameworks, traction slides, and presenter mode so you can walk the room without
        exporting a dozen PDFs.
      </p>
      <div className="mt-8 rounded-[14px] border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-text">FAQ</h2>
        <p className="mt-3 text-sm text-text-muted font-body">
          <strong className="text-text">Export to PowerPoint?</strong> Roadmapped for Pro+ — today,
          present from the live URL or share read-only links with analytics on views.
        </p>
      </div>
      <Button type="button" className="mt-10" asChild>
        <Link href="/signup?workflow=pitch-deck">Start free — deck workflow</Link>
      </Button>
    </div>
  );
}
