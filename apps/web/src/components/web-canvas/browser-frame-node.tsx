"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { Handle, Position, useStore, type Node, type NodeProps } from "@xyflow/react";
import { MoreHorizontal, Pencil, Copy, Trash2, Home, Link2 } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import {
  WEB_BREAKPOINTS,
  WEB_CANVAS_ROW_DISPLAY_WIDTH,
  scaleForCanvasRow,
  type WebBreakpointId,
  type WebBreakpointSpec,
} from "@/lib/web-canvas-viewports";
import { getWebFontStacks } from "@/lib/web-canvas-fonts";
import { hitsFromNodeIds, MIN_ELEMENT_PICK_ZOOM, pickTargetEl } from "@/lib/forge-preview-hit";
import { duplicateForgeNodesInHtml, removeForgeNodesFromHtml } from "@/lib/mobile-screen-html-mutate";
import { collectForgeHits, marqueeCoverageRatio, type ForgeTaggedHit } from "@/lib/web-marquee-hit";
import { normalizeWebPath } from "@/lib/web-canvas-nav-graph";
import { useLastOrchestrationRunId } from "@/hooks/use-last-orchestration-run";
import { useForgeSession } from "@/providers/session-provider";
import { useWebCanvasStore } from "./web-canvas-store";
import type { WebBrowserNodeData, WebCanvasFocusBreakpoint } from "./types";
import { cn } from "@/lib/utils";
import { forgeFallbackHex as FP } from "@/lib/design/forge-html-fallback-colors";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArtifactFeedbackStrip } from "@/components/feedback/artifact-feedback-strip";
import { toast } from "sonner";
import { refineCanvasScreen } from "@/lib/canvas-api";

function isKeyEventFromEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/** True when activating this link should run internal nav (do not hijack for element pick). */
function isCrossPageInternalLink(target: HTMLElement, pagePath: string): boolean {
  const a = target.closest("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return false;
  const href = a.getAttribute("href")?.trim() ?? "";
  if (!href || href.startsWith("#")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return false;
  const pathOnly = href.split(/[?#]/)[0] ?? href;
  const norm = normalizeWebPath(pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
  const selfPath = normalizeWebPath(pagePath);
  return norm !== selfPath;
}

function rowEmphasis(
  focus: WebCanvasFocusBreakpoint,
  id: WebBreakpointId,
): { dim: boolean; strong: boolean } {
  if (focus === "all") return { dim: false, strong: false };
  return { dim: focus !== id, strong: focus === id };
}

function MacChrome({ url, theme }: { url: string; theme: "light" | "dark" }) {
  const bar = theme === "dark" ? "bg-surface-dark" : "bg-bg-elevated";
  const border = theme === "dark" ? "border-white/10" : "border-border";
  const text = theme === "dark" ? "text-white/50" : "text-black/45";
  return (
    <div
      className={cn("flex h-8 w-full max-w-full shrink-0 items-center gap-2 border-b px-2", bar, border)}
    >
      <div className="flex gap-1 pl-0.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-danger/70" />
        <span className="size-2.5 rounded-full bg-warning/80" />
        <span className="size-2.5 rounded-full bg-success/75" />
      </div>
      <div
        className={cn(
          "min-w-0 flex-1 truncate rounded px-2 py-0.5 font-mono text-[11px] tabular-nums",
          theme === "dark" ? "bg-black/30 text-white/80" : "bg-white text-black/80",
        )}
      >
        {url}
      </div>
      <span className={cn("shrink-0 pr-0.5 text-[10px]", text)}>Preview</span>
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

type RefineState = {
  bpLabel: string;
  left: number;
  top: number;
  hits: ForgeTaggedHit[];
  fullScreen: boolean;
};

type WebPreviewRowProps = {
  bp: WebBreakpointSpec;
  displayUrl: string;
  /** Logical site path for this preview (e.g. `/pricing`) — used for internal nav focus. */
  pagePath: string;
  theme: "light" | "dark";
  html: string;
  styleVars: React.CSSProperties;
  focusBreakpoint: WebCanvasFocusBreakpoint;
  /** Called when a marquee gesture completes or is cancelled */
  onRefineOpen: (s: RefineState | null) => void;
  interactionZoomOk: boolean;
  selectedNodeIds: string[];
  setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
  commitPreviewHtml: (nextHtml: string) => void;
  /** Only this row shows the element FAB when all breakpoints are visible */
  isPrimarySelectionRow: boolean;
};

function WebPreviewRow({
  bp,
  displayUrl,
  pagePath,
  theme,
  html,
  styleVars,
  focusBreakpoint,
  onRefineOpen,
  interactionZoomOk,
  selectedNodeIds,
  setSelectedNodeIds,
  commitPreviewHtml,
  isPrimarySelectionRow,
}: WebPreviewRowProps) {
  const marqueeMode = useWebCanvasStore((s) => s.marqueeMode);
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
      const root = htmlHostRef.current?.querySelector<HTMLElement>(".forge-web-html");
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
        bpLabel: bp.label,
        left: rect.left,
        top: rect.top + rect.height + 8,
        hits,
        fullScreen,
      });
    },
    [bp.label, onRefineOpen, setSelectedNodeIds],
  );

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      endMarquee(e);
    },
    [endMarquee],
  );

  const onPointerCancel = React.useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = null;
      setDragBox(null);
      try {
        if (layerRef.current && e.pointerId != null) layerRef.current.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
    },
    [],
  );

  React.useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      if (marqueeMode) return;
      const t = e.target as HTMLElement | null;
      const a = t?.closest("a[href]");
      if (!a) return;
      const href = a.getAttribute("href")?.trim() ?? "";
      if (!href || href.startsWith("#")) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return;
      const pathOnly = href.split(/[?#]/)[0] ?? href;
      const norm = normalizeWebPath(pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
      const selfPath = normalizeWebPath(pagePath);
      if (norm === selfPath) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      useWebCanvasStore.getState().requestFocusPageByPath(href);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [html, marqueeMode, pagePath]);

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
    if (!root || !interactionZoomOk || !isPrimarySelectionRow || selectedNodeIds.length === 0 || marqueeMode) {
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
  }, [html, interactionZoomOk, isPrimarySelectionRow, marqueeMode, selectedNodeIds]);

  React.useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      if (marqueeMode || e.metaKey || e.ctrlKey) return;
      if (e.button !== 0) return;
      const t = e.target;
      if (!(t instanceof HTMLElement) || !root.contains(t)) return;
      if (interactionZoomOk && isCrossPageInternalLink(t, pagePath)) return;
      const el = t.closest<HTMLElement>("[data-forge-node-id]");
      if (el && root.contains(el)) {
        if (!interactionZoomOk) return;
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
      if (interactionZoomOk) setSelectedNodeIds([]);
    };

    const flushHover = (e: PointerEvent) => {
      if (!interactionZoomOk) {
        setHoverNodeId(null);
        return;
      }
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
  }, [html, interactionZoomOk, marqueeMode, pagePath, setSelectedNodeIds]);

  React.useEffect(() => {
    if (!isPrimarySelectionRow) return;
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
  }, [interactionZoomOk, isPrimarySelectionRow, selectedNodeIds, setSelectedNodeIds]);

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
      bpLabel: bp.label,
      left,
      top,
      hits,
      fullScreen: false,
    });
  }, [bp.label, interactionZoomOk, onRefineOpen, selectedNodeIds]);

  const onDuplicateSelection = React.useCallback(() => {
    if (!interactionZoomOk || selectedNodeIds.length === 0) return;
    const next = duplicateForgeNodesInHtml(html, selectedNodeIds);
    commitPreviewHtml(next);
    setSelectedNodeIds([]);
    toast.success("Duplicated in preview", {
      description: "Run Sync links if you added internal navigation.",
    });
  }, [commitPreviewHtml, html, interactionZoomOk, selectedNodeIds, setSelectedNodeIds]);

  const onDeleteSelection = React.useCallback(() => {
    if (!interactionZoomOk || selectedNodeIds.length === 0) return;
    const next = removeForgeNodesFromHtml(html, selectedNodeIds);
    commitPreviewHtml(next);
    setSelectedNodeIds([]);
    toast.success("Removed from preview", { description: "Preview-only until orchestration syncs." });
  }, [commitPreviewHtml, html, interactionZoomOk, selectedNodeIds, setSelectedNodeIds]);

  const scale = scaleForCanvasRow(bp.width);
  const { dim, strong } = rowEmphasis(focusBreakpoint, bp.id);
  const contentH = bp.height;
  const scaledH = contentH * scale;
  const box = dragBox
    ? {
        left: Math.min(dragBox.x0, dragBox.x1),
        top: Math.min(dragBox.y0, dragBox.y1),
        width: Math.abs(dragBox.x1 - dragBox.x0),
        height: Math.abs(dragBox.y1 - dragBox.y0),
      }
    : null;

  return (
    <div
      className={cn("border-b border-border/80 last:border-b-0", dim && "opacity-45", strong && "opacity-100")}
    >
      <div
        className={cn(
          "flex items-center justify-between px-1.5 py-0.5 font-mono text-[9px]",
          theme === "dark" ? "bg-zinc-900 text-zinc-300" : "bg-zinc-100 text-zinc-600",
        )}
      >
        <span>
          {bp.label} — {bp.width}×{contentH}
        </span>
      </div>
      <div
        className={cn(
          "relative m-0.5 overflow-hidden rounded",
          strong ? "ring-2 ring-accent" : "ring-1 ring-border/60",
        )}
      >
        <div className="nodrag nopan">
          <MacChrome url={displayUrl} theme={theme} />
          <div
            className={cn("relative overflow-hidden", theme === "dark" ? "bg-zinc-950" : "bg-zinc-50")}
            style={{
              width: WEB_CANVAS_ROW_DISPLAY_WIDTH,
              height: scaledH,
            }}
          >
            <div
              className="origin-top-left will-change-transform"
              style={{
                width: bp.width,
                height: contentH,
                transform: `scale(${scale})`,
              }}
            >
              <div ref={htmlHostRef} className="relative h-full w-full min-h-0">
                <div
                  ref={scrollRootRef}
                  className={cn(
                    "forge-web-html h-full w-full min-h-0 overflow-auto",
                    !interactionZoomOk && "forge-web-pick-cooldown",
                  )}
                  style={{
                    ...styleVars,
                    width: bp.width,
                    minHeight: contentH,
                  }}
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
                        className="pointer-events-none fixed z-9999 rounded-md border-2 border-accent bg-accent/10"
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
                {fabPos && interactionZoomOk && isPrimarySelectionRow && selectedNodeIds.length > 0 && !marqueeMode
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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

export function BrowserFrameNode({ data, selected }: NodeProps<Node<WebBrowserNodeData, "browserFrame">>) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const lastRunId = useLastOrchestrationRunId();
  const canvasZoom = useStore((s) => s.transform[2]);
  const interactionZoomOk = canvasZoom >= MIN_ELEMENT_PICK_ZOOM;
  const accentHue = useWebCanvasStore((s) => s.accentHue);
  const corner = useWebCanvasStore((s) => s.cornerRadius);
  const focusBreakpoint = useWebCanvasStore((s) => s.focusBreakpoint);
  const fontPairId = useWebCanvasStore((s) => s.fontPairId);
  const canvasProjectId = useWebCanvasStore((s) => s.canvasProjectId);
  const renamePage = useWebCanvasStore((s) => s.renamePage);
  const duplicatePage = useWebCanvasStore((s) => s.duplicatePage);
  const deletePage = useWebCanvasStore((s) => s.deletePage);
  const setHomePageId = useWebCanvasStore((s) => s.setHomePageId);
  const updatePagePath = useWebCanvasStore((s) => s.updatePagePath);
  const updatePageHtml = useWebCanvasStore((s) => s.updatePageHtml);
  const pages = useWebCanvasStore((s) => s.pages);
  const theme = data.theme;
  const bg = theme === "dark" ? FP.deviceDarkChromeBg : FP.deviceLightChromeBg;
  const fg = theme === "dark" ? FP.deviceDarkFg : FP.deviceLightFg;
  const elevated = theme === "dark" ? FP.deviceDarkElevated : FP.deviceLightElevated;
  const accent = `oklch(0.66 0.14 ${accentHue})`;
  const fonts = getWebFontStacks(fontPairId);

  const [refine, setRefine] = React.useState<RefineState | null>(null);
  const [refinePrompt, setRefinePrompt] = React.useState("");
  const [refineSaving, setRefineSaving] = React.useState(false);
  const [elementSelection, setElementSelection] = React.useState<string[]>([]);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState(data.title);
  const [pathOpen, setPathOpen] = React.useState(false);
  const [pathDraft, setPathDraft] = React.useState(data.path);

  const commitPreviewHtml = React.useCallback(
    (next: string) => {
      updatePageHtml(data.pageId, next);
    },
    [data.pageId, updatePageHtml],
  );

  const handleRefineOpen = React.useCallback((s: RefineState | null) => {
    setRefinePrompt("");
    setRefine(s);
    if (s) setElementSelection([]);
  }, []);

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

  const styleVars: React.CSSProperties = {
    ...({
      "--fc-bg": bg,
      "--fc-fg": fg,
      "--fc-accent": accent,
      "--fc-on-accent": FP.onAccent,
      "--fc-bg-elevated": elevated,
      "--fc-radius": `${corner}px`,
      "--fc-font-heading": fonts.heading,
      "--fc-font-body": fonts.body,
    } as React.CSSProperties),
    background: bg,
    color: fg,
    borderRadius: Math.min(6, corner),
  };

  const canDelete = pages.length > 1;

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
      const out = await refineCanvasScreen(getToken, activeOrganizationId, canvasProjectId, data.pageId, {
        prompt: prompt || "Review this selected region.",
        scope,
        element_ref: elementRef || null,
      });
      updatePageHtml(data.pageId, out.html);
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
    <div className="relative w-max" style={{ width: 392 }}>
      <div className="mb-1.5 flex w-full min-w-0 items-center justify-between gap-2 pr-0.5">
        <div className="min-w-0">
          <p className="truncate font-body text-[12px] font-semibold text-text">{data.title}</p>
          <p className="font-mono text-[10px] text-text-muted">{data.path}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {data.isHome ? (
            <span
              className="inline-flex items-center gap-0.5 rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-body text-[9px] font-medium text-text-muted"
              title="Homepage for routing and orphan checks"
            >
              <Home className="size-3" aria-hidden />
              Home
            </span>
          ) : null}
          {data.sharedHeader ? (
            <span
              className="rounded border border-dashed border-accent/50 bg-accent/5 px-1.5 py-0.5 font-body text-[9px] font-medium text-accent"
              title="Header/footer are site-wide; edit links in Site nav"
            >
              Shared
            </span>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center rounded-lg border border-border/80 bg-surface text-text-muted shadow-sm transition-colors hover:border-border-strong hover:bg-bg-elevated"
                aria-label="Page menu"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 font-body">
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  setRenameDraft(data.title);
                  setRenameOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
                Rename…
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => duplicatePage(data.pageId)}>
                <Copy className="size-3.5" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  setPathDraft(data.path);
                  setPathOpen(true);
                }}
              >
                <Link2 className="size-3.5" />
                Change path…
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                disabled={!!data.isHome}
                onSelect={() => {
                  setHomePageId(data.pageId);
                  toast.success("Homepage updated");
                }}
              >
                <Home className="size-3.5" />
                Set as homepage
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 text-danger focus:text-danger"
                disabled={!canDelete}
                onSelect={() => {
                  if (!canDelete) return;
                  deletePage(data.pageId);
                  toast.success("Page removed from canvas");
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="h-2.5! w-2.5! border-2! border-border! bg-accent!"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! border-2! border-border! bg-accent!"
      />

      <div
        className={cn(
          "w-full max-w-full overflow-hidden rounded-lg shadow-lg transition-[box-shadow,transform] duration-200",
          selected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg shadow-xl" : "ring-1 ring-border",
        )}
      >
        <style>{`
          .forge-web-html [data-forge-node-id] { cursor: pointer; }
          .forge-web-html.forge-web-pick-cooldown [data-forge-node-id] { cursor: default; }
          .forge-web-html [data-forge-canvas-selected="1"] {
            outline: 2px solid var(--brand-violet);
            outline-offset: 2px;
            border-radius: 8px;
            background: color-mix(in oklch, var(--brand-violet) 8%, transparent);
          }
          .forge-web-html [data-forge-canvas-hover="1"] {
            outline: 1.5px dashed color-mix(in oklch, var(--brand-coral) 75%, transparent);
            outline-offset: 2px;
            border-radius: 6px;
          }
          .forge-web-html h1, .forge-web-html h2, .forge-web-html h3 {
            font-family: var(--fc-font-heading, inherit);
          }
          .forge-web-html .forge-shared-region { position: relative; }
          .forge-web-html .forge-shared-region::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            border-radius: inherit;
            opacity: 0;
            transition: opacity 0.15s ease;
            background: repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 6px,
              color-mix(in oklch, var(--fc-accent) 7%, transparent) 6px,
              color-mix(in oklch, var(--fc-accent) 7%, transparent) 12px
            );
          }
          .forge-web-html:hover .forge-shared-region::after { opacity: 1; }
        `}</style>
        {WEB_BREAKPOINTS.map((bp) => {
          const displayUrl = `https://preview.local${data.path || "/"}`;
          const { strong } = rowEmphasis(focusBreakpoint, bp.id);
          const isPrimarySelectionRow =
            focusBreakpoint === "all" ? bp.id === WEB_BREAKPOINTS[0]!.id : strong;
          return (
            <WebPreviewRow
              key={bp.id}
              bp={bp}
              displayUrl={displayUrl}
              pagePath={data.path}
              theme={theme}
              html={data.html}
              styleVars={styleVars}
              focusBreakpoint={focusBreakpoint}
              onRefineOpen={handleRefineOpen}
              interactionZoomOk={interactionZoomOk}
              selectedNodeIds={elementSelection}
              setSelectedNodeIds={setElementSelection}
              commitPreviewHtml={commitPreviewHtml}
              isPrimarySelectionRow={isPrimarySelectionRow}
            />
          );
        })}
      </div>

      <div className="mt-1 max-w-full">
        <ArtifactFeedbackStrip
          artifactKind="page"
          artifactRef={`canvas-web:${data.pageId}`}
          runId={lastRunId ?? null}
          workflow="ui"
          getToken={getToken}
          activeOrgId={activeOrganizationId}
          className="text-[11px]"
        />
      </div>

      {refine && refinePanelPos
        ? createPortal(
            <div
              className="surface-panel fixed z-10000 w-[min(92vw,360px)] rounded-xl p-3 shadow-xl"
              style={{ left: refinePanelPos.left, top: refinePanelPos.top }}
            >
              <p className="mb-1 font-body text-[11px] font-semibold text-text">Region refine</p>
              <p className="mb-2 text-[11px] text-text-muted">
                {refine.bpLabel} · {refine.fullScreen ? "Full preview (screen-level)" : summarizeHits(refine.hits)}
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

      <Dialog
        open={pathOpen}
        onOpenChange={(o) => {
          setPathOpen(o);
          if (o) setPathDraft(data.path);
        }}
      >
        <DialogContent className="font-body sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Page path</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="page-path">URL path</Label>
            <Input
              id="page-path"
              value={pathDraft}
              onChange={(e) => setPathDraft(e.target.value)}
              placeholder="/about"
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const ok = updatePagePath(data.pageId, pathDraft);
                  if (ok) {
                    setPathOpen(false);
                    toast.success("Path updated");
                  } else toast.error("Path must be unique");
                }
              }}
            />
            <p className="text-[11px] text-text-muted">Leading slash added if omitted. Must not match another page.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setPathOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const ok = updatePagePath(data.pageId, pathDraft);
                if (ok) {
                  setPathOpen(false);
                  toast.success("Path updated");
                } else toast.error("Path must be unique");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="font-body sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <Label htmlFor="rename-page">Title</Label>
            <Input
              id="rename-page"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  renamePage(data.pageId, renameDraft);
                  setRenameOpen(false);
                  toast.success("Page renamed");
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                renamePage(data.pageId, renameDraft);
                setRenameOpen(false);
                toast.success("Page renamed");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
