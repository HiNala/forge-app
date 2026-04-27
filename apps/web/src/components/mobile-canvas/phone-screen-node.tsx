"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import { getDevicePreset, type MobileDevicePreset } from "@/lib/mobile-devices";
import { useMobileCanvasStore } from "./mobile-canvas-store";
import type { MobilePhoneNodeData } from "./types";
import { cn } from "@/lib/utils";

function StatusBar({ theme, compact }: { theme: "light" | "dark"; compact?: boolean }) {
  const fg = theme === "dark" ? "rgba(255,255,255,.92)" : "rgba(0,0,0,.88)";
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
        style={{ background: theme === "dark" ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.2)" }}
      />
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
  const preset = getDevicePreset(data.deviceId);
  const accentHue = useMobileCanvasStore((s) => s.accentHue);
  const corner = useMobileCanvasStore((s) => s.cornerRadius);
  const theme = data.theme;
  const shellBg = theme === "dark" ? "#0c0c0e" : "#e8e8ed";
  const screenBg = theme === "dark" ? "#000" : "#fff";
  const fg = theme === "dark" ? "#f5f5f7" : "#0f172a";
  const accent = `hsl(${accentHue} 78% 48%)`;
  const chrome = getChrome(preset);
  const contentHeight = Math.max(120, preset.height - chrome.top - chrome.bottom);

  const styleVars: React.CSSProperties = {
    ...({
      "--fc-bg": screenBg,
      "--fc-fg": fg,
      "--fc-accent": accent,
      "--fc-radius": `${corner}px`,
    } as React.CSSProperties),
  };

  return (
    <div className="relative w-max">
      <div className="mb-1.5 flex w-full min-w-0 max-w-[min(100%,480px)] items-center justify-between gap-2 pr-0.5">
        <p className="min-w-0 truncate font-body text-[12px] font-semibold text-text-muted">{data.title}</p>
        <button
          type="button"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-bg-elevated"
          aria-label="Screen menu"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      <div className="relative">
        <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-border !bg-accent" />
        <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-2 !border-border !bg-accent" />

        <div
          className={cn(
            "overflow-hidden shadow-2xl",
            selected
              ? "ring-2 ring-accent ring-offset-2 ring-offset-bg"
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
                style={{ background: theme === "dark" ? "#0a0a0b" : "#0a0a0a" }}
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
            <div
              className="forge-mobile-html h-full w-full min-h-0 overflow-auto"
              style={{ borderRadius: Math.min(8, corner) }}
              dangerouslySetInnerHTML={{ __html: data.html }}
            />
          </div>

          {preset.hasHomeIndicator ? <HomeIndicator theme={theme} /> : null}
        </div>
      </div>

    </div>
  );
}
