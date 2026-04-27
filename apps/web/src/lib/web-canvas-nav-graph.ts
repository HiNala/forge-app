/**
 * Path + link helpers for web canvas routing (V2-P03 Phase 7, client-side).
 */

export function normalizeWebPath(path: string): string {
  const t = path.trim() || "/";
  const withSlash = t.startsWith("/") ? t : `/${t}`;
  if (withSlash === "/") return "/";
  return withSlash.replace(/\/+$/, "") || "/";
}

export type InternalNavTarget = { path: string; label: string };

/**
 * Collects same-origin path links from page HTML (anchors only, no http(s)).
 */
export function collectInternalNavTargetsFromHtml(html: string): InternalNavTarget[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: InternalNavTarget[] = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    const raw = a.getAttribute("href")?.trim();
    if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return;
    const pathOnly = raw.split(/[?#]/)[0] ?? raw;
    const path = normalizeWebPath(pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
    out.push({ path, label: (a.textContent ?? "").trim().slice(0, 48) || path });
  });
  return out;
}

/** Page ids with no incoming flow edge (excluding the homepage). */
export function orphanPageIds(
  pageIds: readonly string[],
  homePageId: string,
  edges: readonly { source: string; target: string }[],
): string[] {
  const incoming = new Set(edges.map((e) => e.target));
  return pageIds.filter((id) => id !== homePageId && !incoming.has(id));
}
