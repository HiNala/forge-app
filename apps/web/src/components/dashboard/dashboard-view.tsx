"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { ArrowUpRight, LayoutGrid, Sparkles } from "lucide-react";
import { DashboardTipBanner } from "@/components/chrome/dashboard-tip-banner";
import { EmptyState } from "@/components/chrome/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { STUDIO_STARTER_CHIPS, resolveSurprisePrompt } from "@/lib/studio-content";
import { timeOfDayGreeting } from "@/lib/studio-greeting";
import {
  type DashboardWorkflowFilter,
  pageMatchesWorkflowFilter,
} from "@/lib/workflow-config";
import { getPageUnreadCounts, listPages } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";
import { DashboardPageCard } from "./dashboard-page-card";
import { UsageQuotaBar } from "./usage-quota-bar";

type Filter = "all" | "live" | "draft" | "archived";

function parseFilter(s: string | null): Filter {
  if (s === "live" || s === "draft" || s === "archived") return s;
  return "all";
}

function parseWorkflowFilter(s: string | null): DashboardWorkflowFilter {
  if (s === "contact" || s === "proposal" || s === "deck" || s === "other") return s;
  return "all";
}

export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getToken } = useAuth();
  const { activeOrganizationId, user } = useForgeSession();

  const filter = parseFilter(searchParams.get("filter"));
  const workflowFilter = parseWorkflowFilter(searchParams.get("workflow"));
  const qUrl = searchParams.get("q") ?? "";

  const [qInput, setQInput] = React.useState(qUrl);
  React.useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- align search field with URL on history navigation
    setQInput(qUrl);
  }, [qUrl]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = qInput.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const qs = next.toString();
      const cur = searchParams.toString();
      if (qs !== cur) router.replace(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
    }, 250);
    return () => window.clearTimeout(t);
  }, [qInput, router, searchParams]);

  const setFilter = (f: Filter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (f === "all") next.delete("filter");
    else next.set("filter", f);
    router.replace(`/dashboard?${next.toString()}`, { scroll: false });
  };

  const setWorkflowFilter = (f: DashboardWorkflowFilter) => {
    const next = new URLSearchParams(searchParams.toString());
    if (f === "all") next.delete("workflow");
    else next.set("workflow", f);
    router.replace(`/dashboard?${next.toString()}`, { scroll: false });
  };

  const pagesQ = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const unreadQ = useQuery({
    queryKey: ["unread-counts", activeOrganizationId],
    queryFn: () => getPageUnreadCounts(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
  });

  const firstName =
    user?.display_name?.split(/\s+/)[0] ?? user?.email?.split("@")[0] ?? "there";

  const unread = unreadQ.data ?? {};

  const keywordWorkflowHint = React.useMemo(() => {
    const qt = qUrl.trim().toLowerCase();
    if (qt.includes("proposal") || qt.includes("quote") || qt.includes("bid"))
      return "proposal" as const;
    if (qt.includes("deck") || qt.includes("pitch") || qt.includes("slide"))
      return "deck" as const;
    if (qt.includes("contact") || qt.includes("booking") || qt.includes("form"))
      return "contact" as const;
    return null;
  }, [qUrl]);

  const filtered = React.useMemo(() => {
    let rows = pagesQ.data ?? [];
    if (filter === "live") rows = rows.filter((p) => p.status === "live");
    else if (filter === "draft") rows = rows.filter((p) => p.status === "draft");
    else if (filter === "archived") rows = rows.filter((p) => p.status === "archived");
    if (workflowFilter !== "all") {
      rows = rows.filter((p) => pageMatchesWorkflowFilter(p.page_type, workflowFilter));
    }
    const qt = qUrl.trim().toLowerCase();
    if (qt) rows = rows.filter((p) => p.title.toLowerCase().includes(qt));
    return rows;
  }, [pagesQ.data, filter, qUrl, workflowFilter]);

  const [visibleCount, setVisibleCount] = React.useState(24);
  const [cardFocus, setCardFocus] = React.useState(0);
  const searchRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reset paging and keyboard focus when filters/search change */
    setVisibleCount(24);
    setCardFocus(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [filter, qUrl, workflowFilter]);

  const slice = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  React.useEffect(() => {
    if (pathname !== "/dashboard") return;

    const typingSelector =
      "input:not([readonly]), textarea, select, [contenteditable=true], [role=combobox]";

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.closest(typingSelector);
      const focusSearch = (): boolean =>
        !!(searchRef.current && document.activeElement === searchRef.current);
      const inSearch = focusSearch();

      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (typing && !inSearch) return;
        if (!inSearch) {
          e.preventDefault();
          searchRef.current?.focus();
        }
        return;
      }

      if (typing && !inSearch) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        router.push("/studio");
        return;
      }

      if (slice.length === 0) return;

      if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        setCardFocus((i) => Math.min(slice.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setCardFocus((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setCardFocus((i) => Math.min(slice.length - 1, i + 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setCardFocus((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        const p = slice[cardFocus];
        if (p) router.push(`/pages/${p.id}`);
      } else if (e.key === "e" || e.key === "E") {
        const p = slice[cardFocus];
        if (p) {
          e.preventDefault();
          router.push(`/studio?pageId=${p.id}`);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, slice, cardFocus, router]);

  if (!activeOrganizationId) {
    return (
      <div className="surface-panel-soft rounded-2xl px-6 py-8">
        <p className="font-body text-sm text-text-muted">Choose a workspace to see your pages.</p>
      </div>
    );
  }

  if (pagesQ.isError) {
    return (
      <div className="space-y-8">
        <DashboardTipBanner />
        <div className="surface-panel-soft rounded-2xl border-danger/30 px-5 py-4" role="alert">
          <p className="font-body text-sm font-medium text-danger">Could not load pages.</p>
          <p className="mt-1 font-body text-sm text-text-muted">
            {pagesQ.error instanceof Error ? pagesQ.error.message : "Try again in a moment."}
          </p>
        </div>
      </div>
    );
  }

  const chips: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "live", label: "Live" },
    { id: "draft", label: "Drafts" },
    { id: "archived", label: "Archived" },
  ];

  const wfChips: { id: DashboardWorkflowFilter; label: string }[] = [
    { id: "all", label: "All types" },
    { id: "contact", label: "Contact" },
    { id: "proposal", label: "Proposals" },
    { id: "deck", label: "Decks" },
    { id: "other", label: "Other" },
  ];

  return (
    <div className="space-y-8">
      <UsageQuotaBar />
      <DashboardTipBanner />
      <div className="relative overflow-hidden rounded-[32px] bg-marketing-lime p-6 text-marketing-ink shadow-lg">
        <div className="absolute -right-8 -top-10 size-48 rounded-full bg-white/45" aria-hidden />
        <div className="absolute bottom-5 right-12 hidden h-20 w-44 rounded-[24px] bg-marketing-ink/12 md:block" aria-hidden />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-display-md text-marketing-ink">Recents</h1>
            <p className="mt-2 max-w-2xl text-body-sm font-semibold text-marketing-ink/75">
              Recently viewed, shared files, and shipped surfaces from your GlideDesign workspace.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="gap-1.5 bg-marketing-ink text-white hover:bg-marketing-ink"
            onClick={() => router.push("/studio")}
          >
            <Sparkles className="size-4" aria-hidden />
            Open Studio
            <ArrowUpRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {pagesQ.isLoading && pagesQ.data === undefined ? (
        <ul className="grid list-none gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="list-none">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <Skeleton className="h-[140px] w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (pagesQ.data ?? []).length === 0 ? (
        <div className="space-y-10">
          <EmptyState
            icon={LayoutGrid}
            title="Let's make your first page"
            description="Describe what you need in Studio - a booking form, RSVP, menu, or anything your business needs online."
            primaryAction={{ label: "Open Studio", onClick: () => router.push("/studio") }}
            secondaryAction={{
              label: "Browse templates",
              onClick: () => router.push("/app-templates"),
            }}
          />
          <div>
            <p className="mb-4 text-center text-sm font-medium text-text-muted font-body">Try a starter prompt</p>
            <div className="flex flex-wrap justify-center gap-2">
              {STUDIO_STARTER_CHIPS.filter((c) => c.id !== "surprise").map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent font-body"
                  onClick={() => router.push(`/studio?prompt=${encodeURIComponent(c.prompt)}`)}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent font-body"
                onClick={() =>
                  router.push(`/studio?prompt=${encodeURIComponent(resolveSurprisePrompt())}`)
                }
              >
                Surprise me
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Greeting + search */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1
                className="font-display font-bold text-text"
                style={{ fontSize: "clamp(24px, 3.5vw, 30px)", letterSpacing: "-0.01em", lineHeight: 1 }}
              >
                {timeOfDayGreeting(firstName)}.
              </h1>
              <p className="mt-1.5 font-body text-[13px] font-light text-text-muted">
                {(pagesQ.data ?? []).filter((p) => p.status === "live").length} live
                {" / "}
                {(pagesQ.data ?? []).filter((p) => p.status === "draft").length} drafts
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Input
                ref={searchRef}
                className="w-[200px]"
                placeholder="Search pages..."
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                aria-label="Search pages"
              />
              {keywordWorkflowHint ? (
                <button
                  type="button"
                  className="text-left font-body text-xs font-medium text-accent underline-offset-4 hover:underline"
                  onClick={() => {
                    setWorkflowFilter(keywordWorkflowHint === "proposal" ? "proposal" : keywordWorkflowHint);
                    setQInput("");
                  }}
                >
                  See all{" "}
                  {keywordWorkflowHint === "contact"
                    ? "contact & booking pages"
                    : keywordWorkflowHint === "proposal"
                      ? "proposals"
                      : "pitch decks"}{" "}
                  <ArrowUpRight className="inline size-3" aria-hidden />
                </button>
              ) : null}
            </div>
          </div>

          {/* Status filter tabs (underline style) + workflow pills */}
          <div className="space-y-2.5">
            <div className="flex gap-0 border-b border-border">
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFilter(c.id)}
                  className={cn(
                    "-mb-px border-b-2 px-4 py-2 font-body text-[13px] transition-colors",
                    filter === c.id
                      ? "font-semibold text-text border-text"
                      : "font-medium text-text-muted border-transparent hover:text-text hover:border-border-strong",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {/* Type filter pills - secondary row */}
            <div className="flex flex-wrap gap-1.5">
              {wfChips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setWorkflowFilter(c.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 font-body text-[11px] font-semibold transition-colors",
                    workflowFilter === c.id
                      ? "border-text/20 bg-text text-bg"
                      : "border-border bg-surface text-text-muted hover:border-border-strong hover:text-text",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {slice.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-6 py-8 text-center font-body text-sm text-text-muted">
              No pages match this filter. Try another tab or clear search.
            </p>
          ) : (
            <>
              <ul
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                aria-label="Workspace pages"
              >
                {/* New page dashed card - always first */}
                {filter === "all" && !qUrl.trim() && workflowFilter === "all" ? (
                  <li className="list-none">
                    <button
                      type="button"
                      onClick={() => router.push("/studio")}
                      className="group flex h-full min-h-[210px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border bg-transparent font-body transition-all hover:border-accent hover:bg-accent-light/30"
                    >
                      <div className="flex size-8 items-center justify-center rounded-[9px] bg-bg-elevated text-text-muted transition-colors group-hover:bg-accent-light group-hover:text-accent">
                        <Sparkles className="size-4" aria-hidden />
                      </div>
                      <span className="text-[13px] font-medium text-text-muted transition-colors group-hover:text-accent">
                        New page
                      </span>
                    </button>
                  </li>
                ) : null}
                {slice.map((p, idx) => (
                  <DashboardPageCard
                    key={p.id}
                    page={p}
                    unread={unread[p.id] ?? 0}
                    keyboardFocused={cardFocus === idx}
                    onMouseEnterCard={() => setCardFocus(idx)}
                    onEdit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/studio?pageId=${p.id}`);
                    }}
                  />
                ))}
              </ul>
              {hasMore ? (
                <div className="flex justify-center">
                  <Button type="button" variant="secondary" onClick={() => setVisibleCount((n) => n + 24)}>
                    Load more
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
