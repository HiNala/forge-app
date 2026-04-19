"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export const RANGE_KEYS = ["7d", "30d", "90d"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];

export function parseRange(s: string | null): RangeKey {
  if (s === "7d" || s === "30d" || s === "90d") return s;
  return "30d";
}

export function AnalyticsRangeSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const r = parseRange(sp.get("range"));

  const set = (next: RangeKey) => {
    const n = new URLSearchParams(sp.toString());
    if (next === "30d") n.delete("range");
    else n.set("range", next);
    const q = n.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Date range">
      {(
        [
          ["7d", "7 days"],
          ["30d", "30 days"],
          ["90d", "90 days"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={r === id}
          onClick={() => set(id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium font-body transition-colors",
            r === id
              ? "border-accent bg-accent-light text-accent"
              : "border-border bg-surface text-text-muted hover:border-accent/40",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Daily points for a tiny trend line — only rendered when there are ≥2 points (see `TrendSparkline`). */
  trend?: { d: string; v: number }[];
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface p-4 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted font-body">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tracking-tight text-text">{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-muted font-body">{hint}</p> : null}
      {trend && trend.length >= 2 ? <TrendSparkline data={trend} /> : null}
    </div>
  );
}

export function TrendSparkline({
  data,
  dataKey,
}: {
  data: { d: string; v: number }[];
  dataKey?: string;
}) {
  const key = dataKey ?? "v";
  if (data.length < 2) return null;
  const max = Math.max(...data.map((x) => x.v as number), 1);
  return (
    <div className="mt-3 h-10 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <XAxis dataKey="d" hide tick={false} />
          <YAxis hide domain={[0, max * 1.1]} />
          <RTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            formatter={(v: number) => [v, ""]}
          />
          <Line type="monotone" dataKey={key} stroke="var(--accent)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-bg-elevated/50 px-4 py-8 text-center">
      <p className="max-w-sm text-sm text-text-muted font-body">{message}</p>
    </div>
  );
}

/** WCAG-friendly alternative to canvas/SVG charts: toggle to the same data in a table. */
export function ChartTableToggle({
  chartId,
  label,
  children,
  table,
}: {
  chartId: string;
  label: string;
  children: React.ReactNode;
  table: React.ReactNode;
}) {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-xs font-medium text-accent underline-offset-4 hover:underline font-body"
          aria-expanded={showTable}
          aria-controls={`${chartId}-panel`}
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? "Show chart" : "View as table"}
        </button>
      </div>
      <div id={`${chartId}-panel`} role="region" aria-label={label}>
        {showTable ? table : children}
      </div>
      <p className="sr-only" aria-live="polite">
        {showTable ? "Showing data table." : "Showing chart."}
      </p>
    </div>
  );
}
