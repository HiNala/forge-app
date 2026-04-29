"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/forge-auth-provider";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { postBillingCheckout } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";

type Interval = "monthly" | "annual";

export default function BillingPlansSettingsPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [interval, setInterval] = React.useState<Interval>("monthly");
  const [busy, setBusy] = React.useState<string | null>(null);

  async function startCheckout(plan: "pro" | "max_5x" | "max_20x") {
    setBusy(`checkout-${plan}`);
    try {
      const { url } = await postBillingCheckout(getToken, activeOrganizationId, plan, interval);
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  const annualLabel =
    interval === "annual"
      ? "Annual — prices use your Stripe annual price IDs (when configured)."
      : "Monthly — uses monthly Stripe prices.";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="font-body text-xs text-text-muted">
          <Link href="/settings/billing" className="text-accent hover:underline">
            ← Billing
          </Link>
        </p>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-text">Plans</h1>
        <p className="mt-1.5 font-body text-sm text-text-muted">{annualLabel}</p>
      </div>

      <div className="inline-flex rounded-xl border border-border bg-bg-elevated p-0.5">
        <button
          type="button"
          onClick={() => setInterval("monthly")}
          className={cn(
            "rounded-lg px-4 py-1.5 font-body text-xs font-semibold transition-colors",
            interval === "monthly" ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text",
          )}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setInterval("annual")}
          className={cn(
            "rounded-lg px-4 py-1.5 font-body text-xs font-semibold transition-colors",
            interval === "annual" ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text",
          )}
        >
          Annual
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border p-5 shadow-sm">
          <p className="font-display text-lg font-bold text-text">Pro</p>
          <p className="mt-1 font-body text-xs text-text-muted">
            Solid limits for individuals and small teams (see marketing pricing for headline amounts).
          </p>
          <Button
            className="mt-5 w-full"
            variant="secondary"
            loading={busy === "checkout-pro"}
            onClick={() => void startCheckout("pro")}
          >
            Subscribe
          </Button>
        </div>
        <div className="rounded-2xl border border-accent/40 bg-accent-light/25 p-5 shadow-sm">
          <p className="font-display text-lg font-bold text-text">Max</p>
          <p className="mt-1 font-body text-xs text-text-muted">Higher concurrency and weekly credits.</p>
          <Button
            className="mt-5 w-full"
            variant="secondary"
            loading={busy === "checkout-max_5x"}
            onClick={() => void startCheckout("max_5x")}
          >
            Subscribe
          </Button>
        </div>
        <div className="rounded-2xl border border-text bg-text p-5 shadow-sm">
          <p className="font-display text-lg font-bold text-bg">Max Enterprise</p>
          <p className="mt-1 font-body text-xs text-bg/75">Maximum GlideDesign throughput for teams.</p>
          <Button
            className="mt-5 w-full bg-bg text-text hover:opacity-90"
            loading={busy === "checkout-max_20x"}
            onClick={() => void startCheckout("max_20x")}
          >
            Subscribe
          </Button>
        </div>
      </div>

      <p className="rounded-2xl border border-border/80 bg-bg-elevated/40 px-4 py-3 font-body text-xs text-text-muted">
        Checkout opens on Stripe using the configured price IDs for the selected billing interval.
      </p>
    </div>
  );
}
