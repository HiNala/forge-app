import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { FinalCta } from "@/components/marketing/final-cta";

export const metadata: Metadata = {
  title: "Contact forms & booking",
  description:
    "Stop phone tag — Forge builds branded contact pages with calendar-ready flows in minutes.",
};

export default function WorkflowContactFormPage() {
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-accent font-body">Workflow</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl">
        Stop phone tag with customers.
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-text-muted font-body">
        Describe the fields you need — Forge generates a hosted, on-brand page. Connect calendars in Settings
        so bookings land where you already work.
      </p>
      <ul className="mt-8 list-disc space-y-2 pl-5 text-text font-body">
        <li>Lead capture tuned to your business</li>
        <li>Optional pick-a-time scheduling</li>
        <li>Submissions and analytics in one dashboard</li>
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup?workflow=contact_form"
          className="inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm"
        >
          Start free
        </Link>
        <Link href="/templates?q=contact" className="text-sm font-medium text-accent underline-offset-4 hover:underline">
          Browse templates
        </Link>
      </div>
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="font-display text-2xl font-semibold text-text">FAQ</h2>
        <dl className="mt-6 space-y-4 text-sm text-text-muted font-body">
          <div>
            <dt className="font-medium text-text">Do I need a separate booking tool?</dt>
            <dd className="mt-1">Forge focuses on the page and hand-off; calendar sync uses your connected provider.</dd>
          </div>
          <div>
            <dt className="font-medium text-text">Can I change the form later?</dt>
            <dd className="mt-1">Yes — open the page in Studio and refine with plain language.</dd>
          </div>
        </dl>
      </section>
      <FinalCta />
    </Container>
  );
}
