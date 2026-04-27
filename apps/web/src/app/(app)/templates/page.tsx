"use client";

import { useAuth } from "@clerk/nextjs";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getTemplateDetail,
  listTemplates,
  postTemplateUse,
  type TemplateListItemOut,
} from "@/lib/api";
import { STUDIO_WORKFLOW_GRID_ROWS } from "@/components/studio/studio-workflow-grid";
import { templateMatchesStudioRow } from "@/lib/workflow-config";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

const COHORT_QUICK = [
  { slug: "typeform", label: "Typeform" },
  { slug: "carrd", label: "Carrd" },
  { slug: "calendly", label: "Calendly" },
  { slug: "linktree", label: "Linktree" },
  { slug: "tally", label: "Tally" },
] as const;

export default function TemplatesGalleryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const [allItems, setAllItems] = React.useState<TemplateListItemOut[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState(() => searchParams.get("q") ?? "");
  const fromToolParam = searchParams.get("from_tool");
  const [category, setCategory] = React.useState<string | null>(null);
  const [workflowRow, setWorkflowRow] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<TemplateListItemOut | null>(null);
  const [detailHtml, setDetailHtml] = React.useState<string | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [useBusy, setUseBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listTemplates(getToken, {
        q: q.trim() || undefined,
        fromTool: fromToolParam || undefined,
      });
      setAllItems(rows);
    } catch {
      toast.error("Could not load templates.");
    } finally {
      setLoading(false);
    }
  }, [getToken, q, fromToolParam]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount / q refresh
    void load();
  }, [load]);

  const categories = React.useMemo(() => {
    const s = new Set<string>();
    for (const t of allItems) s.add(t.category);
    return Array.from(s).sort();
  }, [allItems]);

  const items = React.useMemo(() => {
    let rows = allItems;
    if (category) rows = rows.filter((t) => t.category === category);
    if (workflowRow)
      rows = rows.filter((t) => templateMatchesStudioRow(t.page_type ?? null, workflowRow));
    return rows;
  }, [allItems, category, workflowRow]);

  async function openDetail(t: TemplateListItemOut) {
    setDetail(t);
    setDetailHtml(null);
    setDetailLoading(true);
    try {
      const d = await getTemplateDetail(getToken, t.id);
      setDetailHtml(d.html);
    } catch {
      toast.error("Could not load template.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function onUse(t: TemplateListItemOut) {
    if (!activeOrganizationId) {
      toast.error("Choose a workspace first.");
      return;
    }
    setUseBusy(true);
    try {
      const out = await postTemplateUse(getToken, activeOrganizationId, t.id);
      router.push(out.studio_path);
    } catch {
      toast.error("Could not create page from template.");
    } finally {
      setUseBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="type-display text-text">Template gallery</h1>
          <p className="mt-1.5 max-w-prose type-body text-text-muted">
            Start from a polished page — brand kit applies automatically.
          </p>
        </div>
        <Link
          href="/studio"
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Back to Studio
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Link
          href="/templates?q=contact"
          className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-teal-500/40"
        >
          <p className="font-display text-lg font-bold text-text">Contact forms &amp; bookings</p>
          <p className="mt-1 text-sm text-text-muted font-body">Lead capture and scheduling templates.</p>
          <span className="mt-3 inline-block text-sm font-medium text-accent font-body">Browse →</span>
        </Link>
        <Link
          href="/templates?q=proposal"
          className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-amber-500/40"
        >
          <p className="font-display text-lg font-bold text-text">Proposals &amp; quotes</p>
          <p className="mt-1 text-sm text-text-muted font-body">Client-ready bids and estimates.</p>
          <span className="mt-3 inline-block text-sm font-medium text-accent font-body">Browse →</span>
        </Link>
        <Link
          href="/templates?q=deck"
          className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-indigo-500/40"
        >
          <p className="font-display text-lg font-bold text-text">Pitch decks</p>
          <p className="mt-1 text-sm text-text-muted font-body">Investor and launch narratives.</p>
          <span className="mt-3 inline-block text-sm font-medium text-accent font-body">Browse →</span>
        </Link>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-surface/60 p-5">
        <p className="font-body text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Coming from another tool?
        </p>
        <p className="mt-1 max-w-prose text-sm text-text-muted font-body">
          Jump to templates we tagged for people switching from common form and link-in-bio products — same job, open handoff.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              router.push("/templates");
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              !fromToolParam
                ? "border-accent bg-accent/10 text-text"
                : "border-border bg-surface text-text-muted hover:border-accent/40",
            )}
          >
            All tools
          </button>
          {COHORT_QUICK.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => {
                router.push(`/templates?from_tool=${encodeURIComponent(c.slug)}`);
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                fromToolParam === c.slug
                  ? "border-accent bg-accent/10 text-text"
                  : "border-border bg-surface text-text-muted hover:border-accent/40",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            className="pl-9"
            placeholder="Search templates…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
            aria-label="Search templates"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          Search
        </Button>
      </div>

      <div className="mt-6">
        <p className="mb-2 font-body text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Workflow groups
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setWorkflowRow(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              workflowRow === null
                ? "border-accent bg-accent/10 text-text"
                : "border-border bg-surface text-text-muted hover:border-accent/40",
            )}
          >
            All workflows
          </button>
          {STUDIO_WORKFLOW_GRID_ROWS.map((row) => (
            <button
              key={row.category}
              type="button"
              onClick={() => setWorkflowRow(row.category)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                workflowRow === row.category
                  ? "border-accent bg-accent/10 text-text"
                  : "border-border bg-surface text-text-muted hover:border-accent/40",
              )}
            >
              {row.category}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition",
            category === null
              ? "border-accent bg-accent/10 text-text"
              : "border-border bg-surface text-text-muted hover:border-accent/40",
          )}
        >
          All categories
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
              category === c
                ? "border-accent bg-accent/10 text-text"
                : "border-border bg-surface text-text-muted hover:border-accent/40",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-bg-elevated" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div
            className="mb-6 text-text-muted"
            aria-hidden
          >
            <svg
              className="mx-auto h-28 w-40"
              viewBox="0 0 160 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
            >
              <rect x="20" y="20" width="120" height="64" rx="6" />
              <path d="M40 50h32M40 58h24M100 50h24" />
              <circle cx="52" cy="50" r="2" fill="currentColor" />
            </svg>
          </div>
          <h2 className="type-heading text-text">No templates match your filters</h2>
          <p className="type-body mt-2 max-w-prose text-text-muted">
            Clear search, a category, or a workflow chip — or start from Studio with a blank page.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setQ("");
                setCategory(null);
                setWorkflowRow(null);
                void load();
              }}
            >
              Clear filters
            </Button>
            <Button type="button" asChild>
              <Link href="/studio">Start from Studio</Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-10 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <li key={t.id}>
              <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-colors hover:border-border-strong">
                <button
                  type="button"
                  className="relative aspect-[16/10] w-full overflow-hidden bg-bg-elevated text-left"
                  onClick={() => void openDetail(t)}
                >
                  {t.preview_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- dynamic S3/R2 URLs
                    <img
                      src={t.preview_image_url}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">
                      Preview pending
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2.5 py-0.5 font-body text-[10px] font-semibold capitalize text-text-muted">
                    {t.category}
                  </span>
                </button>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h2 className="font-display text-lg font-bold text-text">{t.name}</h2>
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button size="sm" disabled={useBusy} onClick={() => void onUse(t)}>
                      Use template
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <a
                        href={`/examples/${t.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Preview live
                      </a>
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void openDetail(t)}>
                      Details
                    </Button>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.name}</DialogTitle>
            <DialogDescription className="capitalize">
              {detail?.category}
            </DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : (
            <>
              {detailHtml ? (
                <div className="overflow-hidden rounded-2xl border border-border">
                  <iframe
                    title="Preview"
                    className="min-h-[320px] w-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={detailHtml}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  disabled={!detail || useBusy}
                  onClick={() => detail && void onUse(detail)}
                >
                  Use template
                </Button>
                {detail ? (
                  <Button variant="secondary" asChild>
                    <a
                      href={`/examples/${detail.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview live
                    </a>
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
