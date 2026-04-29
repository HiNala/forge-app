"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import * as React from "react";
import { getAdminLlmSummary, type AdminLlmSummary } from "@/lib/api";

export default function AdminLlmPage() {
  const { getToken } = useAuth();
  const [data, setData] = React.useState<AdminLlmSummary | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    void getAdminLlmSummary(getToken, 30)
      .then(setData)
      .catch(() => setErr("Unable to load LLM spend summary."));
  }, [getToken]);

  if (err) {
    return <p className="font-body text-sm text-danger">{err}</p>;
  }
  if (!data) {
    return <p className="font-body text-sm text-text-muted">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">LLM &amp; AI spend</h1>
        <p className="mt-1 text-sm text-text-muted font-body">Last {data.window_days} days — platform totals.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
          <p className="section-label mb-1">Total cost</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{(data.total_cost_cents / 100).toFixed(2)} USD</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
          <p className="section-label mb-1">Runs</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{data.run_count}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4 text-sm font-body">
        <p className="font-medium text-text">By status</p>
        <ul className="mt-2 space-y-1 text-text-muted">
          {Object.entries(data.runs_by_status).map(([k, v]) => (
            <li key={k}>
              {k}: {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
