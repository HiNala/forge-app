"use client";

import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { getAdminOverviewSummary, type AdminOverviewSummary } from "@/lib/api";

export default function AdminOverviewPage() {
  const { getToken } = useAuth();
  const [data, setData] = React.useState<AdminOverviewSummary | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    void getAdminOverviewSummary(getToken)
      .then(setData)
      .catch(() => setErr("Unable to load overview metrics."));
  }, [getToken]);

  if (err) {
    return <p className="font-body text-sm text-danger">{err}</p>;
  }
  if (!data) {
    return <p className="font-body text-sm text-text-muted">Loading…</p>;
  }

  const t = data.totals;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-text-muted font-body">Platform snapshot — drill down from the sidebar.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={t.users} />
        <StatCard label="Organizations" value={t.organizations} />
        <StatCard label="Active users (7d)" value={t.active_users_7d} />
        <StatCard label="LLM cost today (¢)" value={t.llm_cost_cents_today} />
      </div>
      <p className="text-[11px] text-text-subtle font-body">Generated {data.generated_at}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
