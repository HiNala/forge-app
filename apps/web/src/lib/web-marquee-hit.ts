import { normalizeRect, rectsOverlap, type Rect } from "@/lib/mobile-marquee";

export type ForgeTaggedHit = {
  forgeNodeId: string | null;
  forgeRegionId: string | null;
  tagName: string;
};

/**
 * DOMRect-like input (viewport coordinates).
 */
export function domRectToRect(r: Pick<DOMRect, "left" | "top" | "width" | "height">): Rect {
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

const SELECTOR = "[data-forge-node-id], [data-forge-region]";

/**
 * Returns tagged elements in root whose bounding box overlaps the marquee (viewport space).
 */
export function collectForgeHits(root: HTMLElement, marqueeClient: { x0: number; y0: number; x1: number; y1: number }): ForgeTaggedHit[] {
  const marquee = normalizeRect(marqueeClient);
  if (marquee.w < 1 || marquee.h < 1) return [];

  const els = root.querySelectorAll<HTMLElement>(SELECTOR);
  const out: ForgeTaggedHit[] = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const br = domRectToRect(r);
    if (!rectsOverlap(marquee, br)) continue;
    out.push({
      forgeNodeId: el.getAttribute("data-forge-node-id"),
      forgeRegionId: el.getAttribute("data-forge-region"),
      tagName: el.tagName.toLowerCase(),
    });
  }
  return out;
}

/**
 * Ratio of intersection area of marquee with container to container area (0–1).
 */
export function marqueeCoverageRatio(container: HTMLElement, marqueeClient: { x0: number; y0: number; x1: number; y1: number }): number {
  const outer = domRectToRect(container.getBoundingClientRect());
  const m = normalizeRect(marqueeClient);
  const ix = Math.max(m.x, outer.x);
  const iy = Math.max(m.y, outer.y);
  const ix2 = Math.min(m.x + m.w, outer.x + outer.w);
  const iy2 = Math.min(m.y + m.h, outer.y + outer.h);
  const iw = Math.max(0, ix2 - ix);
  const ih = Math.max(0, iy2 - iy);
  const inter = iw * ih;
  const oa = Math.max(1, outer.w * outer.h);
  return inter / oa;
}
