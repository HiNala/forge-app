"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getPageAnalyticsEngagement,
  getPageAnalyticsFunnel,
  getPageAnalyticsSummary,
} from "@/lib/api";
import { usePageDetail } from "@/providers/page-detail-provider";
import { useForgeSession } from "@/providers/session-provider";
import {
  AnalyticsRangeSelector,
  ChartEmpty,
  ChartTableToggle,
  KpiCard,
  parseRange,
  TrendSparkline,
} from "./analytics-shared";
import { buildFormFunnelSteps, formatAvgTimeOnPage, sortFieldsByDropoffSeverity } from "./funnel-utils";

function isFormType(t: string) {
  return t === "booking-form" || t === "contact-form" || t === "rsvp";
}

function isProposal(t: string) {
  return t === "proposal";
}

function isGalleryLike(t: string) {
  return t.includes("gallery") || t.includes("menu");
}

export function PageAnalyticsView() {
  const { page } = usePageDetail();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const sp = useSearchParams();
  const range = parseRange(sp.get("range"));

  const sumQ = useQuery({
    queryKey: ["page-analytics", "summary", activeOrganizationId, page.id, range],
    queryFn: () =>
      getPageAnalyticsSummary(getToken, activeOrganizationId, page.id, range) as Promise<Record<string, unknown>>,
    enabled: !!activeOrganizationId,
  });

  const funnelQ = useQuery({
    queryKey: ["page-analytics", "funnel", activeOrganizationId, page.id, range],
    queryFn: () =>
      getPageAnalyticsFunnel(getToken, activeOrganizationId, page.id, range) as Promise<Record<string, unknown>>,
    enabled: !!activeOrganizationId && isFormType(page.page_type),
  });

  const engQ = useQuery({
    queryKey: ["page-analytics", "engagement", activeOrganizationId, page.id, range],
    queryFn: () =>
      getPageAnalyticsEngagement(getToken, activeOrganizationId, page.id, range) as Promise<Record<string, unknown>>,
    enabled: !!activeOrganizationId && isProposal(page.page_type),
  });

  const s = sumQ.data;
  const uniq = Number(s?.unique_visitors ?? 0);
  const views = Number(s?.total_views ?? 0);
  const subs = Number(s?.submissions ?? 0);
  const rate = Number(s?.submission_rate ?? 0);
  const cta = Number(s?.cta_clicks ?? 0);
  const viewsDay = (s?.views_by_day as { date?: string; count?: number }[] | undefined) ?? [];
  const sparkData = viewsDay.map((x) => ({
    d: (x.date ?? "").slice(5),
    v: Number(x.count ?? 0),
  }));

  const referrers = (s?.top_referrers as { referrer: string; count: number }[] | undefined) ?? [];
  const devices = (s?.devices as { device: string; count: number }[] | undefined) ?? [];
  const avgTimeMs = Number(s?.avg_time_on_page_ms ?? 0);

  if (sumQ.isLoading) {
    return <p className="text-sm text-text-muted font-body">Loading analytics…</p>;
  }
  if (sumQ.isError) {
    return (
      <p className="text-sm text-danger font-body" role="alert">
        Could not load analytics.
      </p>
    );
  }

  const emptyMsg = `No events in the selected range. Share your page to start seeing data.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-[12px] text-text-muted">
          Real metrics — no sample data.
        </p>
        <AnalyticsRangeSelector />
      </div>

      {!isProposal(page.page_type) && !isGalleryLike(page.page_type) ? (
        <div className="grid grid-cols-2 gap-2">
          <KpiCard
            label="Views"
            value={views}
            hint="Total page views"
            trend={sparkData.length >= 2 ? sparkData : undefined}
          />
          <KpiCard label="Unique visitors" value={uniq} />
          <KpiCard
            label={page.page_type === "landing" || page.page_type.includes("landing") ? "CTA clicks" : "Submissions"}
            value={page.page_type === "landing" || page.page_type.includes("landing") ? cta : subs}
          />
          <KpiCard
            label={
              page.page_type === "landing" || page.page_type.includes("landing")
                ? "Conversion (clicks / visitors)"
                : "Submission rate"
            }
            value={
              page.page_type === "landing" || page.page_type.includes("landing")
                ? uniq
                  ? `${((cta / uniq) * 100).toFixed(1)}%`
                  : "0%"
                : `${(rate * 100).toFixed(1)}%`
            }
          />
        </div>
      ) : null}

      {isProposal(page.page_type) && engQ.isLoading ? (
        <p className="text-sm text-text-muted font-body">Loading engagement…</p>
      ) : null}
      {isProposal(page.page_type) && engQ.data ? (
        <ProposalSection
          eng={engQ.data}
          emptyMsg={emptyMsg}
          viewsTrend={sparkData.length >= 2 ? sparkData : undefined}
        />
      ) : null}

      {isGalleryLike(page.page_type) ? (
        <div className="grid grid-cols-2 gap-2">
          <KpiCard
            label="Views"
            value={views}
            hint="Total page views"
            trend={sparkData.length >= 2 ? sparkData : undefined}
          />
          <KpiCard label="Unique visitors" value={uniq} />
          <KpiCard
            label="Avg. time on page"
            value={formatAvgTimeOnPage(avgTimeMs)}
            hint="Mean dwell per unique visitor from section timing; 0s when no dwell events exist."
          />
        </div>
      ) : null}

      {!isProposal(page.page_type) ? (
        <div>
          <h3 className="mb-2 font-display text-sm font-bold text-text">Views trend</h3>
          {sparkData.length >= 2 ? (
            <>
              <TrendSparkline data={sparkData} />
              <p className="sr-only" aria-live="polite">
                Daily view trend loaded.
              </p>
            </>
          ) : (
            <ChartEmpty message={emptyMsg} />
          )}
        </div>
      ) : null}

      {isFormType(page.page_type) && funnelQ.data ? (
        <FormFunnelSection funnel={funnelQ.data} emptyMsg={emptyMsg} />
      ) : null}

      {!isProposal(page.page_type) && isGalleryLike(page.page_type) ? (
        <div>
          <h3 className="mb-2 font-display text-sm font-bold text-text">Top referrers</h3>
          {referrers.length === 0 ? (
            <ChartEmpty message={emptyMsg} />
          ) : (
            <ChartTableToggle
              chartId="gallery-referrers"
              label="Referrer breakdown"
              table={
                <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
                  <table className="w-full text-left text-sm font-body">
                    <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                      <tr>
                        <th className="p-2">Referrer</th>
                        <th className="p-2">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrers.map((row) => (
                        <tr key={row.referrer} className="border-b border-border">
                          <td className="p-2 text-text-muted">{row.referrer}</td>
                          <td className="p-2 tabular-nums">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            >
              <div className="rounded-2xl overflow-hidden border border-border bg-surface p-3">
                <ul className="space-y-2 text-sm font-body">
                  {referrers.map((row) => (
                    <li key={row.referrer} className="flex justify-between gap-4">
                      <span className="truncate text-text-muted">{row.referrer}</span>
                      <span className="shrink-0 font-medium text-text">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ChartTableToggle>
          )}
        </div>
      ) : null}

      {!isProposal(page.page_type) && !isGalleryLike(page.page_type) ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 font-display text-sm font-bold text-text">Top referrers</h3>
            {referrers.length === 0 ? (
              <ChartEmpty message={emptyMsg} />
            ) : (
              <ChartTableToggle
                chartId="page-referrers"
                label="Referrer breakdown"
                table={
                  <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
                    <table className="w-full text-left text-sm font-body">
                      <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                        <tr>
                          <th className="p-2">Referrer</th>
                          <th className="p-2">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrers.map((row) => (
                          <tr key={row.referrer} className="border-b border-border">
                            <td className="p-2 text-text-muted">{row.referrer}</td>
                            <td className="p-2 tabular-nums">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              >
                <div className="rounded-2xl overflow-hidden border border-border bg-surface p-3">
                  <ul className="space-y-2 text-sm font-body">
                    {referrers.map((row) => (
                      <li key={row.referrer} className="flex justify-between gap-4">
                        <span className="truncate text-text-muted">{row.referrer}</span>
                        <span className="shrink-0 font-medium text-text">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ChartTableToggle>
            )}
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-bold text-text">Devices</h3>
            {devices.length === 0 ? (
              <ChartEmpty message={emptyMsg} />
            ) : (
              <ChartTableToggle
                chartId="page-devices"
                label="Device breakdown"
                table={
                  <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
                    <table className="w-full text-left text-sm font-body">
                      <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                        <tr>
                          <th className="p-2">Device</th>
                          <th className="p-2">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {devices.map((d) => (
                          <tr key={d.device} className="border-b border-border">
                            <td className="p-2 text-text-muted">{d.device}</td>
                            <td className="p-2 tabular-nums">{d.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                }
              >
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={devices.map((d) => ({ name: d.device, value: d.count }))}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {devices.map((_, i) => (
                          <Cell
                            key={i}
                            fill={`color-mix(in srgb, var(--accent) ${Math.max(35, 92 - i * 18)}%, white)`}
                          />
                        ))}
                      </Pie>
                      <Legend />
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartTableToggle>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FormFunnelSection({ funnel, emptyMsg }: { funnel: Record<string, unknown>; emptyMsg: string }) {
  const starts = Number(funnel.form_starts ?? 0);
  const touch = Number(funnel.sessions_with_field_touch ?? 0);
  const submits = Number(funnel.form_submits ?? 0);
  const fields = (funnel.fields as { field: string; touches: number; touch_rate_vs_starters: number }[]) ?? [];

  const stepData = buildFormFunnelSteps({
    form_starts: starts,
    sessions_with_field_touch: touch,
    form_submits: submits,
  });

  const sortedFields = sortFieldsByDropoffSeverity(fields);

  if (starts === 0 && touch === 0 && submits === 0) {
    return (
      <div>
        <h3 className="mb-2 font-display text-sm font-bold text-text">Form funnel</h3>
        <ChartEmpty message={emptyMsg} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-display text-sm font-bold text-text">Funnel</h3>
        <p className="mb-2 text-xs text-text-muted font-body">
          Tracked as form start → sessions with any field interaction → submit (analytics events).
        </p>
        <ChartTableToggle
          chartId="form-funnel"
          label="Form funnel counts"
          table={
            <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
              <table className="w-full text-left text-sm font-body">
                <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                  <tr>
                    <th className="p-2">Step</th>
                    <th className="p-2">Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {stepData.map((row) => (
                    <tr key={row.step} className="border-b border-border">
                      <td className="p-2">{row.step}</td>
                      <td className="p-2 tabular-nums">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        >
          <div className="h-56 rounded-2xl overflow-hidden border border-border bg-surface p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={stepData} margin={{ left: 112, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" />
                <YAxis dataKey="step" type="category" width={108} tick={{ fontSize: 11 }} />
                <RTooltip />
                <Bar dataKey="value" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartTableToggle>
      </div>
      <div>
        <h3 className="mb-2 font-display text-sm font-bold text-text">Fields (by interaction share)</h3>
        {sortedFields.length === 0 ? (
          <ChartEmpty message="No field touches recorded in this range." />
        ) : (
          <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
            <table className="w-full text-left text-sm font-body">
              <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                <tr>
                  <th className="p-2">Field</th>
                  <th className="p-2">Touches</th>
                  <th className="p-2">Touches per form start</th>
                </tr>
              </thead>
              <tbody>
                {sortedFields.map((f) => (
                  <tr key={f.field} className="border-b border-border">
                    <td className="p-2 font-mono text-xs">{f.field}</td>
                    <td className="p-2">{f.touches}</td>
                    <td className="p-2 tabular-nums">{(f.touch_rate_vs_starters * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalSection({
  eng,
  emptyMsg,
  viewsTrend,
}: {
  eng: Record<string, unknown>;
  emptyMsg: string;
  viewsTrend?: { d: string; v: number }[];
}) {
  const views = Number(eng.views ?? 0);
  const uniq = Number(eng.unique_visitors ?? 0);
  const acc = Number(eng.proposal_accepts ?? 0);
  const dec = Number(eng.proposal_declines ?? 0);
  const decidedApprox = Math.min(acc + dec, uniq);
  const stillReviewing = Math.max(0, uniq - decidedApprox);
  const hist = (eng.scroll_depth_histogram as { scroll_pct: number; count: number }[]) ?? [];
  const dwell = (eng.section_dwell as { section_id: string; dwell_ms_total: number; events: number }[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Accepted" value={acc} />
        <KpiCard label="Declined" value={dec} />
        <KpiCard
          label="Still reviewing"
          value={stillReviewing}
          hint="Unique visitors minus accept/decline events (capped), when both are available."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Views" value={views} hint="Total page views" trend={viewsTrend} />
        <KpiCard label="Unique visitors" value={uniq} />
      </div>
      <div>
        <h3 className="mb-2 font-display text-sm font-bold text-text">Scroll depth</h3>
        {hist.length === 0 ? (
          <ChartEmpty message={emptyMsg} />
        ) : (
          <ChartTableToggle
            chartId="proposal-scroll-depth"
            label="Scroll depth histogram"
            table={
              <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
                <table className="w-full text-left text-sm font-body">
                  <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                    <tr>
                      <th className="p-2">Depth</th>
                      <th className="p-2">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hist.map((h) => (
                      <tr key={h.scroll_pct} className="border-b border-border">
                        <td className="p-2 tabular-nums">{h.scroll_pct}%</td>
                        <td className="p-2 tabular-nums">{h.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            }
          >
            <div className="h-56 rounded-2xl overflow-hidden border border-border bg-surface p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hist.map((h) => ({ pct: `${h.scroll_pct}%`, c: h.count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="pct" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <RTooltip />
                  <Bar dataKey="c" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartTableToggle>
        )}
      </div>
      <div>
        <h3 className="mb-2 font-display text-sm font-bold text-text">Section attention</h3>
        <p className="mb-2 text-xs text-text-muted font-body">Total dwell time aggregated per section (from section timing events).</p>
        {dwell.length === 0 ? (
          <ChartEmpty message={emptyMsg} />
        ) : (
          <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
            <table className="w-full text-left text-sm font-body">
              <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                <tr>
                  <th className="p-2">Section</th>
                  <th className="p-2">Total dwell</th>
                  <th className="p-2">Events</th>
                </tr>
              </thead>
              <tbody>
                {dwell.map((d) => (
                  <tr key={d.section_id || "—"} className="border-b border-border">
                    <td className="p-2 font-mono text-xs">{d.section_id || "—"}</td>
                    <td className="p-2">{Math.round(d.dwell_ms_total / 1000)}s</td>
                    <td className="p-2">{d.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-text-muted font-body">
        Per-recipient viewer rows need recipient-scoped analytics from the API — not available for this page yet.
      </p>
    </div>
  );
}
