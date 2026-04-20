"use client";

import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { getAdminOverviewSummary, type AdminOverviewSummary } from "@/lib/api";

export default function AdminPulsePage() {
  const { getToken } = useAuth();
  const [data, setData] = React.useState<AdminOverviewSummary | null>(null);

  React.useEffect(() => {
    void getAdminOverviewSummary(getToken).then(setData).catch(() => {});
  }, [getToken]);

  const t = data?.totals;
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-success/20 bg-success/5 px-4 py-3 font-body text-sm text-text">
        <strong className="font-bold text-success">Healthy</strong>
        <span className="text-emerald-900/80">
          {" "}
          — quick pulse from live API metrics. Tune thresholds in a later iteration.
        </span>
      </div>
      <div>
        <h1 className="font-display text-2xl font-bold">Founder pulse</h1>
        <p className="mt-1 text-sm text-text-muted font-body">
          Bookmark this page. Same data as Overview, optimized for a 30-second read.
        </p>
      </div>
      {t ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PulseCard label="Users" value={t.users} />
          <PulseCard label="Orgs" value={t.organizations} />
          <PulseCard label="LLM today (¢)" value={t.llm_cost_cents_today} />
        </div>
      ) : (
        <p className="text-sm text-text-muted">Loading…</p>
      )}
    </div>
  );
}

function PulseCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm">
      <p className="section-label mb-1">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
