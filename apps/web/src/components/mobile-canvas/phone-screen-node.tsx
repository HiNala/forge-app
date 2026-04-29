"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { Handle, Position, useStore, type Node, type NodeProps } from "@xyflow/react";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { getDevicePreset, type MobileDevicePreset } from "@/lib/mobile-devices";
import { hitsFromNodeIds, MIN_ELEMENT_PICK_ZOOM, pickTargetEl } from "@/lib/forge-preview-hit";
import { duplicateForgeNodesInHtml, removeForgeNodesFromHtml } from "@/lib/mobile-screen-html-mutate";
import { collectForgeHits, marqueeCoverageRatio, type ForgeTaggedHit } from "@/lib/web-marquee-hit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArtifactFeedbackStrip } from "@/components/feedback/artifact-feedback-strip";
import { useLastOrchestrationRunId } from "@/hooks/use-last-orchestration-run";
import { toast } from "sonner";
import { useForgeSession } from "@/providers/session-provider";
import { refineCanvasScreen } from "@/lib/canvas-api";
import { useMobileCanvasStore } from "./mobile-canvas-store";
import type { MobilePhoneNodeData } from "./types";
import { cn } from "@/lib/utils";
import { forgeFallbackHex as FP } from "@/lib/design/forge-html-fallback-colors";

function isKeyEventFromEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function StatusBar({ theme, compact }: { theme: "light" | "dark"; compact?: boolean }) {
  const fg =
    theme === "dark"
      ? "color-mix(in oklch, var(--fc-fg) 92%, transparent)"
      : "color-mix(in oklch, var(--fc-fg) 88%, transparent)";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between px-5 text-[13px] font-semibold tabular-nums",
        compact ? "h-9" : "h-[50px] pt-2",
      )}
      style={{ color: fg }}
    >
      <span>9:41</span>
      <div className="flex items-center gap-1" aria-hidden>
        <svg width="17" height="11" viewBox="0 0 17 11" className="opacity-90" fill="currentColor">
          <rect x="0" y="7" width="3" height="4" rx="1" />
          <rect x="4" y="5" width="3" height="6" rx="1" />
          <rect x="8" y="3" width="3" height="8" rx="1" />
          <rect x="12" y="1" width="3" height="10" rx="1" />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" className="opacity-90" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M1 4.5C1 2.57 2.57 1 4.5 1h6C12.43 1 14 2.57 14 4.5v2C14 8.43 12.43 10 10.5 10h-6C2.57 10 1 8.43 1 6.5v-2Z" />
          <rect x="12" y="3" width="2.5" height="5" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </div>
    </div>
  );
}

function HomeIndicator({ theme }: { theme: "light" | "dark" }) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center pt-0.5">
      <div
        className="h-1 w-[134px] rounded-full"
        style={{
          background:
            theme === "dark"
              ? "color-mix(in oklch, var(--fc-fg) 35%, transparent)"
              : "color-mix(in oklch, var(--fc-fg) 20%, transparent)",
        }}
      />
    </div>
  );
}

const DRAG_THRESHOLD = 5;
const FULL_COVERAGE_RATIO = 0.92;
const REFINE_PANEL_W = 360;
const REFINE_PANEL_H = 260;

function clampFixedPanelPosition(left: number, top: number, panelW: number, panelH: number) {
  if (typeof window === "undefined") return { left, top };
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(panelW, vw - pad * 2);
  const h = Math.min(panelH, vh - pad * 2);
  let l = Math.max(pad, left);
  let t = Math.max(pad, top);
  if (l + w > vw - pad) l = Math.max(pad, vw - w - pad);
  if (t + h > vh - pad) t = Math.max(pad, vh - h - pad);
  return { left: l, top: t };
}

function summarizeHits(hits: ForgeTaggedHit[]): string {
  if (hits.length === 0) return "No tagged elements in this region.";
  const parts = hits.map((h) => {
    if (h.forgeNodeId) return h.forgeNodeId;
    if (h.forgeRegionId) return `region:${h.forgeRegionId}`;
    return h.tagName;
  });
  return `${hits.length} part(s): ${parts.join(", ")}`;
}

type MobileRefineState = {
  screenTitle: string;
  left: number;
  top: number;
  hits: ForgeTaggedHit[];
  fullScreen: boolean;
};

type MobilePreviewProps = {
  html: string;
  screenTitle: string;
  styleVars: React.CSSProperties;
  contentHeight: number;
  corner: number;
  marqueeMode: boolean;
  /** When true, canvas zoom is at least 75% — element pick, hover, and FAB are active */
  interactionZoomOk: boolean;
  commitPreviewHtml: (nextHtml: string) => void;
  selectedNodeIds: string[];
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  onRefineOpen: (s: MobileRefineState | null) => void;
};

function MobileScreenPreview({
  html,
  screenTitle,
  styleVars,
  contentHeight,
  corner,
  marqueeMode,
  interactionZoomOk,
  commitPreviewHtml,
  selectedNodeIds,
  setSelectedNodeIds,
  onRefineOpen,
}: MobilePreviewProps) {
  const htmlHostRef = React.useRef<HTMLDivElement>(null);
  const scrollRootRef = React.useRef<HTMLDivElement>(null);
  const layerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const rafHoverRef = React.useRef<number | null>(null);
  const [dragBox, setDragBox] = React.useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );
  const [hoverNodeId, setHoverNodeId] = React.useState<string | null>(null);
  const [fabPos, setFabPos] = React.useState<{ left: number; top: number } | null>(null);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const allow = marqueeMode || e.metaKey || e.ctrlKey;
      if (!allow) return;
      e.preventDefault();
      e.stopPropagation();
      const d = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
      dragRef.current = d;
      setDragBox(d);
      try {
        layerRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    },
    [marqueeMode],
  );

  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    e.stopPropagation();
    const next = { ...d, x1: e.clientX, y1: e.clientY };
    dragRef.current = next;
    setDragBox(next);
  }, []);

  const endMarquee = React.useCallback(
    (e: React.PointerEvent | null) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (layerRef.current && e.pointerId != null) layerRef.current.releasePointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      }
      const drag = dragRef.current;
      dragRef.current = null;
      setDragBox(null);
      if (!drag) return;
      const dx = Math.abs(drag.x1 - drag.x0);
      const dy = Math.abs(drag.y1 - drag.y0);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) {
        onRefineOpen(null);
        return;
      }
      const root = htmlHostRef.current?.querySelector<HTMLElement>(".forge-mobile-html");
      if (!root) return;
      setSelectedNodeIds([]);
      const cov = marqueeCoverageRatio(root, drag);
      const fullScreen = cov >= FULL_COVERAGE_RATIO;
      const hits = collectForgeHits(root, drag);
      const rect = {
        left: Math.min(drag.x0, drag.x1),
        top: Math.min(drag.y0, drag.y1),
        width: dx,
        height: dy,
      };
      onRefineOpen({
        screenTitle,
        left: rect.left,
        top: rect.top + rect.height + 8,
        hits,
        fullScreen,
      });
    },
    [onRefineOpen, screenTitle, setSelectedNodeIds],
  );

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      endMarquee(e);
    },
    [endMarquee],
  );

  const onPointerCancel = React.useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    setDragBox(null);
    try {
      if (layerRef.current && e.pointerId != null) layerRef.current.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const box = dragBox
    ? {
        left: Math.min(dragBox.x0, dragBox.x1),
        top: Math.min(dragBox.y0, dragBox.y1),
        width: Math.abs(dragBox.x1 - dragBox.x0),
        height: Math.abs(dragBox.y1 - dragBox.y0),
      }
    : null;

  React.useLayoutEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-forge-canvas-selected]").forEach((n) => n.removeAttribute("data-forge-canvas-selected"));
    root.querySelectorAll<HTMLElement>("[data-forge-canvas-hover]").forEach((n) => n.removeAttribute("data-forge-canvas-hover"));
    for (const id of selectedNodeIds) {
      root.querySelector<HTMLElement>(`[data-forge-node-id="${CSS.escape(id)}"]`)?.setAttribute("data-forge-canvas-selected", "1");
    }
    if (hoverNodeId && !selectedNodeIds.includes(hoverNodeId)) {
      root.querySelector<HTMLElement>(`[data-forge-node-id="${CSS.escape(hoverNodeId)}"]`)?.setAttribute("data-forge-canvas-hover", "1");
    }
  }, [html, hoverNodeId, selectedNodeIds]);

  React.useLayoutEffect(() => {
    const root = scrollRootRef.current;
    if (!root || !interactionZoomOk || selectedNodeIds.length === 0 || marqueeMode) {
      setFabPos(null);
      return;
    }
    const first = root.querySelector<HTMLElement>(`[data-forge-node-id="${CSS.escape(selectedNodeIds[0]!)}"]`);
    if (!first) {
      setFabPos(null);
      return;
    }
    const r = first.getBoundingClientRect();
    setFabPos({ left: Math.min(r.right + 6, window.innerWidth - 220), top: Math.max(8, r.top) });
  }, [html, interactionZoomOk, marqueeMode, selectedNodeIds]);

  React.useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      if (marqueeMode || e.metaKey || e.ctrlKey) return;
      if (e.button !== 0) return;
      const t = e.target;
      if (!(t instanceof HTMLElement) || !root.contains(t)) return;
      const el = t.closest<HTMLElement>("[data-forge-node-id]");
      if (el && root.contains(el)) {
        const nid = el.getAttribute("data-forge-node-id");
        if (!nid) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
          setSelectedNodeIds((prev) => (prev.includes(nid) ? prev.filter((x) => x !== nid) : [...prev, nid]));
        } else {
          setSelectedNodeIds([nid]);
        }
        return;
      }
      setSelectedNodeIds([]);
    };

    const flushHover = (e: PointerEvent) => {
      if (marqueeMode || dragRef.current) return;
      if (rafHoverRef.current != null) cancelAnimationFrame(rafHoverRef.current);
      rafHoverRef.current = requestAnimationFrame(() => {
        rafHoverRef.current = null;
        const el = pickTargetEl(root, e.clientX, e.clientY);
        setHoverNodeId(el?.getAttribute("data-forge-node-id") ?? null);
      });
    };

    const onLeave = () => setHoverNodeId(null);

    root.addEventListener("pointerdown", onPointerDownCapture, true);
    root.addEventListener("pointermove", flushHover, true);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointerdown", onPointerDownCapture, true);
      root.removeEventListener("pointermove", flushHover, true);
      root.removeEventListener("pointerleave", onLeave);
      if (rafHoverRef.current != null) cancelAnimationFrame(rafHoverRef.current);
    };
  }, [html, interactionZoomOk, marqueeMode, setSelectedNodeIds]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp") return;
      if (!interactionZoomOk) return;
      if (isKeyEventFromEditableTarget(e.target)) return;
      if (selectedNodeIds.length !== 1) return;
      const root = scrollRootRef.current;
      if (!root) return;
      const id = selectedNodeIds[0];
      if (!id) return;
      e.preventDefault();
      const el = root.querySelector<HTMLElement>(`[data-forge-node-id="${CSS.escape(id)}"]`);
      const parent = el?.parentElement?.closest<HTMLElement>("[data-forge-node-id]");
      const pid = parent?.getAttribute("data-forge-node-id");
      if (pid) setSelectedNodeIds([pid]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interactionZoomOk, selectedNodeIds, setSelectedNodeIds]);

  const openRefineForSelection = React.useCallback(() => {
    if (!interactionZoomOk) return;
    const root = scrollRootRef.current;
    if (!root || selectedNodeIds.length === 0) return;
    const hits = hitsFromNodeIds(root, selectedNodeIds);
    if (hits.length === 0) return;
    const first = root.querySelector<HTMLElement>(`[data-forge-node-id="${CSS.escape(selectedNodeIds[0]!)}"]`);
    const r = first?.getBoundingClientRect();
    const left = r ? r.left : 16;
    const top = r ? r.bottom + 8 : 16;
    onRefineOpen({
      screenTitle,
      left,
      top,
      hits,
      fullScreen: false,
    });
  }, [interactionZoomOk, onRefineOpen, screenTitle, selectedNodeIds]);

  const onDuplicateSelection = React.useCallback(() => {
    if (!interactionZoomOk || selectedNodeIds.length === 0) return;
    const next = duplicateForgeNodesInHtml(html, selectedNodeIds);
    commitPreviewHtml(next);
    setSelectedNodeIds([]);
    toast.success("Duplicated on canvas", {
      description: "Preview-only until orchestration syncs this screen (P-05).",
    });
  }, [commitPreviewHtml, html, interactionZoomOk, selectedNodeIds, setSelectedNodeIds]);

  const onDeleteSelection = React.useCallback(() => {
    if (!interactionZoomOk || selectedNodeIds.length === 0) return;
    const next = removeForgeNodesFromHtml(html, selectedNodeIds);
    commitPreviewHtml(next);
    setSelectedNodeIds([]);
    toast.success("Removed from preview", {
      description: "Preview-only; undo not wired yet.",
    });
  }, [commitPreviewHtml, html, interactionZoomOk, selectedNodeIds, setSelectedNodeIds]);

  return (
    <div ref={htmlHostRef} className="relative h-full w-full min-h-0">
      <style>{`
        .forge-mobile-html [data-forge-node-id] { cursor: pointer; }
        .forge-mobile-html.forge-mobile-pick-cooldown [data-forge-node-id] { cursor: default; }
        .forge-mobile-html [data-forge-canvas-selected="1"] {
          outline: 2px solid var(--brand-violet);
          outline-offset: 2px;
          border-radius: 8px;
          background: color-mix(in oklch, var(--brand-violet) 8%, transparent);
        }
        .forge-mobile-html [data-forge-canvas-hover="1"] {
          outline: 1.5px dashed color-mix(in oklch, var(--brand-coral) 75%, transparent);
          outline-offset: 2px;
          border-radius: 6px;
        }
      `}</style>
      <div
        ref={scrollRootRef}
        className="forge-mobile-html h-full w-full min-h-0 overflow-auto"
        style={{ borderRadius: Math.min(8, corner), ...styleVars, height: contentHeight }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div
        ref={layerRef}
        className={cn(
          "absolute inset-0 z-10",
          marqueeMode || dragBox ? "touch-none" : "pointer-events-none",
        )}
        style={{ cursor: marqueeMode || dragBox ? "crosshair" : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        title={marqueeMode ? "Drag to select a region" : "Hold ⌘ or Ctrl and drag to marquee"}
      />
      {box && box.width >= 1 && box.height >= 1
        ? createPortal(
            <div
              className="pointer-events-none fixed z-9999 rounded-md border-2 border-accent bg-accent/10 shadow-[0_0_0_4px_color-mix(in_oklch,var(--brand-violet)_8%,transparent)]"
              style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
              }}
            />,
            document.body,
          )
        : null}
      {fabPos && interactionZoomOk && selectedNodeIds.length > 0 && !marqueeMode
        ? createPortal(
            <div
              className="fixed z-9998 flex max-w-[min(92vw,280px)] flex-wrap items-center gap-1 rounded-lg border border-border bg-surface px-1 py-0.5 shadow-lg"
              style={{ left: fabPos.left, top: fabPos.top }}
            >
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  openRefineForSelection();
                }}
              >
                <Pencil className="size-3" aria-hidden />
                Refine
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateSelection();
                }}
              >
                <Copy className="size-3" aria-hidden />
                Duplicate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 gap-1 px-2 text-[11px] text-danger hover:text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSelection();
                }}
              >
                <Trash2 className="size-3" aria-hidden />
                Delete
              </Button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function getChrome(preset: MobileDevicePreset): { top: number; bottom: number } {
  if (preset.platform === "ios" && preset.hasDynamicIsland) {
    // island (32) + status row (36) — matches JSX
    return { top: 32 + 36, bottom: preset.hasHomeIndicator ? 32 : 6 };
  }
  if (preset.platform === "ios") {
    return { top: 50, bottom: preset.hasHomeIndicator ? 32 : 6 };
  }
  if (preset.platform === "android") {
    return { top: 36, bottom: 12 };
  }
  return { top: 40, bottom: 6 };
}

export function PhoneScreenNode({ data, selected }: NodeProps<Node<MobilePhoneNodeData, "phoneScreen">>) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const lastRunId = useLastOrchestrationRunId();
  const canvasZoom = useStore((s) => s.transform[2]);
  const interactionZoomOk = canvasZoom >= MIN_ELEMENT_PICK_ZOOM;
  const preset = getDevicePreset(data.deviceId);
  const accentHue = useMobileCanvasStore((s) => s.accentHue);
  const corner = useMobileCanvasStore((s) => s.cornerRadius);
  const marqueeMode = useMobileCanvasStore((s) => s.marqueeMode);
  const canvasProjectId = useMobileCanvasStore((s) => s.canvasProjectId);
  const updateScreenHtml = useMobileCanvasStore((s) => s.updateScreenHtml);
  const theme = data.theme;
  const shellBg = theme === "dark" ? FP.phoneBezelDark : FP.mobileShellLight;
  const screenBg = theme === "dark" ? FP.mobileScreenDark : FP.mobileScreenLight;
  const fg = theme === "dark" ? FP.deviceDarkFg : FP.deviceLightFg;
  const accent = `oklch(0.66 0.14 ${accentHue})`;
  const chrome = getChrome(preset);
  const contentHeight = Math.max(120, preset.height - chrome.top - chrome.bottom);

  const styleVars: React.CSSProperties = {
    ...({
      "--fc-bg": screenBg,
      "--fc-fg": fg,
      "--fc-accent": accent,
      "--fc-on-accent": FP.onAccent,
      "--fc-radius": `${corner}px`,
    } as React.CSSProperties),
  };

  const [refine, setRefine] = React.useState<MobileRefineState | null>(null);
  const [refinePrompt, setRefinePrompt] = React.useState("");
  const [refineSaving, setRefineSaving] = React.useState(false);
  const [elementSelection, setElementSelection] = React.useState<string[]>([]);

  const handleRefineOpen = React.useCallback((s: MobileRefineState | null) => {
    setRefinePrompt("");
    setRefine(s);
    if (s) setElementSelection([]);
  }, []);

  const commitPreviewHtml = React.useCallback(
    (next: string) => {
      updateScreenHtml(data.screenId, next);
    },
    [data.screenId, updateScreenHtml],
  );

  React.useEffect(() => {
    if (!interactionZoomOk) {
      queueMicrotask(() => setElementSelection([]));
    }
  }, [interactionZoomOk]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (refine) handleRefineOpen(null);
      else setElementSelection([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refine, handleRefineOpen]);

  const refinePanelPos = refine
    ? clampFixedPanelPosition(
        refine.left,
        refine.top,
        Math.min(REFINE_PANEL_W, typeof window !== "undefined" ? window.innerWidth * 0.92 : REFINE_PANEL_W),
        REFINE_PANEL_H,
      )
    : null;

  async function saveRefineNote() {
    if (!refine || !canvasProjectId || !activeOrganizationId) {
      toast.error("Open a saved canvas project before saving refinements.");
      return;
    }
    const prompt = refinePrompt.trim();
    if (!prompt && !refine.fullScreen && refine.hits.length === 0) return;
    const scope = refine.fullScreen ? "screen" : refine.hits.length ? "region" : "screen";
    const elementRef = refine.fullScreen
      ? null
      : refine.hits
          .map((h) => h.forgeNodeId || h.forgeRegionId || h.tagName)
          .filter(Boolean)
          .join(", ")
          .slice(0, 500);
    setRefineSaving(true);
    try {
      const out = await refineCanvasScreen(getToken, activeOrganizationId, canvasProjectId, data.screenId, {
        prompt: prompt || "Review this selected region.",
        scope,
        element_ref: elementRef || null,
      });
      updateScreenHtml(data.screenId, out.html);
      toast.success("Refinement note saved", {
        description: "This screen now carries the note for review or a later Studio rewrite.",
      });
      handleRefineOpen(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save refinement");
    } finally {
      setRefineSaving(false);
    }
  }

  return (
    <div className="relative w-max">
      <div className="mb-1.5 flex w-full min-w-0 max-w-[min(100%,480px)] items-center justify-between gap-2 pr-0.5">
        <p className="min-w-0 truncate font-body text-[12px] font-semibold text-text-muted">{data.title}</p>
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-surface text-text-muted shadow-sm transition-colors hover:border-border-strong hover:bg-bg-elevated"
          aria-label="Screen menu"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="relative">
        <Handle type="target" position={Position.Left} className="h-2.5! w-2.5! border-2! border-border! bg-accent!" />
        <Handle type="source" position={Position.Right} className="h-2.5! w-2.5! border-2! border-border! bg-accent!" />

        <div
          className={cn(
            "nodrag nopan overflow-hidden shadow-xl transition-[box-shadow,transform] duration-200",
            selected
              ? "ring-2 ring-accent ring-offset-2 ring-offset-bg shadow-xl"
              : "ring-1 ring-black/10",
          )}
          style={{
            width: preset.width,
            borderRadius: preset.cornerRadius,
            background: shellBg,
          }}
        >
          {preset.hasDynamicIsland ? (
            <div className="flex h-[32px] shrink-0 items-end justify-center pb-0.5">
              <div
                className="h-[28px] w-[120px] rounded-full"
                style={{ background: theme === "dark" ? FP.dynamicIslandDark : FP.dynamicIslandLight }}
              />
            </div>
          ) : null}

          {preset.hasDynamicIsland ? (
            <StatusBar theme={theme} compact />
          ) : preset.platform === "ios" ? (
            <StatusBar theme={theme} />
          ) : (
            <StatusBar theme={theme} compact />
          )}

          <div
            className="relative min-h-0 overflow-hidden"
            style={{ height: contentHeight, background: screenBg, color: fg, ...styleVars }}
          >
            <MobileScreenPreview
              html={data.html}
              screenTitle={data.title}
              styleVars={styleVars}
              contentHeight={contentHeight}
              corner={corner}
              marqueeMode={marqueeMode}
              interactionZoomOk={interactionZoomOk}
              commitPreviewHtml={commitPreviewHtml}
              selectedNodeIds={elementSelection}
              setSelectedNodeIds={setElementSelection}
              onRefineOpen={handleRefineOpen}
            />
          </div>

          {preset.hasHomeIndicator ? <HomeIndicator theme={theme} /> : null}
        </div>

        <div className="mt-1 max-w-[min(100%,480px)]">
          <ArtifactFeedbackStrip
            artifactKind="screen"
            artifactRef={`canvas-screen:${data.screenId}`}
            runId={lastRunId ?? null}
            workflow="ui"
            getToken={getToken}
            activeOrgId={activeOrganizationId}
            className="text-[11px]"
          />
        </div>
      </div>

      {refine && refinePanelPos
        ? createPortal(
            <div
              className="surface-panel fixed z-10000 w-[min(92vw,360px)] rounded-xl p-3 shadow-xl"
              style={{ left: refinePanelPos.left, top: refinePanelPos.top }}
            >
              <p className="mb-1 font-body text-[11px] font-semibold text-text">Region refine</p>
              <p className="mb-2 text-[11px] text-text-muted">
                {refine.screenTitle} · {refine.fullScreen ? "Full screen (canvas)" : summarizeHits(refine.hits)}
              </p>
              <Textarea
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder="How should this change?"
                className="min-h-[72px] text-sm"
                aria-label="Refinement instructions"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => handleRefineOpen(null)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={refineSaving}
                  disabled={refineSaving || (!refine.fullScreen && refine.hits.length === 0 && !refinePrompt.trim())}
                  onClick={() => void saveRefineNote()}
                >
                  Save note
                </Button>
              </div>
            </div>,
            document.body,
          )
        : null}

    </div>
  );
}
