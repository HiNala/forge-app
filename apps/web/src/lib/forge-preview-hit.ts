import type { ForgeTaggedHit } from "@/lib/web-marquee-hit";

/** Minimum React Flow viewport zoom for element pick / hover (V2 P-02 / P-03). */
export const MIN_ELEMENT_PICK_ZOOM = 0.75;

export function hitsFromNodeIds(root: HTMLElement, ids: readonly string[]): ForgeTaggedHit[] {
  const out: ForgeTaggedHit[] = [];
  for (const id of ids) {
    const el = root.querySelector<HTMLElement>(`[data-forge-node-id="${CSS.escape(id)}"]`);
    if (!el) continue;
    out.push({
      forgeNodeId: el.getAttribute("data-forge-node-id"),
      forgeRegionId: el.getAttribute("data-forge-region"),
      tagName: el.tagName.toLowerCase(),
    });
  }
  return out;
}

export function pickTargetEl(root: HTMLElement, clientX: number, clientY: number): HTMLElement | null {
  const stack = document.elementsFromPoint(clientX, clientY);
  for (const node of stack) {
    if (!(node instanceof HTMLElement)) continue;
    if (!root.contains(node)) continue;
    const hit = node.closest<HTMLElement>("[data-forge-node-id]");
    if (hit && root.contains(hit)) return hit;
  }
  return null;
}
