import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact forms & booking | Forge",
  description: "Stop phone tag — booking-ready forms with calendar sync.",
};

export default function WorkflowContactFormPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent font-body">Workflow</p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-text">
        Stop phone tag with customers
      </h1>
      <p className="mt-4 text-lg text-text-muted font-body">
        Booking-ready contact pages with pick-a-time slots — built to sync with Google Calendar so you
        spend less time coordinating.
      </p>
      <div className="mt-8 grid gap-6 rounded-[14px] border border-border bg-surface p-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-text">What you get</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-text-muted font-body">
            <li>Hero + structured fields Forge validates end-to-end</li>
            <li>Automations for confirmations and calendar holds</li>
            <li>Clean analytics on submissions per page</li>
          </ul>
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-text">FAQ</h2>
          <p className="mt-3 text-sm text-text-muted font-body">
            <strong className="text-text">Can clients book without an account?</strong> Yes — the public
            page is shareable; submissions land in your workspace.
          </p>
        </div>
      </div>
      <Button type="button" className="mt-10" asChild>
        <Link href="/signup?workflow=contact-form">Start free — contact workflow</Link>
      </Button>
    </div>
  );
}
