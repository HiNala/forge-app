"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOrg,
  getOrgAnalyticsSummary,
  getPageAnalyticsSummary,
  listPages,
  type PageOut,
} from "@/lib/api";
import { getWorkflowFamily } from "@/lib/workflow-config";
import { useForgeSession } from "@/providers/session-provider";
import { getWorkflowFamily } from "@/lib/workflow-config";
import {
  AnalyticsRangeSelector,
  ChartEmpty,
  KpiCard,
  parseRange,
  TrendSparkline,
  type RangeKey,
} from "./analytics-shared";

function downloadCsv(filename: string, rows: string[][]) {
  const esc = (c: string) => {
    if (/[",\n]/.test(c)) return `"${c.replace(/"/g, '""')}"`;
    return c;
  };
  const body = rows.map((r) => r.map((c) => esc(String(c))).join(",")).join("\r\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function OrgAnalyticsView() {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const range = parseRange(sp.get("range")) as RangeKey;
  const selectedPageId = sp.get("page") ?? "";

  const pagesQ = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const orgMetaQ = useQuery({
    queryKey: ["org", activeOrganizationId],
    queryFn: () => getOrg(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const orgQ = useQuery({
    queryKey: ["org-analytics", "summary", activeOrganizationId, range],
    queryFn: () => getOrgAnalyticsSummary(getToken, activeOrganizationId, range),
    enabled: !!activeOrganizationId,
  });

  const pageSumQ = useQuery({
    queryKey: ["page-analytics", "summary", activeOrganizationId, selectedPageId, range],
    queryFn: () => getPageAnalyticsSummary(getToken, activeOrganizationId, selectedPageId, range),
    enabled: !!activeOrganizationId && !!selectedPageId,
  });

  const setPageFilter = (id: string) => {
    const n = new URLSearchParams(sp.toString());
    if (!id) n.delete("page");
    else n.set("page", id);
    const q = n.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  const data = orgQ.data as Record<string, unknown> | undefined;
  const subsMonth = Number(data?.submissions_this_month ?? 0);
  const livePages = Number(data?.live_pages ?? 0);
  const team = Number(data?.team_members ?? 0);
  const aiTokens = Number(data?.ai_tokens_this_month ?? 0);
  const totalViews = Number(data?.total_views ?? 0);
  const totalSubs = Number(data?.total_submissions ?? 0);
  const topPages =
    (data?.top_pages as {
      page_id: string;
      title: string;
      slug: string;
      submissions: number;
      unique_visitors: number;
      submission_rate: number;
    }[]) ?? [];
  const recent =
    (data?.recent_submissions as {
      id: string;
      page_id: string;
      page_title: string;
      status: string;
      submitter_email: string | null;
      created_at: string;
    }[]) ?? [];

  const trend = data?.views_by_day as { date?: string; count?: number }[] | undefined;
  const sparkData =
    trend?.map((x) => ({
      d: (x.date ?? "").slice(5),
      v: Number(x.count ?? 0),
    })) ?? [];

  const emptyOrg =
    !orgQ.isLoading && totalViews === 0 && totalSubs === 0 && sparkData.length === 0;

  const onDownloadCsv = () => {
    if (!data) return;
    const rows: string[][] = [];
    rows.push(["range", String(data.range ?? range)]);
    rows.push(["submissions_this_month", String(subsMonth)]);
    rows.push(["live_pages", String(livePages)]);
    rows.push(["team_members", String(team)]);
    rows.push(["total_views", String(totalViews)]);
    rows.push(["total_submissions_range", String(totalSubs)]);
    rows.push([]);
    rows.push(["top_pages", "title", "slug", "submissions", "unique_visitors", "submission_rate"]);
    for (const p of topPages) {
      rows.push(["", p.title, p.slug, String(p.submissions), String(p.unique_visitors), String(p.submission_rate)]);
    }
    rows.push([]);
    rows.push(["recent_submissions", "page", "status", "email", "created_at"]);
    for (const s of recent) {
      rows.push(["", s.page_title, s.status, s.submitter_email ?? "", s.created_at]);
    }
    downloadCsv(`forge-org-analytics-${range}.csv`, rows);
  };

  const selectedPage = pagesQ.data?.find((p: PageOut) => p.id === selectedPageId);
  const ps = pageSumQ.data as Record<string, unknown> | undefined;

  const workflowMix = React.useMemo(() => {
    const pages = pagesQ.data ?? [];
    let contact = 0;
    let proposal = 0;
    let deck = 0;
    for (const pg of pages) {
      const f = getWorkflowFamily(pg.page_type);
      if (f === "contact") contact += 1;
      else if (f === "proposal") proposal += 1;
      else if (f === "deck") deck += 1;
    }
    return { contact, proposal, deck, total: pages.length };
  }, [pagesQ.data]);

  if (orgQ.isLoading) {
    return <p className="text-sm text-text-muted font-body">Loading organization analytics…</p>;
  }
  if (orgQ.isError) {
    return (
      <p className="text-sm text-danger font-body" role="alert">
        Could not load analytics.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="section-label">
            {orgMetaQ.data?.name ?? "Workspace"}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text">Analytics</h1>
          <p className="mt-1 text-sm text-text-muted font-body">
            Workspace-wide performance — every figure comes from stored events and submissions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnalyticsRangeSelector />
          <Button type="button" variant="secondary" size="sm" onClick={onDownloadCsv}>
            Download CSV
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <p className="section-label">
          Total submissions this month
        </p>
        <p className="mt-2 font-display text-[clamp(40px,5vw,60px)] font-bold tabular-nums leading-none tracking-tight text-text">
          {subsMonth}
        </p>
        {typeof data?.submissions_month_trend_pct === "number" ? (
          <p className="mt-2 text-sm text-text-muted font-body">
            vs prior month:{" "}
            <span className="font-medium text-text">
              {data.submissions_month_trend_pct > 0 ? "+" : ""}
              {data.submissions_month_trend_pct}%
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Pages live" value={livePages} />
        <KpiCard label="Team members" value={team} hint="Members with access to this workspace." />
        <KpiCard
          label="AI tokens (this month)"
          value={aiTokens.toLocaleString()}
          hint="Prompt + completion tokens recorded for this workspace in the billing period."
        />
      </div>

      {workflowMix.total > 0 ? (
        <div>
          <h2 className="mb-2 font-display text-sm font-bold text-text">Workflow mix</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/dashboard?workflow=contact"
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-accent/30"
            >
              <p className="section-label">
                Contact &amp; booking
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-text">
                {workflowMix.contact}
              </p>
              <p className="mt-1 text-xs text-text-muted font-body">pages · filtered dashboard →</p>
            </Link>
            <Link
              href="/dashboard?workflow=proposal"
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-accent/30"
            >
              <p className="section-label">
                Proposals
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-text">
                {workflowMix.proposal}
              </p>
              <p className="mt-1 text-xs text-text-muted font-body">pages · pipeline in Page Detail →</p>
            </Link>
            <Link
              href="/dashboard?workflow=deck"
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-accent/30"
            >
              <p className="section-label">
                Pitch decks
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-text">
                {workflowMix.deck}
              </p>
              <p className="mt-1 text-xs text-text-muted font-body">pages · present &amp; export →</p>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Views (range)" value={totalViews} />
        <KpiCard label="Submissions (range)" value={totalSubs} />
      </div>

      {(pagesQ.data?.length ?? 0) > 0 ? (
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold text-text">Workflow mix</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/dashboard?workflow=contact"
              className="rounded-[12px] border border-border bg-surface p-4 text-sm shadow-sm transition-colors hover:border-accent/40 font-body"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Contact</p>
              <p className="mt-1 font-display text-xl font-semibold text-text tabular-nums">
                {wfCounts.contact}
              </p>
              <p className="mt-1 text-xs text-text-muted">pages · filtered dashboard →</p>
            </Link>
            <Link
              href="/dashboard?workflow=proposal"
              className="rounded-[12px] border border-border bg-surface p-4 text-sm shadow-sm transition-colors hover:border-accent/40 font-body"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Proposals</p>
              <p className="mt-1 font-display text-xl font-semibold text-text tabular-nums">
                {wfCounts.proposal}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {wfCounts.proposal > 0 ? (
                  <span className="text-accent">
                    Pipeline view →
                  </span>
                ) : (
                  "—"
                )}
              </p>
            </Link>
            <Link
              href="/dashboard?workflow=deck"
              className="rounded-[12px] border border-border bg-surface p-4 text-sm shadow-sm transition-colors hover:border-accent/40 font-body"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-text-muted">Decks</p>
              <p className="mt-1 font-display text-xl font-semibold text-text tabular-nums">
                {wfCounts.deck}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {wfCounts.deck > 0 ? (
                  <span className="text-accent">
                    Engagement view →
                  </span>
                ) : (
                  "—"
                )}
              </p>
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted font-body">
            {wfCounts.proposal > 0 ? (
              <Link href="/analytics/pipeline" className="text-accent underline-offset-4 hover:underline">
                Open proposal pipeline
              </Link>
            ) : null}
            {wfCounts.deck > 0 ? (
              <Link href="/analytics/engagement" className="text-accent underline-offset-4 hover:underline">
                Open deck engagement
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {livePages === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-elevated/40 p-6 text-center">
          <p className="text-sm text-text-muted font-body">No pages yet.</p>
          <p className="mt-2 text-sm text-text-muted font-body">
            Create a page in Studio to start collecting analytics and submissions.
          </p>
          <Button type="button" className="mt-4" variant="secondary" asChild>
            <Link href="/pages">Open Studio</Link>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full max-w-md space-y-2">
          <label htmlFor="org-page-filter" className="text-xs font-medium text-text-muted font-body">
            Focus page
          </label>
          <Select value={selectedPageId || "__all__"} onValueChange={(v) => setPageFilter(v === "__all__" ? "" : v)}>
            <SelectTrigger id="org-page-filter" className="w-full">
              <SelectValue placeholder="All pages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All pages</SelectItem>
              {(pagesQ.data ?? []).map((p: PageOut) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedPageId && selectedPage ? (
          <Button type="button" variant="secondary" size="sm" asChild>
            <Link href={`/pages/${selectedPageId}/analytics?range=${range}`}>Open page analytics</Link>
          </Button>
        ) : null}
      </div>

      {selectedPageId && pageSumQ.isSuccess && ps ? (
        <div className="rounded-2xl border border-border bg-bg-elevated/40 p-4">
          <p className="text-sm font-medium text-text font-body">{selectedPage?.title}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <KpiCard label="Views" value={Number(ps.total_views ?? 0)} />
            <KpiCard label="Unique" value={Number(ps.unique_visitors ?? 0)} />
            <KpiCard label="Submissions" value={Number(ps.submissions ?? 0)} />
            <KpiCard label="Rate" value={`${(Number(ps.submission_rate ?? 0) * 100).toFixed(1)}%`} />
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold text-text">Views trend</h2>
        {sparkData.length >= 2 ? (
          <TrendSparkline data={sparkData} />
        ) : (
          <ChartEmpty
            message={
              emptyOrg
                ? "No analytics events yet. Publish a page and share the link to see traffic here."
                : "Not enough daily points in this range for a sparkline."
            }
          />
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold text-text">Top pages by submissions</h2>
        {topPages.length === 0 ? (
          <ChartEmpty message="No submissions in this range yet." />
        ) : (
          <div className="overflow-x-auto rounded-2xl overflow-hidden border border-border">
            <table className="w-full text-left text-sm font-body">
              <thead className="border-b border-border bg-bg-elevated text-xs uppercase text-text-muted">
                <tr>
                  <th className="p-2">Page</th>
                  <th className="p-2">Submissions</th>
                  <th className="p-2">Visitors</th>
                  <th className="p-2">Rate</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p) => (
                  <tr key={p.page_id} className="border-b border-border">
                    <td className="p-2">
                      <Link
                        className="inline-flex items-center gap-1 text-accent hover:underline"
                        href={`/pages/${p.page_id}/analytics?range=${range}`}
                      >
                        {p.title}
                        <ChevronRight className="size-3.5 shrink-0 opacity-80" aria-hidden />
                      </Link>
                    </td>
                    <td className="p-2 tabular-nums">{p.submissions}</td>
                    <td className="p-2 tabular-nums">{p.unique_visitors}</td>
                    <td className="p-2 tabular-nums">{(p.submission_rate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-display text-sm font-semibold text-text">Recent submissions</h2>
        {recent.length === 0 ? (
          <ChartEmpty message="No submissions in this range." />
        ) : (
          <ul className="divide-y divide-border rounded-2xl overflow-hidden border border-border">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/pages/${s.page_id}/submissions/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm transition-colors hover:bg-bg-elevated/60"
                >
                  <span className="font-medium text-text">{s.page_title}</span>
                  <span className="text-text-muted">{s.submitter_email ?? "—"}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-text-subtle">
                    {new Date(s.created_at).toLocaleString()}
                    <ChevronRight className="size-3.5 shrink-0 text-text-muted" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
