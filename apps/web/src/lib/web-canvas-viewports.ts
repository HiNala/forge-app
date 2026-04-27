/**
 * Responsive preview widths for the web canvas (V2-P03). Heights are preview chrome + scroll area.
 * See Ethan Marcotte — three breakpoints so the designer never forgets mobile.
 */
export type WebBreakpointId = "desktop" | "tablet" | "mobile";

export type WebBreakpointSpec = {
  id: WebBreakpointId;
  /** Content width in CSS pixels (layout is evaluated at this width). */
  width: number;
  /** Viewport height for the scrollable preview region. */
  height: number;
  label: string;
};

export const WEB_BREAKPOINTS: readonly WebBreakpointSpec[] = [
  { id: "desktop", width: 1440, height: 560, label: "Desktop" },
  { id: "tablet", width: 834, height: 640, label: "Tablet" },
  { id: "mobile", width: 390, height: 720, label: "Mobile" },
] as const;

/** Target display width (px) after scale for each row in the canvas node. */
export const WEB_CANVAS_ROW_DISPLAY_WIDTH = 380;

export function getBreakpointSpec(id: WebBreakpointId): WebBreakpointSpec {
  return WEB_BREAKPOINTS.find((b) => b.id === id) ?? WEB_BREAKPOINTS[0]!;
}

export function scaleForCanvasRow(contentWidth: number): number {
  return WEB_CANVAS_ROW_DISPLAY_WIDTH / contentWidth;
}
