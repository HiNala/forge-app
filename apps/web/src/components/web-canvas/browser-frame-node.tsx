"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { MoreHorizontal } from "lucide-react";
import * as React from "react";
import {
  WEB_BREAKPOINTS,
  WEB_CANVAS_ROW_DISPLAY_WIDTH,
  scaleForCanvasRow,
  type WebBreakpointId,
} from "@/lib/web-canvas-viewports";
import { useWebCanvasStore } from "./web-canvas-store";
import type { WebBrowserNodeData, WebCanvasFocusBreakpoint } from "./types";
import { cn } from "@/lib/utils";

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

export function BrowserFrameNode({ data, selected }: NodeProps<Node<WebBrowserNodeData, "browserFrame">>) {
  const accentHue = useWebCanvasStore((s) => s.accentHue);
  const corner = useWebCanvasStore((s) => s.cornerRadius);
  const focusBreakpoint = useWebCanvasStore((s) => s.focusBreakpoint);
  const theme = data.theme;
  const bg = theme === "dark" ? "#0f1419" : "#ffffff";
  const fg = theme === "dark" ? "#e6edf3" : "#0f172a";
  const elevated = theme === "dark" ? "#1a222c" : "#f4f4f5";
  const accent = `hsl(${accentHue} 78% 48%)`;

  const styleVars: React.CSSProperties = {
    ...({
      "--fc-bg": bg,
      "--fc-fg": fg,
      "--fc-accent": accent,
      "--fc-bg-elevated": elevated,
      "--fc-radius": `${corner}px`,
    } as React.CSSProperties),
  };

  return (
    <div className="relative w-max" style={{ width: 392 }}>
      <div className="mb-1.5 flex w-full min-w-0 items-center justify-between gap-2 pr-0.5">
        <div className="min-w-0">
          <p className="truncate font-body text-[12px] font-semibold text-text">{data.title}</p>
          <p className="font-mono text-[10px] text-text-muted">{data.path}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {data.sharedHeader ? (
            <span
              className="rounded border border-dashed border-accent/50 bg-accent/5 px-1.5 py-0.5 font-body text-[9px] font-medium text-accent"
              title="Header is site-wide; edits propagate to all pages"
            >
              Shared
            </span>
          ) : null}
          <button
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-bg-elevated"
            aria-label="Page menu"
          >
            <MoreHorizontal className="size-4" />
          </button>
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
        {WEB_BREAKPOINTS.map((bp) => {
          const scale = scaleForCanvasRow(bp.width);
          const { dim, strong } = rowEmphasis(focusBreakpoint, bp.id);
          const contentH = bp.height;
          const scaledH = contentH * scale;
          const displayUrl = `https://preview.local${data.path || "/"}`;

          return (
            <div
              key={bp.id}
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
                  "m-0.5 overflow-hidden rounded",
                  strong ? "ring-2 ring-accent" : "ring-1 ring-border/60",
                )}
              >
                <MacChrome url={displayUrl} theme={theme} />
                <div
                  className={cn("overflow-hidden", theme === "dark" ? "bg-zinc-950" : "bg-zinc-50")}
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
                    <div
                      className="forge-web-html h-full w-full min-h-0 overflow-auto"
                      style={{
                        ...styleVars,
                        background: bg,
                        color: fg,
                        width: bp.width,
                        minHeight: contentH,
                        borderRadius: Math.min(6, corner),
                      }}
                      dangerouslySetInnerHTML={{ __html: data.html }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
