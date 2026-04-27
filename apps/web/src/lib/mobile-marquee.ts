/**
 * Geometry helpers for marquee selection over a design surface (V2-P02).
 * Rectangles are in the same CSS pixel space as the screen content box.
 */
export type Rect = { x: number; y: number; w: number; h: number };

export function normalizeRect(a: { x0: number; y0: number; x1: number; y1: number }): Rect {
  const x = Math.min(a.x0, a.x1);
  const y = Math.min(a.y0, a.y1);
  const w = Math.abs(a.x1 - a.x0);
  const h = Math.abs(a.y1 - a.y0);
  return { x, y, w, h };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function areaRatio(inner: Rect, outer: Rect): number {
  const oa = Math.max(1, outer.w * outer.h);
  const ia = inner.w * inner.h;
  return ia / oa;
}

/**
 * @param elements — each rect in screen-local space
 * @returns indices of elements overlapping the marquee by any positive area
 */
export function selectOverlapping(elementRects: readonly Rect[], marquee: Rect | null): number[] {
  if (!marquee || marquee.w < 1 || marquee.h < 1) return [];
  const out: number[] = [];
  for (let i = 0; i < elementRects.length; i++) {
    if (rectsOverlap(marquee, elementRects[i]!)) out.push(i);
  }
  return out;
}
