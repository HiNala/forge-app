"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";

import { PageHeader } from "@/components/chrome/page-header";
import { Button } from "@/components/ui/button";

export default function BillingSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Billing"
        description="Manage your plan, payment method, and invoices when Stripe checkout is connected for this workspace."
      />
      <div className="rounded-[10px] border border-dashed border-border bg-surface p-8 text-center shadow-sm">
        <CreditCard className="mx-auto size-10 text-accent" aria-hidden />
        <p className="mt-4 text-sm leading-relaxed text-text-muted font-body">
          Billing dashboards and plan changes will appear here once Mission 06 wiring is complete.
          You will be able to start checkout, view usage against limits, and download invoices.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/pricing">View pricing</Link>
        </Button>
      </div>
    </div>
  );
}
