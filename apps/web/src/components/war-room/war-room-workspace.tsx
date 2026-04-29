"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/forge-auth-provider";
import { Sparkles, Layers, Menu, PanelRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { StudioPublishDialog } from "@/components/studio/studio-publish-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rememberLastOrchestrationRunId } from "@/lib/forge-last-run";
import type { ForgeFourLayerPayload } from "@/lib/forge-four-layer";
import { getPage, type PageDetailOut } from "@/lib/api";
import { orchestrationAgentToPane } from "@/lib/war-room-orchestration";
import { streamStudioSse } from "@/lib/sse";
import { wrapStudioPreviewHtml } from "@/lib/studio-preview-html";
import { useForgeSession } from "@/providers/session-provider";
import {
  computeNextMoves,
  loadNextMoveDismissals,
  pickNextMove,
  persistNextMoveDismissals,
  type NextMove,
} from "@/lib/next-move-engine";
import { cn } from "@/lib/utils";
import { useWarRoomStore, type WarRoomStage, type WarRoomState } from "@/stores/war-room-store";
import "./war-room-tokens.css";

const WarRoomAgentsDrawer = dynamic(
  () => import("./war-room-agents-drawer").then((m) => m.WarRoomAgentsDrawer),
  { ssr: false },
);
const WarRoomSimulatePanel = dynamic(
  () => import("./war-room-simulate-panel").then((m) => m.WarRoomSimulatePanel),
  { ssr: false },
);

const STAGES: readonly WarRoomStage[] = ["idea", "system", "design", "build", "grow"];

function parseStage(raw: string | null): WarRoomStage | null {
  if (!raw) return null;
  const x = raw.toLowerCase();
  return (STAGES as readonly string[]).includes(x) ? (x as WarRoomStage) : null;
}

function intentDepth(intent: Record<string, unknown> | undefined): boolean {
  if (!intent || typeof intent !== "object") return true;
  const keys = Object.keys(intent);
  return keys.length < 4;
}

/** Wall clock for time-based UI; updates on an interval + tab focus (avoid Date.now in pure render). */
function useTickerNow(intervalMs = 30_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs]);
  return now;
}

function WarRoomStageNav({
  stage,
  onStage,
}: {
  stage: WarRoomStage;
  onStage: (s: WarRoomStage) => void;
}) {
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <nav
      aria-label="Product stages"
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-xl border px-2 py-1 font-body text-[11px] font-semibold",
        "border-[var(--wr-border)] bg-[color-mix(in_oklch,var(--wr-surface)_96%,transparent)]",
      )}
    >
      {STAGES.map((s) => {
        const active = s === stage;
        return (
          <button
            key={s}
            type="button"
            aria-current={active ? "step" : undefined}
            className={cn(
              "rounded-lg px-2.5 py-1 uppercase tracking-[0.06em]",
              active
                ? "bg-[color-mix(in_oklch,var(--wr-copper)_22%,transparent)] text-[var(--wr-fg)]"
                : "text-[var(--wr-muted)] hover:bg-black/5 dark:hover:bg-white/5",
              !reduced && "transition-colors duration-300 ease-out",
            )}
            onClick={() => onStage(s)}
          >
            {s}
          </button>
        );
      })}
    </nav>
  );
}

function StrategyColumn({
  page,
  fourLayer,
  refineInstructionsRef,
  refinePrompt,
  setRefinePrompt,
  streamBusy,
  onSubmitRefine,
}: {
  page: PageDetailOut;
  fourLayer: ForgeFourLayerPayload | null;
  refineInstructionsRef: React.RefObject<HTMLTextAreaElement | null>;
  refinePrompt: string;
  setRefinePrompt: (s: string) => void;
  streamBusy: boolean;
  onSubmitRefine: () => void;
}) {
  const intentObj = page.intent_json as Record<string, unknown> | undefined;
  const inferred =
    ((intentObj?.title_suggestion as string | undefined)?.trim()
      ? (intentObj?.title_suggestion as string)
      : page.title) ?? "";

  const [goal, setGoal] = React.useState(inferred);

  const phase = useWarRoomStore((s) => s.streamPhase);
  const mem = fourLayer?.memory_why ?? [];

  return (
    <section
      aria-label="Strategy"
      className="war-room-pane flex min-h-[280px] flex-col rounded-2xl p-4 shadow-sm"
      data-pane="strategy"
    >
      <header className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--wr-muted)]">
        <Sparkles className="size-3.5" aria-hidden />
        Strategy
      </header>
      {phase === "strategy" ? (
        <p className="mb-3 text-[13px] text-[var(--wr-copper)]" role="status">
          Updating strategy orchestration…
        </p>
      ) : null}
      <label className="text-[12px] font-semibold text-[var(--wr-fg)]" htmlFor="wr-goal">
        Goal
      </label>
      <textarea
        id="wr-goal"
        rows={3}
        className="mt-1 mb-4 w-full resize-y rounded-xl border border-[var(--wr-border)] bg-white/70 px-3 py-2 text-sm text-[var(--wr-fg)] shadow-inner dark:bg-black/25"
        value={goal}
        placeholder="Describe what this project should accomplish…"
        onChange={(e) => setGoal(e.target.value)}
      />
      <div className="mb-4">
        <p className="text-[12px] font-semibold text-[var(--wr-fg)]">Target user</p>
        <p className="mt-1 text-[13px] leading-snug text-[var(--wr-muted)]">
          {fourLayer?.layer1_reasoning
            ? String(fourLayer.layer1_reasoning).slice(0, 420)
            : "GlideDesign will surface persona detail after the strategy layer runs."}
        </p>
      </div>
      {mem.length > 0 ? (
        <div className="mb-4">
          <p className="text-[12px] font-semibold text-[var(--wr-fg)]">Memory influencing this session</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {mem.slice(0, 6).map((line) => (
              <li key={line.slice(0, 32)} className="rounded-full border border-[var(--wr-border)] px-2 py-0.5 text-[11px]">
                {line.slice(0, 120)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-auto border-t border-[var(--wr-border)] pt-3">
        <label className="text-[12px] font-semibold text-[var(--wr-fg)]" htmlFor="wr-refine">
          Refinement
        </label>
        <textarea
          id="wr-refine"
          ref={refineInstructionsRef}
          rows={3}
          disabled={streamBusy}
          className="mt-1 w-full resize-y rounded-xl border border-[var(--wr-border)] bg-white/70 px-3 py-2 text-sm text-[var(--wr-fg)] shadow-inner disabled:opacity-60 dark:bg-black/25"
          placeholder="Instructions for GlideDesign (same orchestration pipeline as Classic Studio)."
          value={refinePrompt}
          onChange={(e) => setRefinePrompt(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          className="mt-2 bg-[image:var(--brand-gradient)] text-white hover:opacity-90"
          disabled={streamBusy || !refinePrompt.trim()}
          onClick={onSubmitRefine}
        >
          {streamBusy ? "Running…" : "Run refinement"}
        </Button>
      </div>
    </section>
  );
}

function CanvasColumn({ page }: { page: PageDetailOut }) {
  const phase = useWarRoomStore((s) => s.streamPhase);
  const canvasView = useWarRoomStore((s) => s.canvasView);
  const setCanvasView = useWarRoomStore((s) => s.setCanvasView);
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const srcDoc = wrapStudioPreviewHtml(page.current_html || "<p>Draft preview</p>");

  React.useEffect(() => {
    if (!iframeRef.current) return;
    iframeRef.current.srcdoc = srcDoc;
  }, [srcDoc]);

  const views = [
    ["design", "Design"],
    ["flow", "Flow"],
    ["system", "System"],
    ["heatmap", "Heatmap"],
    ["logic", "Logic"],
  ] as const;

  return (
    <section aria-label="Canvas" className="war-room-pane flex min-h-[320px] flex-col rounded-2xl p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--wr-muted)]">
          <Layers className="size-3.5" aria-hidden />
          Canvas
        </div>
        <div className="flex flex-wrap gap-1">
          {views.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "rounded-lg px-2 py-0.5 text-[11px] font-semibold",
              canvasView === id ? "bg-[image:var(--brand-gradient)] text-white" : "bg-black/5 text-[var(--wr-muted)] dark:bg-white/10",
              )}
              onClick={() => setCanvasView(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {phase === "canvas" ? (
        <p className="mb-2 text-[13px] text-[var(--wr-copper)]" role="status">
          Updating canvas synthesis…
        </p>
      ) : null}
      <div className="relative min-h-[280px] flex-1 overflow-hidden rounded-xl border border-[var(--wr-border)] bg-black/[0.04] dark:bg-white/[0.04]">
        <iframe
          title="GlideDesign preview"
          className="size-full min-h-[280px]"
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </section>
  );
}

function SystemColumn({ page }: { page: PageDetailOut }) {
  const tab = useWarRoomStore((s) => s.systemTab);
  const setTab = useWarRoomStore((s) => s.setSystemTab);
  const four = useWarRoomStore((s) => s.fourLayer);
  const spec = (four?.layer2_design_spec_json ?? {}) as Record<string, unknown>;
  const phase = useWarRoomStore((s) => s.streamPhase);

  const tabs = [
    ["data", "Data"],
    ["states", "States"],
    ["logic", "Logic"],
    ["money", "Money"],
  ] as const;

  return (
    <section
      aria-label="System"
      className="wr-system-col war-room-pane flex min-h-[280px] flex-col rounded-2xl p-4 shadow-sm"
      data-pane="system"
      style={{ color: "var(--wr-emerald)" }}
    >
      <header className="mb-2 flex items-center justify-between gap-2 text-[var(--wr-fg)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide">System spec</span>
        {phase === "system" ? (
          <span className="text-[11px] text-[var(--wr-copper)]" role="status">
            Updating…
          </span>
        ) : null}
      </header>
      <div role="tablist" aria-label="System focus" className="mb-3 flex gap-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cn(
              "rounded-lg px-2 py-1 text-[11px] font-semibold",
              tab === id ? "bg-[color-mix(in_oklch,var(--wr-emerald)_35%,transparent)]" : "text-[var(--wr-muted)]",
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="min-h-[200px] flex-1 overflow-auto rounded-xl border border-[var(--wr-border)] bg-white/70 p-2 text-[12px] text-[var(--wr-fg)] dark:bg-black/30">
        <pre className="whitespace-pre-wrap break-words font-mono">{JSON.stringify({ page_meta: page.page_type }, null, 2)}</pre>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono">{JSON.stringify(spec, null, 2)}</pre>
      </div>
      <p className="mt-3 text-[11px] text-[var(--wr-muted)]">Layer 2 JSON previews here until system round-trips are wired.</p>
    </section>
  );
}

function NextMoveBar({
  page,
  fourLayer,
  commitStage,
  setSystemTab,
  setRefinePrompt,
  refineInstructionsRef,
  onSimulate,
  onPublish,
}: {
  page: PageDetailOut;
  fourLayer: ForgeFourLayerPayload | null;
  commitStage: (next: WarRoomStage) => void;
  setSystemTab: WarRoomState["setSystemTab"];
  setRefinePrompt: React.Dispatch<React.SetStateAction<string>>;
  refineInstructionsRef: React.RefObject<HTMLTextAreaElement | null>;
  onSimulate: () => void;
  onPublish: () => void;
}) {
  const intent = page.intent_json as Record<string, unknown> | undefined;
  const moves = React.useMemo(() => {
    const quality = page.last_review_quality_score ?? null;
    return computeNextMoves({
      pageTitle: page.title,
      pageType: page.page_type,
      status: page.status,
      qualityScore: quality,
      lastReviewDegraded: page.review_degraded_quality ?? false,
      fourLayer,
      flowLooksEmpty: intentDepth(intent),
      visitorCount: null,
      hasMonetizationHint: false,
    });
  }, [page, fourLayer, intent]);

  const [dismissed, setDismissed] = React.useState<Record<string, { count: number; until?: number; permanent?: boolean }>>(
    () => loadNextMoveDismissals(),
  );

  const tickerNow = useTickerNow();
  const active = React.useMemo(() => {
    const filtered = moves.filter((m) => {
      const d = dismissed[m.id];
      if (!d) return true;
      if (d.permanent) return false;
      if (d.until && d.until > tickerNow) return false;
      return true;
    });
    return pickNextMove(filtered);
  }, [moves, dismissed, tickerNow]);

  if (!active) {
    return (
      <div
        className="flex min-h-[48px] items-center rounded-2xl border border-dashed border-[var(--wr-border)] px-4 text-[13px] text-[var(--wr-muted)]"
        role="status"
      >
        No next move suggested — continue shaping the product.
      </div>
    );
  }

  function dismiss(m: NextMove, permanent: boolean) {
    const cur = { ...dismissed };
    const prev = cur[m.id] ?? { count: 0 };
    const count = prev.count + 1;
    const nextEntry = {
      count,
      until: permanent ? undefined : Date.now() + 4 * 60 * 60 * 1000,
      permanent: permanent || count >= 3,
    };
    const next = { ...cur, [m.id]: nextEntry };
    setDismissed(next);
    persistNextMoveDismissals(next);
  }

  function openSuggestedMove(m: NextMove) {
    const p = m.action_payload;

    if (typeof p.stage === "string") {
      const st = parseStage(p.stage);
      if (st) commitStage(st);
    }
    const tabRaw = typeof p.tab === "string" ? p.tab : null;
    if (tabRaw === "data" || tabRaw === "states" || tabRaw === "logic" || tabRaw === "money") {
      setSystemTab(tabRaw);
    }

    switch (m.action_kind) {
      case "refine": {
        const focus =
          typeof p.focus === "string" && p.focus.trim().length > 0
            ? `Improve ${p.focus.trim()}: `
            : "";
        setRefinePrompt((prev) => {
          const core = prev.trim();
          return core ? `${core}\n${focus}` : focus || prev;
        });
        requestAnimationFrame(() => refineInstructionsRef.current?.focus());
        toast.message("Refinement", { description: "Add detail in Refinement, then run." });
        break;
      }
      case "simulate":
        onSimulate();
        break;
      case "deploy":
        onPublish();
        break;
      default:
        toast.message(m.title, { description: m.rationale });
    }
  }

  return (
    <section
      aria-label="Next move"
      className="flex flex-col gap-2 rounded-2xl border border-[var(--wr-border)] bg-[color-mix(in_oklch,var(--wr-surface)_88%,transparent)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--wr-muted)]">Next move</p>
        <p className="text-[14px] font-semibold text-[var(--wr-fg)]">{active.title}</p>
        <p className="text-[12px] text-[var(--wr-muted)]">{active.rationale}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          className="bg-[image:var(--brand-gradient)] text-white hover:opacity-90"
          onClick={() => openSuggestedMove(active)}
        >
          Open
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => dismiss(active, false)}>
          Not now
        </Button>
      </div>
    </section>
  );
}

function ActionDock({
  pageId,
  onPublish,
  onSimulate,
}: {
  pageId: string;
  onPublish: () => void;
  onSimulate?: () => void;
}) {
  return (
    <section
      aria-label="Actions"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--wr-border)] bg-[color-mix(in_oklch,var(--wr-surface)_92%,transparent)] px-3 py-2"
    >
      <Button type="button" size="sm" className="bg-[image:var(--brand-gradient)] text-white" onClick={onPublish}>
        Deploy
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={
          onSimulate ??
          (() =>
            toast.message("Simulate mode", {
              description: "Synthetic personas — requires BP-04 credit plumbing.",
            }))
        }
      >
        Simulate
      </Button>
      <Button type="button" size="sm" variant="secondary" asChild>
        <Link href={`/pages/${pageId}`}>Page detail</Link>
      </Button>
      <Button type="button" size="sm" variant="ghost" asChild>
        <Link href={`/studio?legacy=1&pageId=${encodeURIComponent(pageId)}`}>Legacy Studio</Link>
      </Button>
    </section>
  );
}

export function WarRoomWorkspace({ projectId }: { projectId: string }) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const abortRef = React.useRef<AbortController | null>(null);
  const fourLayerAccRef = React.useRef<ForgeFourLayerPayload | null>(null);
  const refineInstructionsRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [refinePrompt, setRefinePrompt] = React.useState("");
  const [streamBusy, setStreamBusy] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [agentsOpen, setAgentsOpen] = React.useState(false);
  const [simOpen, setSimOpen] = React.useState(false);
  const [systemDrawerOpen, setSystemDrawerOpen] = React.useState(false);

  const stageFromUrl = React.useMemo(() => parseStage(searchParams.get("stage")), [searchParams]);
  const stage = useWarRoomStore((s) => s.stage);
  const setStage = useWarRoomStore((s) => s.setStage);
  const fourLayer = useWarRoomStore((s) => s.fourLayer);
  const setFour = React.useCallback(
    (fl: ForgeFourLayerPayload | null) => useWarRoomStore.getState().hydrateFromGeneration({ fourLayer: fl }),
    [],
  );
  const setProjectId = useWarRoomStore((s) => s.setProjectId);
  const setStreamPhase = useWarRoomStore((s) => s.setStreamPhase);
  const setSystemTab = useWarRoomStore((s) => s.setSystemTab);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const hydratedStage = React.useRef(false);
  React.useEffect(() => {
    setProjectId(projectId);
    return () => setProjectId(null);
  }, [projectId, setProjectId]);

  React.useEffect(() => {
    if (hydratedStage.current) return;
    if (stageFromUrl) setStage(stageFromUrl);
    hydratedStage.current = true;
  }, [setStage, stageFromUrl]);

  const commitStage = React.useCallback(
    (next: WarRoomStage) => {
      setStage(next);
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("stage", next);
      router.replace(`/studio/war-room/${projectId}?${sp.toString()}`, { scroll: false });
    },
    [projectId, router, searchParams, setStage],
  );

  async function abortSse() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  const onSubmitRefine = React.useCallback(async () => {
    const msg = refinePrompt.trim();
    if (!msg || streamBusy || !activeOrganizationId) return;
    await abortSse();
    const ac = new AbortController();
    abortRef.current = ac;
    fourLayerAccRef.current = null;
    setStreamBusy(true);

    try {
      await streamStudioSse(
        "/studio/refine",
        { message: msg, page_id: projectId, provider: "openai" },
        { getToken, activeOrgId: activeOrganizationId, signal: ac.signal },
        async (event, data) => {
          if (event === "orchestration.phase" && data && typeof data === "object") {
            const agent =
              typeof (data as { agent?: string }).agent === "string"
                ? (data as { agent: string }).agent
                : "";
            if (agent) setStreamPhase(orchestrationAgentToPane(agent));
          }
          if (event === "orchestration.four_layer" && data && typeof data === "object") {
            fourLayerAccRef.current = data as ForgeFourLayerPayload;
            setFour(data as ForgeFourLayerPayload);
          }
          if (event === "html.complete" && data && typeof data === "object") {
            const d = data as {
              four_layer?: ForgeFourLayerPayload;
              run_id?: string;
              page_id?: string;
            };
            if (typeof d.run_id === "string" && d.run_id.trim().length > 0) {
              rememberLastOrchestrationRunId(d.run_id.trim());
            }
            const merged = d.four_layer ?? fourLayerAccRef.current ?? null;
            if (merged) setFour(merged);
            void queryClient.invalidateQueries({
              queryKey: ["war-room-page", activeOrganizationId, projectId],
            });
            toast.message("Changes applied", { description: "Preview and panels updated." });
          }
          if (event === "error" && data && typeof data === "object") {
            const errmsg = (data as { message?: string }).message ?? "Refinement failed";
            toast.error(errmsg);
          }
        },
      );
    } catch (e) {
      if (ac.signal.aborted) return;
      toast.error(e instanceof Error ? e.message : "Stream failed");
    } finally {
      if (!ac.signal.aborted) {
        setStreamBusy(false);
        setStreamPhase("idle");
      }
      abortRef.current = null;
    }
  }, [
    refinePrompt,
    streamBusy,
    activeOrganizationId,
    projectId,
    getToken,
    setFour,
    setStreamPhase,
    queryClient,
  ]);

  const q = useQuery({
    queryKey: ["war-room-page", activeOrganizationId, projectId],
    enabled: !!activeOrganizationId && !!projectId,
    queryFn: () => getPage(getToken, activeOrganizationId!, projectId),
  });

  React.useEffect(() => {
    const rep = q.data?.last_review_report as Record<string, unknown> | undefined;
    if (!rep?.bp01_four_layer) return;
    setFour(rep.bp01_four_layer as ForgeFourLayerPayload);
  }, [q.data?.last_review_report, setFour]);

  React.useEffect(() => {
    function onCap(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "/") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input,textarea,[contenteditable]")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      refineInstructionsRef.current?.focus();
    }
    window.addEventListener("keydown", onCap, true);
    return () => window.removeEventListener("keydown", onCap, true);
  }, []);

  if (q.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--wr-muted)]" role="status">
        Loading project…
      </div>
    );
  }
  if (q.error || !q.data) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-sm text-danger" role="alert">
        Unable to load this project.
      </div>
    );
  }

  const page = q.data;

  return (
    <div className="war-room-root space-y-2 p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-[var(--wr-fg)]">{page.title}</p>
          <p className="text-[11px] text-[var(--wr-muted)]">
            GlideDesign War Room · {page.page_type} · {page.status === "live" ? "Live" : "Draft"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WarRoomStageNav stage={stage} onStage={commitStage} />
          <Button type="button" variant="secondary" size="sm" className="border-[var(--wr-border)]" onClick={() => setAgentsOpen(true)}>
            <PanelRight className="mr-1 size-3.5" />
            Agents
          </Button>
          <Button type="button" variant="secondary" size="sm" className="border-[var(--wr-border)] md:hidden" onClick={() => setSystemDrawerOpen(true)}>
            <Menu className="mr-1 size-3.5" />
            System
          </Button>
        </div>
      </div>

      {systemDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Dismiss" onClick={() => setSystemDrawerOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[92vw] max-w-sm flex-col overflow-y-auto bg-[var(--wr-surface)] p-4 shadow-2xl">
            <SystemColumn page={page} />
            <Button type="button" variant="ghost" size="sm" className="mt-2 self-end" onClick={() => setSystemDrawerOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}

      <div className="md:hidden">
        <Tabs defaultValue="canvas">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="canvas">Canvas</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          <TabsContent value="strategy">
            <StrategyColumn
              key={page.id}
              page={page}
              fourLayer={fourLayer}
              refineInstructionsRef={refineInstructionsRef}
              refinePrompt={refinePrompt}
              setRefinePrompt={setRefinePrompt}
              streamBusy={streamBusy}
              onSubmitRefine={onSubmitRefine}
            />
          </TabsContent>
          <TabsContent value="canvas">
            <CanvasColumn page={page} />
          </TabsContent>
          <TabsContent value="system">
            <SystemColumn page={page} />
          </TabsContent>
        </Tabs>
      </div>

      <div
        className={cn("war-room-main-grid hidden gap-3 md:grid")}
        data-stage={stage}
      >
        <StrategyColumn
          key={page.id}
          page={page}
          fourLayer={fourLayer}
          refineInstructionsRef={refineInstructionsRef}
          refinePrompt={refinePrompt}
          setRefinePrompt={setRefinePrompt}
          streamBusy={streamBusy}
          onSubmitRefine={onSubmitRefine}
        />
        <CanvasColumn page={page} />
        <SystemColumn page={page} />
      </div>

      <NextMoveBar
        page={page}
        fourLayer={fourLayer}
        commitStage={commitStage}
        setSystemTab={setSystemTab}
        refineInstructionsRef={refineInstructionsRef}
        setRefinePrompt={setRefinePrompt}
        onSimulate={() => setSimOpen(true)}
        onPublish={() => setPublishOpen(true)}
      />

      <ActionDock pageId={page.id} onPublish={() => setPublishOpen(true)} onSimulate={() => setSimOpen(true)} />

      <StudioPublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        getToken={getToken}
        activeOrgId={activeOrganizationId}
        pageId={page.id}
        initialTitle={page.title}
        currentSlug={page.slug}
        onPublished={(out) => {
          toast.success("Published", {
            action: { label: "View live page ↗", onClick: () => window.open(out.public_url, "_blank") },
          });
          void queryClient.invalidateQueries({
            queryKey: ["war-room-page", activeOrganizationId, projectId],
          });
        }}
      />

      {agentsOpen ? <WarRoomAgentsDrawer onClose={() => setAgentsOpen(false)} page={page} /> : null}
      {simOpen ? <WarRoomSimulatePanel onClose={() => setSimOpen(false)} /> : null}
    </div>
  );
}
