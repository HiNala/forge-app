"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { getBillingPlan, getBillingUsage } from "@/lib/api";
import { UsageBar } from "@/components/usage/UsageBar";
import { useForgeSession } from "@/providers/session-provider";
import { displayPlanName, formatSessionResetsIn, formatWeekResetsAt } from "@/lib/usage-credits";
import { Button } from "@/components/ui/button";
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
  const displayTier = displayPlanName(plan?.plan);

  const pagesUsed = usage?.pages_generated ?? 0;
  const pagesCap = usage?.pages_quota ?? 0;
  const subUsed = usage?.submissions_received ?? 0;
  const subCap = usage?.submissions_quota ?? 0;

  const capCents = usage?.extra_usage_monthly_cap_cents ?? 0;
  const spentCents = usage?.extra_usage_spent_period_cents ?? 0;
  const extraPct = capCents > 0 ? Math.min(100, (spentCents / capCents) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-display text-text">Usage</h1>
          <p className="mt-1 max-w-prose type-body text-text-muted">
            Forge Credits, session and weekly windows, and plan entitlements.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-border bg-bg-elevated px-3 py-1 font-body text-sm font-medium text-text">
              {displayTier}
            </span>
            {usage?.extra_usage_enabled && capCents > 0 ? (
              <Button asChild size="sm" variant="secondary">
                <Link href="/settings/billing">Adjust limit</Link>
              </Button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 font-body text-xs text-text-muted transition-colors hover:text-text disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5 stroke-[1.5]", refreshing && "animate-spin")} aria-hidden />
            Last updated {formatDistanceToNow(refreshedAt, { addSuffix: true })}
          </button>
        </div>
      </header>

      {/* Plan usage — session */}
      <section>
        <h2 className="type-heading mb-4 text-text">Current session</h2>
        <div className="rounded-lg border border-border bg-surface p-6">
          {usageQ.isLoading ? (
            <div className="space-y-2">
              <div className="h-3.5 w-40 animate-pulse rounded bg-bg-elevated" />
              <div className="h-2.5 w-full animate-pulse rounded-full bg-bg-elevated" />
            </div>
          ) : usage && usage.credits_session_cap > 0 ? (
            <UsageBar
              label="Current session"
              sublabel="Rolling 5 h — all Studio actions share this pool"
              percentUsed={usage.credits_session_percent}
              used={usage.credits_session_used}
              cap={usage.credits_session_cap}
              resetPhrase={formatSessionResetsIn(usage.credits_session_resets_at)}
            />
          ) : (
            <p className="font-body text-sm text-text-muted">Loading credit limits…</p>
          )}
        </div>
      </section>

      {/* Weekly */}
      <section>
        <h2 className="type-heading mb-4 text-text">Weekly limit — all workflows</h2>
        <div className="rounded-lg border border-border bg-surface p-6">
          {usageQ.isLoading || !usage ? null : usage.credits_week_cap > 0 ? (
            <UsageBar
              label="This week"
              sublabel="Includes every generation and edit in your workspace"
              percentUsed={usage.credits_week_percent}
              used={usage.credits_week_used}
              cap={usage.credits_week_cap}
              resetPhrase={formatWeekResetsAt(usage.credits_week_resets_at)}
            />
          ) : null}
        </div>
      </section>

      {/* Entitlements (non-credit) */}
      <section>
        <h2 className="type-heading mb-4 text-text">Plan resources</h2>
        <div className="space-y-0 divide-y divide-border rounded-lg border border-border bg-surface overflow-hidden">
          {usageQ.isLoading ? (
            <div className="p-5">
              <div className="h-3.5 w-48 animate-pulse rounded bg-bg-elevated" />
            </div>
          ) : usage ? (
            <>
              <EntitlementRow
                label="Published mini-apps (this month)"
                used={pagesUsed}
                cap={pagesCap}
              />
              <EntitlementRow
                label="Form submissions (this month)"
                used={subUsed}
                cap={subCap}
              />
            </>
          ) : null}
        </div>
        <p className="mt-2 font-body text-xs text-text-subtle">
          Domain, seat, and team limits are managed from billing when enabled.
        </p>
      </section>

      {/* Extra usage */}
      {usage && (plan?.plan && plan.plan !== "free" && plan.plan !== "starter" && plan.plan !== "trial") ? (
        <section>
          <h2 className="type-heading mb-4 text-text">Extra usage</h2>
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="type-body text-text-muted">
              When session and weekly credits are used up, you can allow metered overage (paid plans) with a
              monthly cap.{" "}
              <Link href="/settings/billing" className="text-accent hover:underline">
                Configure in Billing
              </Link>
              .
            </p>
            {usage.extra_usage_enabled && capCents > 0 ? (
              <div className="mt-5">
                <UsageBar
                  label="Overage this period (metered)"
                  description="Spending toward your monthly overage cap"
                  percent={extraPct}
                  used={spentCents}
                  cap={capCents}
                  valueDetail={`$${(spentCents / 100).toFixed(2)} / $${(capCents / 100).toFixed(2)} (USD)`}
                />
              </div>
            ) : (
              <p className="mt-3 type-caption text-text-subtle">Extra usage is off for this workspace.</p>
            )}
          </div>
        </section>
      ) : null}

      {usage ? (
        <section>
          <h2 className="type-heading mb-4 text-text">AI token detail</h2>
          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <div className="divide-y divide-border">
              <TokenRow label="Prompt tokens" value={usage.tokens_prompt} />
              <TokenRow label="Completion tokens" value={usage.tokens_completion} />
              <TokenRow label="Total tokens" value={usage.tokens_prompt + usage.tokens_completion} bold />
            </div>
          </div>
          <p className="mt-2 font-body text-xs text-text-subtle">
            Tokens are for transparency. Limits follow Forge Credits, not token counts, in the product.
          </p>
        </section>
      ) : null}

      {usage ? (
        <section>
          <h2 className="type-heading mb-4 text-text">Calendar month</h2>
          <div className="rounded-lg border border-border bg-surface px-6 py-5">
            <p className="font-body text-sm text-text">
              <span className="font-semibold">{format(new Date(usage.period_start), "MMMM d")}</span> —{" "}
              <span className="font-semibold">{format(new Date(usage.period_end), "MMMM d, yyyy")}</span>
            </p>
            <p className="mt-1 font-body text-xs text-text-muted">
              Submissions and published counts reset with this cycle.{" "}
              <Link href="/settings/billing" className="text-accent hover:underline">
                Billing →
              </Link>
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EntitlementRow({ label, used, cap }: { label: string; used: number; cap: number }) {
  if (cap <= 0) return null;
  const pct = Math.min(100, (used / cap) * 100);
  return (
    <div className="px-6 py-5">
      <UsageBar
        label={label}
        percentUsed={pct}
        used={used}
        cap={cap}
        valueText={`${used.toLocaleString()} / ${cap.toLocaleString()} this period`}
      />
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
        className={cn("font-body text-sm text-text-muted", bold && "font-semibold text-text")}
      >
        {label}
      </span>
      <span
        className={cn("font-body text-sm tabular-nums text-text-muted", bold && "font-semibold text-text")}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}
