"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import {
  Minus,
  Plus,
  Scan,
  Smartphone,
  Sun,
  SunMoon,
} from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MOBILE_DEVICE_PRESETS, type MobileDeviceId } from "@/lib/mobile-devices";
import { useMobileCanvasStore } from "./mobile-canvas-store";
import { cn } from "@/lib/utils";

/**
 * Top floating toolbar. Must render inside a ReactFlow tree (uses xyflow useStore / useReactFlow).
 */
export function MobileCanvasToolbar() {
  const { zoomIn, zoomOut, fitView, setViewport, getViewport } = useReactFlow();
  const z = useStore((s) => s.transform[2]);
  const zoomPct = Math.round(z * 100);
  const deviceId = useMobileCanvasStore((s) => s.deviceId);
  const setDeviceId = useMobileCanvasStore((s) => s.setDeviceId);
  const theme = useMobileCanvasStore((s) => s.theme);
  const setTheme = useMobileCanvasStore((s) => s.setTheme);
  const marqueeMode = useMobileCanvasStore((s) => s.marqueeMode);
  const setMarqueeMode = useMobileCanvasStore((s) => s.setMarqueeMode);
  const addScreen = useMobileCanvasStore((s) => s.addScreen);
  const [editingZoom, setEditingZoom] = React.useState(false);
  const [zoomDraft, setZoomDraft] = React.useState(() => String(Math.round(z * 100)));
  const zoomFieldValue = editingZoom ? zoomDraft : String(zoomPct);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/95 p-1.5 pl-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/80",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Smartphone className="size-3.5 text-text-muted" aria-hidden />
        <Select value={deviceId} onValueChange={(v) => setDeviceId(v as MobileDeviceId)}>
          <SelectTrigger className="h-8 w-[180px] font-body text-xs" aria-label="Device preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOBILE_DEVICE_PRESETS.map((d) => (
              <SelectItem key={d.id} value={d.id} className="text-xs">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="h-5 w-px bg-border" />

      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 gap-1.5 font-body text-xs"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        title="Toggle light / dark preview"
      >
        {theme === "light" ? <Sun className="size-3.5" /> : <SunMoon className="size-3.5" />}
        {theme === "light" ? "Light" : "Dark"}
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

      <Button type="button" size="sm" className="h-8 font-body text-xs" onClick={addScreen}>
        Add screen
      </Button>
    </div>
  );
}
