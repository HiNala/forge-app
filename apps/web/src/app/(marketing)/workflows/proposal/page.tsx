import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Proposals & quotes | Forge",
  description: "Signable bids your clients can accept in one click.",
};

export default function WorkflowProposalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent font-body">Workflow</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-text">
        Professional proposals contractors rely on
      </h1>
      <p className="mt-4 text-lg text-text-muted font-body">
        Scope, pricing tiers, and a one-click accept flow — tuned for trades and services teams who
        live in estimates and change orders.
      </p>
      <div className="mt-8 space-y-4 rounded-[14px] border border-border bg-surface p-6">
        <h2 className="font-display text-lg font-semibold text-text">Testimonials</h2>
        <blockquote className="border-l-2 border-accent pl-4 text-sm italic text-text-muted font-body">
          “We went from PDFs in email to a single link — clients see pricing and sign without a dozen
          back-and-forth threads.”
          <footer className="mt-2 not-italic text-text-subtle">— Field ops team (placeholder)</footer>
        </blockquote>
      </div>
      <Button type="button" className="mt-10" asChild>
        <Link href="/signup?workflow=proposal">Start free — proposal workflow</Link>
      </Button>
    </div>
  );
}
