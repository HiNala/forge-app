"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as React from "react";
import { getAdminOverviewSummary, getAdminPlatformAnalytics } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function AdminOverviewPage() {
  const { getToken } = useAuth();

  const overviewQ = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => getAdminOverviewSummary(getToken),
    staleTime: 60_000,
  });

  const analyticsQ = useQuery({
    queryKey: ["admin-platform-analytics", 30],
    queryFn: () => getAdminPlatformAnalytics(getToken, 30),
    staleTime: 60_000,
  });

  const t = overviewQ.data?.totals;
  const a = analyticsQ.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Overview</h1>
        <p className="mt-1 font-body text-sm text-text-muted">
          Platform snapshot — all workspaces, all time.
        </p>
      </div>

      {/* Instant KPIs from overview endpoint */}
      {overviewQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-bg-elevated" />
          ))}
        </div>
      ) : t ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={t.users} />
          <StatCard label="Organizations" value={t.organizations} />
          <StatCard label="Active users (7d)" value={t.active_users_7d} />
          <StatCard label="LLM cost today (¢)" value={t.llm_cost_cents_today} color="accent" />
        </div>
      ) : overviewQ.isError ? (
        <p className="font-body text-sm text-danger">Unable to load overview metrics.</p>
      ) : null}

      {/* Rich 30-day analytics */}
      {analyticsQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-bg-elevated" />
          ))}
        </div>
      ) : a ? (
        <>
          <section>
            <h2 className="mb-3 font-display text-base font-semibold text-text">
              Last 30 days
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard label="New users" value={a.users.new_in_window} />
              <StatCard label="Page views" value={a.page_views_in_window} />
              <StatCard label="Submissions" value={a.submissions_in_window} />
              <StatCard label="LLM runs" value={a.llm.runs_in_window} />
              <StatCard label="LLM cost (¢)" value={a.llm.cost_cents_in_window} color="accent" />
              <StatCard label="Live pages" value={a.pages.live} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-base font-semibold text-text">
              Plans
            </h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface">
              <table className="w-full text-left text-sm font-body">
                <thead className="border-b border-border bg-bg-elevated text-[11px] uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3 text-right">Organizations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.entries(a.organizations.by_plan).map(([plan, count]) => (
                    <tr key={plan}>
                      <td className="px-4 py-3 font-medium capitalize text-text">{plan}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-text-muted">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {overviewQ.data ? (
        <p className="font-body text-[11px] text-text-subtle">
          Updated {format(new Date(overviewQ.data.generated_at), "MMM d, yyyy HH:mm")} UTC
        </p>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: number;
  color?: "default" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-sm">
      <p className="section-label mb-1">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-bold tabular-nums",
          color === "accent" ? "text-accent" : "text-text",
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
