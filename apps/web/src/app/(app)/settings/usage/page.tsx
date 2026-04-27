"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { getBillingPlan, getBillingUsage } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

export default function UsageSettingsPage() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const queryClient = useQueryClient();
  const [refreshedAt, setRefreshedAt] = React.useState(() => new Date());
  const [refreshing, setRefreshing] = React.useState(false);

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

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing-plan", activeOrganizationId] }),
        queryClient.invalidateQueries({ queryKey: ["billing-usage", activeOrganizationId] }),
      ]);
      setRefreshedAt(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  const plan = planQ.data;
  const usage = usageQ.data;

  const pagesUsed = usage?.pages_generated ?? 0;
  const pagesCap = usage?.pages_quota ?? 0;
  const pagesPct = pagesCap > 0 ? Math.min(100, (pagesUsed / pagesCap) * 100) : 0;

  const subUsed = usage?.submissions_received ?? 0;
  const subCap = usage?.submissions_quota ?? 0;
  const subPct = subCap > 0 ? Math.min(100, (subUsed / subCap) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-0">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">Usage</h1>
          <p className="mt-1 font-body text-sm text-text-muted">
            Your plan limits and consumption for this billing period.
          </p>
        </div>
        {plan?.plan ? (
          <span className="font-display text-base font-semibold capitalize text-text">
            {plan.plan}
          </span>
        ) : null}
      </div>

      {/* Plan usage limits */}
      <section>
        <h2 className="mb-4 font-display text-base font-semibold text-text">Plan usage limits</h2>
        <div className="space-y-0 divide-y divide-border rounded-2xl border border-border bg-surface overflow-hidden">
          {usageQ.isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3.5 w-40 animate-pulse rounded bg-bg-elevated" />
                  <div className="h-3 w-full animate-pulse rounded-full bg-bg-elevated" />
                </div>
              ))}
            </div>
          ) : usage ? (
            <>
              <UsageRow
                label="Pages generated"
                sublabel={`Resets ${format(new Date(usage.period_end), "MMM d")}`}
                used={pagesUsed}
                cap={pagesCap}
                pct={pagesPct}
              />
              <UsageRow
                label="Form submissions"
                sublabel={`Resets ${format(new Date(usage.period_end), "MMM d")}`}
                used={subUsed}
                cap={subCap}
                pct={subPct}
              />
            </>
          ) : null}
        </div>

        {/* Last updated */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 font-body text-xs text-text-muted transition-colors hover:text-text disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
            Last updated:{" "}
            {formatDistanceToNow(refreshedAt, { addSuffix: true })}
          </button>
        </div>
      </section>

      {/* Token breakdown */}
      {usage ? (
        <section className="pt-8">
          <h2 className="mb-4 font-display text-base font-semibold text-text">
            AI token usage this period
          </h2>
          <div className="rounded-2xl border border-border bg-surface overflow-hidden">
            <div className="divide-y divide-border">
              <TokenRow
                label="Prompt tokens"
                value={usage.tokens_prompt}
              />
              <TokenRow
                label="Completion tokens"
                value={usage.tokens_completion}
              />
              <TokenRow
                label="Total tokens"
                value={usage.tokens_prompt + usage.tokens_completion}
                bold
              />
            </div>
          </div>
          <p className="mt-2 font-body text-xs text-text-subtle">
            Token usage is informational — it does not count toward your plan limits.
          </p>
        </section>
      ) : null}

      {/* Period info */}
      {usage ? (
        <section className="pt-8">
          <h2 className="mb-4 font-display text-base font-semibold text-text">
            Billing period
          </h2>
          <div className="rounded-2xl border border-border bg-surface px-5 py-4">
            <p className="font-body text-sm text-text">
              <span className="font-semibold">
                {format(new Date(usage.period_start), "MMMM d")}
              </span>{" "}
              —{" "}
              <span className="font-semibold">
                {format(new Date(usage.period_end), "MMMM d, yyyy")}
              </span>
            </p>
            <p className="mt-1 font-body text-xs text-text-muted">
              Limits reset at the start of each billing period.{" "}
              <Link href="/settings/billing" className="text-accent hover:underline">
                Manage billing →
              </Link>
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function UsageRow({
  label,
  sublabel,
  used,
  cap,
  pct,
}: {
  label: string;
  sublabel: string;
  used: number;
  cap: number;
  pct: number;
}) {
  const barColor =
    pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-amber-500" : "bg-accent";

  return (
    <div className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-body text-sm font-semibold text-text">{label}</p>
          <p className="mt-0.5 font-body text-xs text-text-muted">{sublabel}</p>
        </div>
        <span className="shrink-0 font-body text-sm font-medium tabular-nums text-text-muted">
          {Math.round(pct)}% used
        </span>
      </div>
      {/* Progress bar — Anthropic style */}
      <div className="relative mt-3 h-2.5 overflow-hidden rounded-full bg-bg-elevated">
        {pct > 0 ? (
          <div
            className={cn("h-full rounded-full transition-all duration-700", barColor)}
            style={{ width: `${pct}%` }}
          />
        ) : (
          /* Empty state: thin start indicator */
          <div className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-accent opacity-60" />
        )}
      </div>
      <p className="mt-1.5 font-body text-xs text-text-subtle tabular-nums">
        {used.toLocaleString()} / {cap.toLocaleString()}
      </p>
    </div>
  );
}

function TokenRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span
        className={cn(
          "font-body text-sm text-text-muted",
          bold && "font-semibold text-text",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-body text-sm tabular-nums text-text-muted",
          bold && "font-semibold text-text",
        )}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
