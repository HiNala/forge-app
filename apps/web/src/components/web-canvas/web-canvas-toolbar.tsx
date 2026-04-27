"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { Minus, Plus, Scan, LayoutGrid, Menu, Sun, SunMoon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWebCanvasStore } from "./web-canvas-store";
import type { WebCanvasFocusBreakpoint } from "./types";
import { cn } from "@/lib/utils";

const FOCUS_TABS: { id: WebCanvasFocusBreakpoint; label: string }[] = [
  { id: "all", label: "All" },
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

/**
 * Web canvas toolbar. Must render inside a ReactFlow tree.
 */
export function WebCanvasToolbar() {
  const { zoomIn, zoomOut, fitView, setViewport, getViewport } = useReactFlow();
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
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomDraft, setZoomDraft] = React.useState(() => String(Math.round(z * 100)));
  const zoomFieldValue = editingZoom ? zoomDraft : String(zoomPct);

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
          title="Marquee (M)"
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
          onClick={() => setSiteNavEditorOpen(true)}
        >
          <Menu className="size-3.5" />
          Site nav
        </Button>
      </div>

      <Dialog open={siteNavEditorOpen} onOpenChange={setSiteNavEditorOpen}>
        <DialogContent className="font-body sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Site navigation</DialogTitle>
            <DialogDescription>
              Edit the shared header links that appear on every page. Full reordering, targets, and
              breakpoint-specific items will connect here in a later release.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-text-muted">
            This modal is the dedicated surface for site-wide nav (P-03 Phase 6). For now, use the
            generated preview header on each page; orchestration will populate links from the site
            outline.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
