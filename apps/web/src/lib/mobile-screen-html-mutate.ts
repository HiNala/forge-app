/**
 * Client-side mutations of mobile preview HTML (V2 P-02 demo canvas).
 * Server/orchestration remains source of truth once wired (P-05).
 */

function newForgeNodeId(): string {
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Remove every selected tagged node from the HTML fragment. */
export function removeForgeNodesFromHtml(html: string, forgeNodeIds: readonly string[]): string {
  if (forgeNodeIds.length === 0) return html;
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  for (const id of forgeNodeIds) {
    wrap.querySelector(`[data-forge-node-id="${CSS.escape(id)}"]`)?.remove();
  }
  return wrap.innerHTML;
}

/** Clone each selected node (in list order) immediately after itself with a fresh `data-forge-node-id`. */
export function duplicateForgeNodesInHtml(html: string, forgeNodeIds: readonly string[]): string {
  if (forgeNodeIds.length === 0) return html;
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  for (const id of forgeNodeIds) {
    const el = wrap.querySelector<HTMLElement>(`[data-forge-node-id="${CSS.escape(id)}"]`);
    if (!el) continue;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.setAttribute("data-forge-node-id", newForgeNodeId());
    clone.removeAttribute("data-forge-canvas-selected");
    clone.removeAttribute("data-forge-canvas-hover");
    el.insertAdjacentElement("afterend", clone);
  }
  return wrap.innerHTML;
}
