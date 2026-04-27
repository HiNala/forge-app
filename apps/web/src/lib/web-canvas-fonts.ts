/** Curated stacks for web canvas previews (P-03). Uses system fallbacks; optional webfonts load via layout if added later. */
export const WEB_CANVAS_FONT_PAIRS = [
  { id: "system", label: "System / Inter", heading: "system-ui, -apple-system, Segoe UI, sans-serif", body: "system-ui, -apple-system, Segoe UI, sans-serif" },
  { id: "inter", label: "Inter + Inter", heading: "Inter, system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
  { id: "display", label: "DM Sans + Inter", heading: "'DM Sans', system-ui, sans-serif", body: "Inter, system-ui, sans-serif" },
  { id: "serif", label: "Fraunces + Source Sans", heading: "'Fraunces', Georgia, serif", body: "'Source Sans 3', system-ui, sans-serif" },
] as const;

export type WebCanvasFontPairId = (typeof WEB_CANVAS_FONT_PAIRS)[number]["id"];

export function getWebFontStacks(pairId: string): { heading: string; body: string } {
  const row = WEB_CANVAS_FONT_PAIRS.find((p) => p.id === pairId);
  return row ?? WEB_CANVAS_FONT_PAIRS[0]!;
}
