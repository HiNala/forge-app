"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { Minus, Plus, Scan, LayoutGrid, Menu, Sun, SunMoon, Trash2, Download, GitBranch, LayoutTemplate, AlertTriangle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { orphanPageIds } from "@/lib/web-canvas-nav-graph";
import { buildMultiPageStaticZip, buildSingleFileStaticSite } from "@/lib/web-canvas-static-export";
import { forgeFallbackHex as H } from "@/lib/design/forge-html-fallback-colors";
import { useWebCanvasStore, type SiteNavLink } from "./web-canvas-store";
import type { WebCanvasFocusBreakpoint } from "./types";
import { cn } from "@/lib/utils";

const FOCUS_TABS: { id: WebCanvasFocusBreakpoint; label: string }[] = [
  { id: "all", label: "All" },
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

function newNavId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `nav-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `nav-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Web canvas toolbar. Must render inside a ReactFlow tree.
 */
export function WebCanvasToolbar() {
  const { zoomIn, zoomOut, fitView, setViewport, getViewport } = useReactFlow();
  const pages = useWebCanvasStore((s) => s.pages);
  const edges = useWebCanvasStore((s) => s.edges);
  const homePageId = useWebCanvasStore((s) => s.homePageId);
  const accentHue = useWebCanvasStore((s) => s.accentHue);
  const arrangePagesInGrid = useWebCanvasStore((s) => s.arrangePagesInGrid);
  const syncFlowEdgesFromNavLinks = useWebCanvasStore((s) => s.syncFlowEdgesFromNavLinks);
  const z = useStore((s) => s.transform[2]);
  const zoomPct = Math.round(z * 100);
  const setTheme = useWebCanvasStore((s) => s.setTheme);
  const theme = useWebCanvasStore((s) => s.theme);
  const marqueeMode = useWebCanvasStore((s) => s.marqueeMode);
  const setMarqueeMode = useWebCanvasStore((s) => s.setMarqueeMode);
  const addPage = useWebCanvasStore((s) => s.addPage);
  const focusBreakpoint = useWebCanvasStore((s) => s.focusBreakpoint);
  const setFocusBreakpoint = useWebCanvasStore((s) => s.setFocusBreakpoint);
  const siteNavEditorOpen = useWebCanvasStore((s) => s.siteNavEditorOpen);
  const setSiteNavEditorOpen = useWebCanvasStore((s) => s.setSiteNavEditorOpen);
  const siteNavLinks = useWebCanvasStore((s) => s.siteNavLinks);
  const setSiteNavLinks = useWebCanvasStore((s) => s.setSiteNavLinks);
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomDraft, setZoomDraft] = React.useState(() => String(Math.round(z * 100)));
  const zoomFieldValue = editingZoom ? zoomDraft : String(zoomPct);
  const [navDraft, setNavDraft] = React.useState<SiteNavLink[]>(() =>
    siteNavLinks.map((l) => ({ ...l })),
  );

  function openSiteNavEditor() {
    setNavDraft(siteNavLinks.map((l) => ({ ...l })));
    setSiteNavEditorOpen(true);
  }

  function updateNavRow(id: string, patch: Partial<Pick<SiteNavLink, "label" | "href">>) {
    setNavDraft((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeNavRow(id: string) {
    setNavDraft((rows) => rows.filter((r) => r.id !== id));
  }

  function addNavRow() {
    setNavDraft((rows) => [...rows, { id: newNavId(), label: "New", href: "/new" }]);
  }

  const orphanIds =
    pages.length > 1 ? orphanPageIds(pages.map((p) => p.id), homePageId, edges) : [];

  function exportTheme() {
    const accent = `oklch(0.66 0.14 ${accentHue})`;
    if (theme === "dark") {
      return { accent, bg: H.deviceDarkChromeBg, fg: H.deviceDarkFg };
    }
    return { accent, bg: H.deviceLightChromeBg, fg: H.deviceLightFg };
  }

  function downloadStaticHtml() {
    const doc = buildSingleFileStaticSite(
      pages.map((p) => ({ path: p.path, title: p.title, html: p.html })),
      "GlideDesign site preview",
      exportTheme(),
    );
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "glidedesign-site-preview.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded static preview");
  }

  function downloadMultiPageZip() {
    try {
      const zipped = buildMultiPageStaticZip(
        pages.map((p) => ({ path: p.path, title: p.title, html: p.html })),
        "GlideDesign site preview",
        exportTheme(),
      );
      const bytes = new Uint8Array(zipped.length);
      bytes.set(zipped);
      const blob = new Blob([bytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "glidedesign-site-pages.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded ZIP — unzip and open index.html");
    } catch {
      toast.error("Could not build ZIP export.");
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex max-w-[95vw] flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/95 p-1.5 pl-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/80",
        )}
      >
        <div className="flex items-center gap-0.5">
          <LayoutGrid className="size-3.5 text-text-muted" aria-hidden />
          {FOCUS_TABS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={focusBreakpoint === t.id ? "primary" : "secondary"}
              className="h-8 min-w-0 px-2 font-body text-[10px] sm:text-xs"
              onClick={() => setFocusBreakpoint(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 font-body text-xs"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title="Light / dark preview"
        >
          {theme === "light" ? <Sun className="size-3.5" /> : <SunMoon className="size-3.5" />}
        </Button>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 min-w-8 px-0"
            onClick={() => zoomOut()}
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </Button>
          {editingZoom ? (
            <Input
              className="h-8 w-14 px-1 text-center font-body text-xs"
              value={zoomFieldValue}
              onChange={(e) => setZoomDraft(e.target.value.replace(/[^\d.]/g, ""))}
              onBlur={() => {
                setEditingZoom(false);
                const n = Number.parseFloat(zoomFieldValue);
                if (Number.isFinite(n)) {
                  const next = Math.min(400, Math.max(25, n)) / 100;
                  const v = getViewport();
                  setViewport({ x: v.x, y: v.y, zoom: next });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingZoom(false);
              }}
              autoFocus
              aria-label="Zoom percent"
            />
          ) : (
            <button
              type="button"
              className="w-12 rounded-md py-1 font-body text-xs tabular-nums text-text hover:bg-bg-elevated"
              onClick={() => {
                setZoomDraft(String(zoomPct));
                setEditingZoom(true);
              }}
              title="Click to type zoom"
            >
              {zoomPct}%
            </button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 min-w-8 px-0"
            onClick={() => zoomIn()}
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 font-body text-xs"
          onClick={() => void fitView({ padding: 0.2, minZoom: 0.25, maxZoom: 4, duration: 200 })}
        >
          Fit
        </Button>

        <div className="h-5 w-px bg-border" />

        <Button
          type="button"
          variant={marqueeMode ? "primary" : "secondary"}
          size="sm"
          className="h-8 gap-1.5 font-body text-xs"
          onClick={() => setMarqueeMode(!marqueeMode)}
          title="Marquee (M) — or ⌘/Ctrl-drag on a preview row"
        >
          <Scan className="size-3.5" />
          Marquee
        </Button>

        <Button type="button" size="sm" className="h-8 font-body text-xs" onClick={addPage}>
          Add page
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 font-body text-xs"
          onClick={openSiteNavEditor}
        >
          <Menu className="size-3.5" />
          Site nav
        </Button>

        <div className="h-5 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="secondary" size="sm" className="h-8 gap-1.5 font-body text-xs">
              <Download className="size-3.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="font-body">
            <DropdownMenuItem className="cursor-pointer" onSelect={() => downloadStaticHtml()}>
              Static site (single HTML file)
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={() => downloadMultiPageZip()}>
              Multi-page HTML (ZIP)
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-text-muted">
              Next.js zip (API pipeline)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 font-body text-xs"
          title="Snap page nodes to a 3-column grid"
          onClick={() => {
            arrangePagesInGrid();
            void fitView({ padding: 0.2, minZoom: 0.25, maxZoom: 4, duration: 200 });
          }}
        >
          <LayoutTemplate className="size-3.5" />
          Grid
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 font-body text-xs"
          title="Create flow edges from internal links in page HTML"
          onClick={() => {
            syncFlowEdgesFromNavLinks();
            toast.success("Flow synced from nav links");
          }}
        >
          <GitBranch className="size-3.5" />
          Sync links
        </Button>

        {orphanIds.length > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 font-body text-[10px] font-medium text-warning">
                <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
                {orphanIds.length} orphan{orphanIds.length > 1 ? "s" : ""}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs font-body text-xs">
              No incoming link from other pages (homepage excluded). Use Sync links or draw edges.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <Dialog open={siteNavEditorOpen} onOpenChange={setSiteNavEditorOpen}>
        <DialogContent className="font-body sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Site navigation</DialogTitle>
            <DialogDescription>
              Labels and paths update the shared header on every page in this canvas preview.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,360px)] space-y-3 overflow-y-auto py-1">
            {navDraft.map((row, i) => (
              <div key={row.id} className="flex flex-wrap items-end gap-2 border-b border-border/60 pb-3 last:border-b-0">
                <div className="min-w-[100px] flex-1 space-y-1">
                  <Label className="text-[11px] text-text-muted">Label</Label>
                  <Input
                    value={row.label}
                    onChange={(e) => updateNavRow(row.id, { label: e.target.value })}
                    aria-label={`Nav label ${i + 1}`}
                  />
                </div>
                <div className="min-w-[120px] flex-1 space-y-1">
                  <Label className="text-[11px] text-text-muted">Path</Label>
                  <Input
                    value={row.href}
                    onChange={(e) => updateNavRow(row.id, { href: e.target.value })}
                    aria-label={`Nav path ${i + 1}`}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-danger hover:text-danger"
                  onClick={() => removeNavRow(row.id)}
                  disabled={navDraft.length <= 1}
                  aria-label={`Remove ${row.label}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" className="w-full font-body" onClick={addNavRow}>
              Add link
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setSiteNavEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const cleaned = navDraft
                  .map((l) => ({
                    ...l,
                    label: l.label.trim() || "Untitled",
                    href: l.href.trim().startsWith("/") ? l.href.trim() : `/${l.href.trim()}`,
                  }))
                  .filter((l) => l.href.length > 0);
                if (cleaned.length === 0) return;
                setSiteNavLinks(cleaned);
                setSiteNavEditorOpen(false);
              }}
            >
              Apply to all pages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
