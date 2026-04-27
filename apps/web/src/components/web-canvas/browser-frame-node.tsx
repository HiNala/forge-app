"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
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
import { collectForgeHits, marqueeCoverageRatio, type ForgeTaggedHit } from "@/lib/web-marquee-hit";
import { normalizeWebPath } from "@/lib/web-canvas-nav-graph";
import { useWebCanvasStore } from "./web-canvas-store";
import type { WebBrowserNodeData, WebCanvasFocusBreakpoint } from "./types";
import { cn } from "@/lib/utils";
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
import { toast } from "sonner";

function rowEmphasis(
  focus: WebCanvasFocusBreakpoint,
  id: WebBreakpointId,
): { dim: boolean; strong: boolean } {
  if (focus === "all") return { dim: false, strong: false };
  return { dim: focus !== id, strong: focus === id };
}

function MacChrome({ url, theme }: { url: string; theme: "light" | "dark" }) {
  const bar = theme === "dark" ? "bg-[#2d2d30]" : "bg-[#e8e8e6]";
  const border = theme === "dark" ? "border-white/10" : "border-black/8";
  const text = theme === "dark" ? "text-white/50" : "text-black/45";
  return (
    <div
      className={cn("flex h-8 w-full max-w-full shrink-0 items-center gap-2 border-b px-2", bar, border)}
    >
      <div className="flex gap-1 pl-0.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
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
}: WebPreviewRowProps) {
  const marqueeMode = useWebCanvasStore((s) => s.marqueeMode);
  const htmlHostRef = React.useRef<HTMLDivElement>(null);
  const layerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [dragBox, setDragBox] = React.useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  );

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
    [bp.label, onRefineOpen],
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
    const root = htmlHostRef.current?.querySelector<HTMLElement>(".forge-web-html");
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
                  className="forge-web-html h-full w-full min-h-0 overflow-auto"
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
                        className="pointer-events-none fixed z-[9999] rounded-md border-2 border-accent bg-accent/10"
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
  const accentHue = useWebCanvasStore((s) => s.accentHue);
  const corner = useWebCanvasStore((s) => s.cornerRadius);
  const focusBreakpoint = useWebCanvasStore((s) => s.focusBreakpoint);
  const fontPairId = useWebCanvasStore((s) => s.fontPairId);
  const renamePage = useWebCanvasStore((s) => s.renamePage);
  const duplicatePage = useWebCanvasStore((s) => s.duplicatePage);
  const deletePage = useWebCanvasStore((s) => s.deletePage);
  const setHomePageId = useWebCanvasStore((s) => s.setHomePageId);
  const updatePagePath = useWebCanvasStore((s) => s.updatePagePath);
  const pages = useWebCanvasStore((s) => s.pages);
  const theme = data.theme;
  const bg = theme === "dark" ? "#0f1419" : "#ffffff";
  const fg = theme === "dark" ? "#e6edf3" : "#0f172a";
  const elevated = theme === "dark" ? "#1a222c" : "#f4f4f5";
  const accent = `hsl(${accentHue} 78% 48%)`;
  const fonts = getWebFontStacks(fontPairId);

  const [refine, setRefine] = React.useState<RefineState | null>(null);
  const [refinePrompt, setRefinePrompt] = React.useState("");
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState(data.title);
  const [pathOpen, setPathOpen] = React.useState(false);
  const [pathDraft, setPathDraft] = React.useState(data.path);

  const handleRefineOpen = React.useCallback((s: RefineState | null) => {
    setRefinePrompt("");
    setRefine(s);
  }, []);

  React.useEffect(() => {
    if (!refine) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleRefineOpen(null);
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
                className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-bg-elevated"
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
        className="!h-2.5 !w-2.5 !border-2 !border-border !bg-accent"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-border !bg-accent"
      />

      <div
        className={cn(
          "w-full max-w-full overflow-hidden rounded-lg shadow-xl",
          selected ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : "ring-1 ring-border",
        )}
      >
        <style>{`
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
              rgba(14, 165, 233, 0.07) 6px,
              rgba(14, 165, 233, 0.07) 12px
            );
          }
          .forge-web-html:hover .forge-shared-region::after { opacity: 1; }
        `}</style>
        {WEB_BREAKPOINTS.map((bp) => {
          const displayUrl = `https://preview.local${data.path || "/"}`;
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
            />
          );
        })}
      </div>

      {refine && refinePanelPos
        ? createPortal(
            <div
              className="fixed z-[10000] w-[min(92vw,360px)] rounded-xl border border-border bg-surface p-3 shadow-2xl"
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
                  disabled={!refine.fullScreen && refine.hits.length === 0 && !refinePrompt.trim()}
                  onClick={() => {
                    const scope = refine.fullScreen
                      ? "full screen"
                      : refine.hits.length
                        ? summarizeHits(refine.hits)
                        : "empty selection";
                    toast.success("Refine recorded", {
                      description: `${scope} — “${refinePrompt.trim() || "(no note)"}”. Orchestration will apply this in P-05.`,
                    });
                    handleRefineOpen(null);
                  }}
                >
                  Send to Forge
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
