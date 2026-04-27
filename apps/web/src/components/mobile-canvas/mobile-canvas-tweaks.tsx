"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMobileCanvasStore } from "./mobile-canvas-store";
const FONT_PAIRS = [
  { id: "system", label: "System (SF / Roboto)" },
  { id: "inter", label: "Inter + Inter" },
  { id: "display", label: "DM Sans + Inter" },
  { id: "serif", label: "Fraunces + Source Sans" },
];

/**
 * Right-side “Tweaks” rail — live brand controls for the mobile canvas (P-02).
 */
export function MobileCanvasTweaks() {
  const accentHue = useMobileCanvasStore((s) => s.accentHue);
  const setAccentHue = useMobileCanvasStore((s) => s.setAccentHue);
  const cornerRadius = useMobileCanvasStore((s) => s.cornerRadius);
  const setCornerRadius = useMobileCanvasStore((s) => s.setCornerRadius);
  const density = useMobileCanvasStore((s) => s.density);
  const setDensity = useMobileCanvasStore((s) => s.setDensity);
  const applyTweaksToAll = useMobileCanvasStore((s) => s.applyTweaksToAll);
  const setApplyTweaksToAll = useMobileCanvasStore((s) => s.setApplyTweaksToAll);
  const theme = useMobileCanvasStore((s) => s.theme);
  const setTheme = useMobileCanvasStore((s) => s.setTheme);
  const [fontPair, setFontPair] = React.useState("system");

  return (
    <div className="w-[220px] shrink-0 space-y-4 rounded-xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <p className="font-body text-xs font-semibold text-text">Tweaks</p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[11px] text-text-muted">Apply to all screens</Label>
          <Switch checked={applyTweaksToAll} onCheckedChange={setApplyTweaksToAll} />
        </div>
        <p className="text-[10px] leading-snug text-text-muted">
          When off, per-screen theming is reserved for a future page-detail scope.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-text-muted">Accent hue</Label>
        <input
          type="range"
          min={0}
          max={360}
          value={accentHue}
          onChange={(e) => setAccentHue(Number(e.target.value))}
          className="h-2 w-full cursor-pointer"
          style={{ accentColor: `hsl(${accentHue} 78% 48%)` }}
        />
        <p className="text-[10px] tabular-nums text-text-muted">{Math.round(accentHue)}°</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-text-muted">Corner radius</Label>
        <input
          type="range"
          min={4}
          max={24}
          value={cornerRadius}
          onChange={(e) => setCornerRadius(Number(e.target.value))}
          className="h-2 w-full cursor-pointer accent-accent"
        />
        <p className="text-[10px] tabular-nums text-text-muted">{cornerRadius}px</p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-text-muted">Font pair</Label>
        <select
          value={fontPair}
          onChange={(e) => setFontPair(e.target.value)}
          className="w-full rounded-md border border-border bg-surface py-1.5 pr-2 pl-2 font-body text-[11px]"
        >
          {FONT_PAIRS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] text-text-muted">Spacing density</Label>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: "compact", label: "Compact" },
              { id: "comfortable", label: "Comfort" },
              { id: "spacious", label: "Spacious" },
            ] as const
          ).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDensity(d.id)}
              className={`rounded-md border py-1.5 font-body text-[10px] ${
                density === d.id
                  ? "border-accent bg-accent/10 text-text"
                  : "border-border text-text-muted hover:bg-bg-elevated"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-[11px] text-text-muted">Light / dark</Label>
        <button
          type="button"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-md border border-border bg-bg-elevated px-2 py-1 font-body text-[10px] capitalize"
        >
          {theme}
        </button>
      </div>
    </div>
  );
}
