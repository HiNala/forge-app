"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getBillingUsage } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

export function UsageQuotaBar() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();

  const usageQ = useQuery({
    queryKey: ["billing-usage", activeOrganizationId],
    enabled: !!activeOrganizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => getBillingUsage(getToken, activeOrganizationId),
  });

  const usage = usageQ.data;
  if (!usage || usage.pages_quota === 0) return null;

  const pct = Math.min(100, (usage.pages_generated / usage.pages_quota) * 100);
  if (pct < 70) return null;

  const atLimit = pct >= 100;
  const nearLimit = pct >= 80;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3",
        atLimit
          ? "border-danger/30 bg-danger/8"
          : nearLimit
            ? "border-amber-400/30 bg-amber-50 dark:bg-amber-950/20"
            : "border-border bg-surface",
      )}
      role="alert"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-body text-xs font-semibold text-text">
            {atLimit ? "Page limit reached" : "Approaching page limit"}
          </span>
          <span className="font-body text-xs tabular-nums text-text-muted shrink-0">
            {usage.pages_generated} / {usage.pages_quota} pages
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              atLimit ? "bg-danger" : nearLimit ? "bg-amber-500" : "bg-accent",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <Link
        href="/settings/billing"
        className="shrink-0 rounded-lg border border-border bg-surface px-3 py-1.5 font-body text-xs font-semibold text-text transition-colors hover:border-accent hover:text-accent"
      >
        Upgrade →
      </Link>
    </div>
  );
}
