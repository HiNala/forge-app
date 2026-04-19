import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "Proposals & quotes",
  description: "Send professional, signable proposals your clients can accept in one click.",
};

export default function WorkflowProposalPage() {
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-accent font-body">Workflow</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl">
        Win the job before the competition replies.
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-text-muted font-body">
        Forge turns your scope, pricing, and terms into a single client-facing page — clear enough to sign,
        detailed enough to trust.
      </p>
      <ul className="mt-8 list-disc space-y-2 pl-5 text-text font-body">
        <li>Structured pricing and optional line items</li>
        <li>Client decisions and questions in one place</li>
        <li>Share a link; track opens from Page Detail</li>
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup?workflow=proposal"
          className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm"
        >
          Start free
        </Link>
        <Link href="/templates?q=proposal" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
          Browse templates
        </Link>
      </div>
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="font-display text-2xl font-semibold text-text">FAQ</h2>
        <dl className="mt-6 space-y-4 text-sm text-text-muted font-body">
          <div>
            <dt className="font-medium text-text">Is this legally binding?</dt>
            <dd className="mt-1">Forge helps you present terms; your counsel defines enforceability.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Can I duplicate a winning proposal?</dt>
            <dd className="mt-1">Duplicate from the dashboard or start from a template in the gallery.</dd>
          </div>
        </dl>
      </section>
      <FinalCta />
    </Container>
  );
}
