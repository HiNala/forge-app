"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  getBillingPlanRecommendation,
  getBillingUsage,
  postBillingCheckout,
  postBillingPortal,
  postDismissPlanRecommendation,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format/currency";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

export default function BillingSettingsPage() {
  const { getToken } = useAuth();
  const sp = useSearchParams();
  const queryClient = useQueryClient();
  const { activeOrganizationId, me } = useForgeSession();
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

  const planRecQ = useQuery({
    queryKey: ["billing-plan-recommendation", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getBillingPlanRecommendation(getToken, activeOrganizationId),
    staleTime: 60_000,
  });

  const localeMoney =
    me?.preferences && typeof (me.preferences as { locale?: string }).locale === "string"
      ? (me.preferences as { locale: string }).locale
      : "en-US";

  async function dismissRecommendation(recId: string) {
    setBusy(`dismiss-${recId}`);
    try {
      await postDismissPlanRecommendation(getToken, activeOrganizationId, recId);
      await queryClient.invalidateQueries({ queryKey: ["billing-plan-recommendation", activeOrganizationId] });
      toast.success("Suggestion dismissed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not dismiss");
    } finally {
      setBusy(null);
    }
  }

  async function checkoutRecommendedPlan(plan: string) {
    if (plan !== "pro" && plan !== "max_5x" && plan !== "max_20x") return;
    setBusy(`rec-${plan}`);
    try {
      const { url } = await postBillingCheckout(getToken, activeOrganizationId, plan, "monthly");
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

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

  async function startCheckout(plan: "pro" | "max_5x" | "max_20x") {
    setBusy(`checkout-${plan}`);
    try {
      const { url } = await postBillingCheckout(getToken, activeOrganizationId, plan, "monthly");
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

  const extraCapRatio =
    usage?.extra_usage_enabled &&
    usage.extra_usage_monthly_cap_cents != null &&
    usage.extra_usage_monthly_cap_cents > 0
      ? usage.extra_usage_spent_period_cents / usage.extra_usage_monthly_cap_cents
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

      {extraCapRatio != null && extraCapRatio >= 0.75 ? (
        <div
          className={`rounded-2xl border px-5 py-4 text-sm font-body ${
            extraCapRatio >= 1 ? "border-danger/40 bg-danger/10 text-danger" : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
          }`}
          role="status"
        >
          <p className="font-semibold">
            {extraCapRatio >= 1
              ? "Extra-usage monthly cap reached"
              : extraCapRatio >= 0.95
                ? "You are at about 95% of your GlideDesign extra-usage cap"
                : "You are approaching your GlideDesign extra-usage cap (~75%)"}
          </p>
          <p className="mt-1 text-xs opacity-90">
            {usage ? (
              <>
                Spent {((usage.extra_usage_spent_period_cents ?? 0) / 100).toFixed(2)} of{" "}
                {((usage.extra_usage_monthly_cap_cents ?? 0) / 100).toFixed(2)}{" "}
                {plan?.currency?.toUpperCase() ?? "USD"} this Stripe period. Raise the cap under Usage or upgrade for
                more included credits.
              </>
            ) : null}
          </p>
          <Link href="/settings/usage" className="mt-2 inline-block text-sm font-medium underline-offset-4 hover:underline">
            Open usage controls →
          </Link>
        </div>
      ) : null}

      {planRecQ.data?.recommendation ? (
        <aside
          className="rounded-2xl border border-accent/30 bg-accent-light/35 px-5 py-4 font-body text-sm text-text shadow-sm"
          role="status"
        >
          <p className="font-display font-bold text-text">Plan suggestion</p>
          <p className="mt-2 text-sm leading-relaxed">
            Consider <span className="font-semibold">{planRecQ.data.recommendation.recommended_plan}</span>{" "}
            instead of{" "}
            <span className="text-text-muted">{planRecQ.data.recommendation.current_plan}</span>
            {" — "}save about{" "}
            <span className="font-semibold">
              {formatCurrency(
                planRecQ.data.recommendation.savings_cents,
                planRecQ.data.recommendation.currency,
                localeMoney,
              )}
            </span>{" "}
            / month.
          </p>
          {planRecQ.data.recommendation.reasoning ? (
            <p className="mt-2 text-xs text-text-muted">{planRecQ.data.recommendation.reasoning}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {planRecQ.data.recommendation.recommended_plan === "pro" ||
            planRecQ.data.recommendation.recommended_plan === "max_5x" ||
            planRecQ.data.recommendation.recommended_plan === "max_20x" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={busy === `rec-${planRecQ.data.recommendation.recommended_plan}`}
                onClick={() =>
                  void checkoutRecommendedPlan(planRecQ.data!.recommendation!.recommended_plan)
                }
              >
                Continue to Stripe
              </Button>
            ) : (
              <Button type="button" variant="primary" size="sm" asChild>
                <Link href="/settings/billing/plans">View plans</Link>
              </Button>
            )}
            <Link
              href="/settings/billing/plans"
              className="inline-flex items-center px-3 py-1.5 font-body text-xs font-medium text-accent underline-offset-4 hover:underline"
            >
              Compare monthly vs annual →
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={busy === `dismiss-${planRecQ.data.recommendation.id}`}
              onClick={() => void dismissRecommendation(planRecQ.data.recommendation!.id)}
            >
              Dismiss
            </Button>
          </div>
        </aside>
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-text">Usage this period</h2>
              <p className="mt-0.5 font-body text-xs text-text-subtle">
                {format(new Date(usage.period_start), "MMM d")} – {format(new Date(usage.period_end), "MMM d, yyyy")}
              </p>
            </div>
            <Link href="/settings/usage" className="font-body text-xs text-accent hover:underline shrink-0">
              View details →
            </Link>
          </div>
          <UsageBar
            label="Pages generated"
            sublabel={`Resets ${format(new Date(usage.period_end), "MMM d")}`}
            used={usage.pages_generated}
            cap={usage.pages_quota}
            tone={barTone}
          />
          <UsageBar
            label="Submissions received"
            sublabel={`Resets ${format(new Date(usage.period_end), "MMM d")}`}
            used={usage.submissions_received}
            cap={usage.submissions_quota}
            tone={barTone}
          />
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-body text-xs text-text-muted">AI tokens this period</span>
            <span className="font-body text-xs tabular-nums text-text-muted">
              {(usage.tokens_prompt + usage.tokens_completion).toLocaleString()}
            </span>
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
        <Link href="/settings/billing/plans" className="text-accent hover:underline">
          In-app plan picker
        </Link>{" "}
        ·{" "}
        <Link href="/pricing" className="text-accent hover:underline">
          Marketing pricing
        </Link>{" "}
        — self-serve checkout uses Stripe.
      </p>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a plan</DialogTitle>
            <DialogDescription>
              Checkout opens on Stripe — for annual billing switch the interval first on{" "}
              <Link href="/settings/billing/plans" className="text-accent underline">
                Plans
              </Link>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border p-5">
              <p className="font-display text-lg font-bold text-text">Pro</p>
              <p className="mt-1 font-body text-xs text-text-muted">$50/mo — solid limits for individuals and small teams.</p>
              <Button
                className="mt-5 w-full"
                variant="secondary"
                loading={busy === "checkout-pro"}
                onClick={() => void startCheckout("pro")}
              >
                Select Pro
              </Button>
            </div>
            <div className="rounded-2xl border border-accent/40 bg-accent-light/30 p-5">
              <p className="font-display text-lg font-bold text-text">Max</p>
              <p className="mt-1 font-body text-xs text-text-muted">$100/mo — higher concurrency and weekly credits.</p>
              <Button
                className="mt-5 w-full"
                variant="secondary"
                loading={busy === "checkout-max_5x"}
                onClick={() => void startCheckout("max_5x")}
              >
                Select Max
              </Button>
            </div>
            <div className="rounded-2xl border border-text bg-text p-5">
              <p className="font-display text-lg font-bold text-bg">Max Enterprise</p>
              <p className="mt-1 font-body text-xs text-bg/75">$100/mo — maximum GlideDesign throughput.</p>
              <Button
                className="mt-5 w-full bg-bg text-text hover:opacity-90"
                loading={busy === "checkout-max_20x"}
                onClick={() => void startCheckout("max_20x")}
              >
                Contact for Enterprise
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
  sublabel,
  used,
  cap,
  tone,
}: {
  label: string;
  sublabel?: string;
  used: number;
  cap: number;
  tone: (pct: number) => string;
}) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  const pctRound = Math.round(pct);
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-body text-sm font-semibold text-text">{label}</p>
          {sublabel ? (
            <p className="mt-0.5 font-body text-xs text-text-muted">{sublabel}</p>
          ) : null}
        </div>
        <span className="shrink-0 font-body text-sm font-medium tabular-nums text-text-muted">
          {pctRound}% used
        </span>
      </div>
      <div className="relative mt-2.5 h-2.5 overflow-hidden rounded-full bg-bg-elevated">
        {pct > 0 ? (
          <div
            className={cn("h-full rounded-full transition-all duration-700", tone(pctRound))}
            style={{ width: `${pct}%` }}
          />
        ) : (
          <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-accent opacity-60" />
        )}
      </div>
      <p className="mt-1.5 font-body text-[11px] tabular-nums text-text-subtle">
        {used.toLocaleString()} / {cap.toLocaleString()}
      </p>
    </div>
  );
}
