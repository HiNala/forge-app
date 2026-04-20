"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getBillingInvoices,
  getBillingPlan,
  getBillingUsage,
  postBillingCheckout,
  postBillingPortal,
} from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

export default function BillingSettingsPage() {
  const { getToken } = useAuth();
  const sp = useSearchParams();
  const { activeOrganizationId } = useForgeSession();
  const [planDialogOpen, setPlanDialogOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (sp.get("success") === "true") {
      toast.success("Checkout completed. Plan updates when Stripe finishes processing.");
    }
  }, [sp]);

  const planQ = useQuery({
    queryKey: ["billing-plan", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getBillingPlan(getToken, activeOrganizationId),
  });

  const usageQ = useQuery({
    queryKey: ["billing-usage", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getBillingUsage(getToken, activeOrganizationId),
  });

  const invQ = useQuery({
    queryKey: ["billing-invoices", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getBillingInvoices(getToken, activeOrganizationId),
  });

  async function openPortal() {
    setBusy("portal");
    try {
      const { url } = await postBillingPortal(getToken, activeOrganizationId);
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Portal unavailable");
    } finally {
      setBusy(null);
    }
  }

  async function startCheckout(plan: "starter" | "pro") {
    setBusy(`checkout-${plan}`);
    try {
      const { url } = await postBillingCheckout(getToken, activeOrganizationId, plan);
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  const plan = planQ.data;
  const usage = usageQ.data;
  const paymentFailed = plan?.payment_failed_at;

  const trialDays =
    plan?.trial_ends_at && new Date(plan.trial_ends_at) > new Date()
      ? Math.max(0, differenceInCalendarDays(new Date(plan.trial_ends_at), new Date()))
      : null;

  function barTone(pct: number) {
    if (pct >= 100) return "bg-danger";
    if (pct >= 80) return "bg-amber-500";
    return "bg-accent";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Billing</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">
          Plans, usage, and Stripe-managed payment details. Cancelling is done in the customer portal.
        </p>
      </div>

      {paymentFailed ? (
        <div
          className="rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4 text-sm text-danger"
          role="alert"
        >
          <p className="font-body font-bold">Payment failed — update your payment method to keep your pages live.</p>
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => void openPortal()}>
            Open billing portal
          </Button>
        </div>
      ) : null}

      {trialDays !== null ? (
        <div className="rounded-2xl border border-accent/30 bg-accent-light/50 px-5 py-4 font-body text-sm text-text">
          <strong>{trialDays} days left</strong> in your trial. Add a payment method anytime.
          <Button type="button" size="sm" variant="primary" className="ml-3" onClick={() => void openPortal()}>
            Add payment method
          </Button>
        </div>
      ) : null}

      {planQ.isLoading ? (
        <div className="flex items-center gap-2 font-body text-sm text-text-muted">
          <Loader2 className="size-4 animate-spin" /> Loading plan…
        </div>
      ) : plan ? (
        <section className="rounded-2xl border border-border bg-surface p-6">
          <span className="section-label">Current plan</span>
          <p className="mt-2 font-display text-3xl font-bold capitalize text-text">{plan.plan}</p>
          <p className="mt-1.5 font-body text-sm text-text-muted">
            {plan.status ?? "—"}
            {plan.payment_method_last4
              ? ` · Card ending in ${plan.payment_method_last4}`
              : " · No card on file"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              loading={busy === "portal"}
              onClick={() => void openPortal()}
            >
              Manage billing details
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPlanDialogOpen(true)}>
              Change plan
            </Button>
          </div>
        </section>
      ) : null}

      {usageQ.isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-bg-elevated" />
      ) : usage ? (
        <section className="space-y-5 rounded-2xl border border-border bg-surface p-6">
          <div>
            <h2 className="font-display text-base font-bold text-text">Usage this period</h2>
            <p className="mt-0.5 font-body text-xs text-text-subtle">
              {format(new Date(usage.period_start), "MMM d")} – {format(new Date(usage.period_end), "MMM d, yyyy")}
            </p>
          </div>
          <UsageBar
            label="Pages generated"
            used={usage.pages_generated}
            cap={usage.pages_quota}
            tone={barTone}
          />
          <UsageBar
            label="Submissions received"
            used={usage.submissions_received}
            cap={usage.submissions_quota}
            tone={barTone}
          />
          <div>
            <div className="flex justify-between font-body text-xs font-medium text-text-muted">
              <span>AI tokens (prompt + completion)</span>
              <span className="font-mono tabular-nums">
                {(usage.tokens_prompt + usage.tokens_completion).toLocaleString()}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-base font-bold text-text">Invoices</h2>
        {invQ.isLoading ? (
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-bg-elevated" />
        ) : !invQ.data?.items?.length ? (
          <p className="mt-2 font-body text-sm text-text-muted">No invoices yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {invQ.data.items.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 font-body text-sm">
                <span className="text-text-muted">
                  {format(new Date(inv.created * 1000), "MMM yyyy")} · {(inv.amount_due / 100).toFixed(2)}{" "}
                  {inv.currency.toUpperCase()}
                </span>
                <span className="capitalize text-text-subtle">{inv.status}</span>
                {inv.hosted_invoice_url ? (
                  <a
                    href={inv.hosted_invoice_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-accent underline-offset-4 hover:underline"
                  >
                    View <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-text-muted font-body">
        <Link href="/pricing" className="text-accent hover:underline">
          Compare plans
        </Link>{" "}
        on the marketing site — self-serve checkout uses Stripe.
      </p>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a plan</DialogTitle>
            <DialogDescription>Checkout opens on Stripe’s secure page.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-5">
              <p className="font-display text-lg font-bold text-text">Starter</p>
              <p className="mt-1 font-body text-sm text-text-muted">Core publishing and forms.</p>
              <Button
                className="mt-5 w-full"
                variant="secondary"
                loading={busy === "checkout-starter"}
                onClick={() => void startCheckout("starter")}
              >
                Select Starter
              </Button>
            </div>
            <div className="rounded-2xl border border-text bg-text p-5">
              <p className="font-display text-lg font-bold text-bg">Pro</p>
              <p className="mt-1 font-body text-sm text-bg/70">Higher limits, automations, analytics retention.</p>
              <Button
                className="mt-5 w-full bg-bg text-text hover:opacity-90"
                loading={busy === "checkout-pro"}
                onClick={() => void startCheckout("pro")}
              >
                Select Pro
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setPlanDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsageBar({
  label,
  used,
  cap,
  tone,
}: {
  label: string;
  used: number;
  cap: number;
  tone: (pct: number) => string;
}) {
  const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between font-body text-xs font-medium text-text-muted">
        <span>{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString()} / {cap.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
        <div className={cn("h-full rounded-full transition-all duration-500", tone(pct))} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-0.5 font-body text-[11px] text-text-subtle">{pct}% used</p>
    </div>
  );
}
