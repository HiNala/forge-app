"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw } from "lucide-react";
import * as React from "react";
import { getAdminOverviewSummary, getAdminPlatformAnalytics } from "@/lib/api";
import { UsageBar } from "@/components/usage/UsageBar";
import { Button } from "@/components/ui/button";

export default function AdminPulsePage() {
  const { getToken } = useAuth();
  const [refreshedAt, setRefreshedAt] = React.useState(() => new Date());

  const overviewQ = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverviewSummary(getToken),
    staleTime: 30_000,
  });

  const analyticsQ = useQuery({
    queryKey: ["admin-platform-analytics", 30],
    queryFn: () => getAdminPlatformAnalytics(getToken, 30),
    staleTime: 30_000,
  });

  const t = overviewQ.data?.totals;
  const a = analyticsQ.data;
  const loading = overviewQ.isLoading || analyticsQ.isLoading;

  const activeOverTotalPct =
    t && t.users > 0 ? Math.min(100, (t.active_users_7d / t.users) * 100) : 0;
  const liveOverTotalPct =
    a && a.pages.total > 0 ? Math.min(100, (a.pages.live / a.pages.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-border bg-surface px-4 py-3 font-body text-sm text-text">
        <strong className="font-semibold text-text">Platform pulse</strong>
        <span className="text-text-muted"> — same metrics as Overview, with usage bars for a quick read.</span>
      </div>

      <div>
        <h1 className="type-display text-text">Founder pulse</h1>
        <p className="mt-1 type-body text-text-muted">Bookmark this page. Optimized for a 30-second read.</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={async () => {
            await overviewQ.refetch();
            await analyticsQ.refetch();
            setRefreshedAt(new Date());
          }}
        >
          <RefreshCw className="size-3.5" strokeWidth={1.5} />
          Refresh
        </Button>
        <span className="type-caption text-text-subtle">Last updated {formatDistanceToNow(refreshedAt, { addSuffix: true })}</span>
      </div>

      {loading ? (
        <p className="type-body text-text-muted">Loading…</p>
      ) : t && a ? (
        <div className="max-w-2xl space-y-8">
          <div className="rounded-xl border border-border bg-surface p-6">
            <UsageBar
              label="7-day active / registered users"
              description="How much of the user base was active this week"
              percent={activeOverTotalPct}
              used={t.active_users_7d}
              cap={t.users}
            />
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <UsageBar
              label="Live pages (share of all pages)"
              description="All-time — published vs total drafts"
              percent={liveOverTotalPct}
              used={a.pages.live}
              cap={a.pages.total}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PulseCard label="LLM cost 30d (¢)" value={a.llm.cost_cents_in_window} />
            <PulseCard label="Submissions 30d" value={a.submissions_in_window} />
            <PulseCard label="Page views 30d" value={a.page_views_in_window} />
          </div>
        </div>
      ) : (
        <p className="type-body text-text-muted">Unable to load metrics.</p>
      )}
    </div>
  );
}

function PulseCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4">
      <p className="section-label mb-1">{label}</p>
      <p className="type-heading font-semibold tabular-nums text-text">{value.toLocaleString()}</p>
    </div>
  );
}
