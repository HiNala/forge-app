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
      <span className="section-label mb-4">Contact &amp; booking</span>
      <h1 className="mt-3 font-display text-[clamp(40px,6vw,72px)] font-bold leading-[0.95] tracking-tight text-text">
        Stop phone tag
        <br />
        <span className="text-accent">with customers.</span>
      </h1>
      <p className="mt-5 max-w-[60ch] font-body text-lg font-light leading-relaxed text-text-muted">
        Describe the fields you need — Forge generates a hosted, on-brand page. Connect calendars in Settings
        so bookings land where you already work.
      </p>
      <ul className="mt-8 space-y-2 font-body text-sm text-text">
        {["Lead capture tuned to your business", "Optional pick-a-time scheduling", "Submissions and analytics in one dashboard"].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent shrink-0" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/signup?workflow=contact_form"
          className="inline-flex min-h-11 items-center rounded-xl bg-text px-6 py-3 font-body text-sm font-semibold text-bg transition-opacity hover:opacity-80"
        >
          Start free →
        </Link>
        <Link href="/templates?q=contact" className="inline-flex min-h-11 items-center font-body text-sm font-medium text-text-muted underline-offset-4 hover:underline">
          Browse templates
        </Link>
      </div>
      <section className="mt-16 border-t border-border pt-12">
        <h2 className="font-display text-2xl font-bold text-text">Frequently asked</h2>
        <dl className="mt-6 divide-y divide-border">
          <div className="py-4">
            <dt className="font-body text-sm font-semibold text-text">Do I need a separate booking tool?</dt>
            <dd className="mt-1.5 font-body text-sm font-light text-text-muted">Forge focuses on the page and hand-off; calendar sync uses your connected provider.</dd>
          </div>
          <div className="py-4">
            <dt className="font-body text-sm font-semibold text-text">Can I change the form later?</dt>
            <dd className="mt-1.5 font-body text-sm font-light text-text-muted">Yes — open the page in Studio and refine with plain language.</dd>
          </div>
        </dl>
      </section>
      <FinalCta />
    </Container>
  );
}
