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
      <span className="section-label mb-4">Proposals &amp; quotes</span>
      <h1 className="mt-3 font-display text-[clamp(40px,6vw,72px)] font-bold leading-[0.95] tracking-tight text-text">
        Win the job before
        <br />
        <span className="text-accent">the competition replies.</span>
      </h1>
      <p className="mt-5 max-w-[60ch] font-body text-lg font-light leading-relaxed text-text-muted">
        Forge turns your scope, pricing, and terms into a single client-facing page — clear enough to sign,
        detailed enough to trust.
      </p>
      <ul className="mt-8 space-y-2 font-body text-sm text-text">
        {[
          "Structured pricing and optional line items",
          "Client decisions and questions in one place",
          "Share a link; track opens from Page Detail",
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent shrink-0" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup?workflow=proposal"
          className="inline-flex min-h-11 items-center rounded-xl bg-text px-6 py-3 font-body text-sm font-semibold text-bg transition-opacity hover:opacity-80"
        >
          Start free →
        </Link>
        <Link href="/templates?q=proposal" className="inline-flex min-h-11 items-center font-body text-sm font-medium text-text-muted underline-offset-4 hover:underline">
          Browse templates
        </Link>
      </div>
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="font-display text-2xl font-bold text-text">Frequently asked</h2>
        <dl className="mt-6 divide-y divide-border">
          <div className="py-4">
            <dt className="font-body text-sm font-semibold text-text">Is this legally binding?</dt>
            <dd className="mt-1.5 font-body text-sm font-light text-text-muted">Forge helps you present terms; your counsel defines enforceability.</dd>
          </div>
          <div className="py-4">
            <dt className="font-body text-sm font-semibold text-text">Can I duplicate a winning proposal?</dt>
            <dd className="mt-1.5 font-body text-sm font-light text-text-muted">Duplicate from the dashboard or start from a template in the gallery.</dd>
          </div>
        </dl>
      </section>
      <FinalCta />
    </Container>
  );
}
