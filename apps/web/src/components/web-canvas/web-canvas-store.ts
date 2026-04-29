import { create } from "zustand";
import { addEdge, type Connection, type Edge, type Node } from "@xyflow/react";
import type { WebCanvasFontPairId } from "@/lib/web-canvas-fonts";
import { collectInternalNavTargetsFromHtml, normalizeWebPath } from "@/lib/web-canvas-nav-graph";
import { createWebPageNode, type WebBrowserNodeData, type WebCanvasFocusBreakpoint } from "./types";

type ThemeMode = "light" | "dark";

export type SiteNavLink = { id: string; label: string; href: string };

function escapeHtmlText(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttr(raw: string): string {
  return escapeHtmlText(raw).replace(/`/g, "&#96;");
}

const DEFAULT_SITE_NAV: SiteNavLink[] = [
  { id: "nav-home", label: "Home", href: "/" },
  { id: "nav-pricing", label: "Pricing", href: "/pricing" },
];

const INITIAL_HOME_ID = "wp-home";

/** Shared header/footer + main body; nav drives the site-wide header. Exported for tests. */
export function buildPageHtml(title: string, path: string, navLinks: SiteNavLink[]): string {
  const t = escapeHtmlText(title);
  const p = escapeHtmlText(path);
  const navItems = navLinks
    .map(
      (l) =>
        `<a data-forge-node-id="${escapeHtmlAttr(`link-${l.id}`)}" href="${escapeHtmlAttr(l.href)}" style="font-size:13px;color:var(--fc-fg);opacity:.85;text-decoration:none;font-weight:500;">${escapeHtmlText(l.label)}</a>`,
    )
    .join('<span style="opacity:.25">·</span>');

  return `
<header class="forge-shared-region" data-forge-region="header" data-forge-shared="1" style="padding:12px 20px;border-bottom:1px solid color-mix(in oklch, var(--fc-fg) 8%, transparent);background:var(--fc-bg-elevated);">
  <nav style="display:flex;gap:14px;align-items:center;justify-content:space-between;font:14px/1.2 var(--fc-font-body,system-ui,sans-serif);">
    <span data-forge-node-id="brand" style="font-weight:700;color:var(--fc-accent)">Acme</span>
    <span style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">${navItems}</span>
    <span style="font-size:12px;opacity:.55">${p}</span>
  </nav>
</header>
<main style="padding:24px 20px;max-width:100%;font-family:var(--fc-font-body,system-ui,sans-serif);">
  <h1 data-forge-node-id="h1" style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;margin:0 0 12px;letter-spacing:-.02em;font-family:var(--fc-font-heading,inherit);">${t}</h1>
  <p data-forge-node-id="p1" style="font-size:16px;line-height:1.5;opacity:.88;margin:0 0 20px;">F-pattern friendly intro copy. The same page renders at three widths on the canvas.</p>
  <a data-forge-node-id="a1" href="#" style="display:inline-block;padding:10px 18px;border-radius:8px;background:var(--fc-accent);color:var(--fc-on-accent, oklch(0.99 0.003 80));font-weight:600;font-size:15px;text-decoration:none;">Call to action</a>
</main>
<footer class="forge-shared-region" data-forge-region="footer" data-forge-shared="1" style="padding:16px 20px;font-size:12px;opacity:.6;border-top:1px solid color-mix(in oklch, var(--fc-fg) 8%, transparent);font-family:var(--fc-font-body,system-ui,sans-serif);">© GlideDesign preview — shared site footer</footer>
`;
}

export type WebPageRecord = {
  id: string;
  title: string;
  path: string;
  html: string;
};

const INITIAL_PAGES: WebPageRecord[] = [
  { id: INITIAL_HOME_ID, title: "Home", path: "/", html: buildPageHtml("Welcome home", "/", DEFAULT_SITE_NAV) },
];

function positionsByPageId(nodes: Node<WebBrowserNodeData>[]): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  for (const n of nodes) m.set(n.id, { ...n.position });
  return m;
}

function defaultPositionForIndex(i: number): { x: number; y: number } {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return { x: 80 + col * 520, y: 40 + row * 680 };
}

function buildNodes(
  pages: WebPageRecord[],
  theme: ThemeMode,
  previous: Map<string, { x: number; y: number }>,
  homePageId: string,
): Node<WebBrowserNodeData>[] {
  return pages.map((p, i) => {
    const n = createWebPageNode(p.id, p.title, p.path, p.html, defaultPositionForIndex(i).x, defaultPositionForIndex(i).y);
    n.data = {
      ...n.data,
      theme,
      sharedHeader: true,
      sharedFooter: true,
      isHome: p.id === homePageId,
    };
    const kept = previous.get(p.id);
    if (kept) n.position = kept;
    return n;
  });
}

type Store = {
  /** Which breakpoint row is visually emphasized; "all" = equal weight */
  focusBreakpoint: WebCanvasFocusBreakpoint;
  setFocusBreakpoint: (b: WebCanvasFocusBreakpoint) => void;
  siteNavEditorOpen: boolean;
  setSiteNavEditorOpen: (v: boolean) => void;
  siteNavLinks: SiteNavLink[];
  setSiteNavLinks: (links: SiteNavLink[]) => void;
  /** Page id treated as site homepage for orphan / routing UX */
  homePageId: string;
  setHomePageId: (id: string) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  marqueeMode: boolean;
  setMarqueeMode: (v: boolean) => void;
  toggleMarqueeMode: () => void;
  fontPairId: WebCanvasFontPairId;
  setFontPairId: (id: WebCanvasFontPairId) => void;
  pages: WebPageRecord[];
  setPages: (p: WebPageRecord[] | ((prev: WebPageRecord[]) => WebPageRecord[])) => void;
  accentHue: number;
  setAccentHue: (n: number) => void;
  cornerRadius: number;
  setCornerRadius: (n: number) => void;
  applyTweaksToAll: boolean;
  setApplyTweaksToAll: (v: boolean) => void;
  nodes: Node<WebBrowserNodeData>[];
  edges: Edge[];
  setNodes: (n: Node<WebBrowserNodeData>[] | ((p: Node<WebBrowserNodeData>[]) => Node<WebBrowserNodeData>[])) => void;
  setEdges: (e: Edge[] | ((p: Edge[]) => Edge[])) => void;
  onConnect: (c: Connection) => void;
  resyncNodes: () => void;
  addPage: () => void;
  renamePage: (id: string, title: string) => void;
  duplicatePage: (id: string) => void;
  deletePage: (id: string) => void;
  updatePagePath: (id: string, rawPath: string) => boolean;
  /** Replace one page’s preview HTML without rebuilding from site nav template */
  updatePageHtml: (id: string, html: string) => void;
  arrangePagesInGrid: () => void;
  /** Replace auto-generated edges (from &lt;a href&gt;) while keeping manual links */
  syncFlowEdgesFromNavLinks: () => void;
  /** Set by preview link clicks; consumed by React Flow to fit/select the target page node. */
  pendingFocusPageId: string | null;
  clearPendingFocusPageId: () => void;
  /** Internal same-site links in preview HTML: focus + frame matching canvas page (V2-P03). */
  requestFocusPageByPath: (hrefPath: string) => void;

  canvasProjectId: string | null;
  setCanvasProjectId: (id: string | null) => void;
  hydratePagesFromServer: (
    projectId: string,
    screens: ReadonlyArray<{
      id: string;
      name: string;
      slug: string;
      html: string;
      position_x: string | number;
      position_y: string | number;
    }>,
  ) => void;
};

function slugToWebPath(slug: string): string {
  const raw = slug.trim();
  if (!raw || raw.toLowerCase() === "home") return "/";
  return normalizeWebPath(raw.startsWith("/") ? raw : `/${raw}`);
}

export const useWebCanvasStore = create<Store>((set, get) => ({
  focusBreakpoint: "all",
  setFocusBreakpoint: (focusBreakpoint) => set({ focusBreakpoint }),
  siteNavEditorOpen: false,
  setSiteNavEditorOpen: (siteNavEditorOpen) => set({ siteNavEditorOpen }),
  siteNavLinks: DEFAULT_SITE_NAV,
  setSiteNavLinks: (siteNavLinks) => {
    const { pages, theme, nodes, homePageId } = get();
    const nextPages = pages.map((p) => ({
      ...p,
      html: buildPageHtml(p.title, p.path, siteNavLinks),
    }));
    set({
      siteNavLinks,
      pages: nextPages,
      nodes: buildNodes(nextPages, theme, positionsByPageId(nodes), homePageId),
    });
  },
  homePageId: INITIAL_HOME_ID,
  setHomePageId: (id) => {
    const st = get();
    if (!st.pages.some((p) => p.id === id)) return;
    set({
      homePageId: id,
      nodes: buildNodes(st.pages, st.theme, positionsByPageId(st.nodes), id),
    });
  },
  theme: "light",
  setTheme: (theme) => {
    const { pages, nodes, homePageId } = get();
    set({ theme, nodes: buildNodes(pages, theme, positionsByPageId(nodes), homePageId) });
  },
  marqueeMode: false,
  setMarqueeMode: (marqueeMode) => set({ marqueeMode }),
  toggleMarqueeMode: () => set((s) => ({ marqueeMode: !s.marqueeMode })),
  fontPairId: "system",
  setFontPairId: (fontPairId) => set({ fontPairId }),
  pages: INITIAL_PAGES,
  setPages: (u) => {
    const next = typeof u === "function" ? u(get().pages) : u;
    const { theme, nodes, homePageId } = get();
    let home = homePageId;
    if (!next.some((p) => p.id === home)) home = next[0]?.id ?? homePageId;
    set({ pages: next, homePageId: home, nodes: buildNodes(next, theme, positionsByPageId(nodes), home) });
  },
  accentHue: 210,
  setAccentHue: (accentHue) => set({ accentHue }),
  cornerRadius: 8,
  setCornerRadius: (cornerRadius) => set({ cornerRadius }),
  applyTweaksToAll: true,
  setApplyTweaksToAll: (applyTweaksToAll) => set({ applyTweaksToAll }),
  nodes: buildNodes(INITIAL_PAGES, "light", new Map(), INITIAL_HOME_ID),
  edges: [] as Edge[],
  pendingFocusPageId: null as string | null,
  clearPendingFocusPageId: () => set({ pendingFocusPageId: null }),
  requestFocusPageByPath: (raw) => {
    const pathOnly = raw.split(/[?#]/)[0]?.trim() ?? "";
    if (!pathOnly || pathOnly === "#") return;
    const norm = normalizeWebPath(pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`);
    const page = get().pages.find((p) => normalizeWebPath(p.path) === norm);
    if (!page) return;
    set((s) => ({
      pendingFocusPageId: page.id,
      nodes: s.nodes.map((n) => ({ ...n, selected: n.id === page.id })),
    }));
  },
  setNodes: (u) => set({ nodes: typeof u === "function" ? u(get().nodes) : u }),
  setEdges: (u) => set({ edges: typeof u === "function" ? u(get().edges) : u }),
  onConnect: (c) => {
    set((st) => ({
      edges: addEdge({ ...c, type: "smoothstep", data: { fromNav: false } }, st.edges),
    }));
  },
  resyncNodes: () => {
    const { pages, theme, nodes, homePageId } = get();
    set({ nodes: buildNodes(pages, theme, positionsByPageId(nodes), homePageId) });
  },
  addPage: () => {
    const n = get().pages.length + 1;
    const { siteNavLinks, theme, nodes, homePageId } = get();
    const pg: WebPageRecord = {
      id: `wp-${Date.now()}`,
      title: `Page ${n}`,
      path: `/page-${n}`,
      html: buildPageHtml(`New page ${n}`, `/page-${n}`, siteNavLinks),
    };
    const next = [...get().pages, pg];
    set({ pages: next, nodes: buildNodes(next, theme, positionsByPageId(nodes), homePageId) });
  },
  renamePage: (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const { siteNavLinks, theme, nodes, homePageId } = get();
    const next = get().pages.map((p) =>
      p.id === id ? { ...p, title: trimmed, html: buildPageHtml(trimmed, p.path, siteNavLinks) } : p,
    );
    set({ pages: next, nodes: buildNodes(next, theme, positionsByPageId(nodes), homePageId) });
  },
  duplicatePage: (id) => {
    const { pages, siteNavLinks, theme, nodes, homePageId } = get();
    const p = pages.find((x) => x.id === id);
    if (!p) return;
    const idx = pages.length + 1;
    const nid = `wp-${Date.now()}`;
    const pg: WebPageRecord = {
      id: nid,
      title: `${p.title} copy`,
      path: `/page-${idx}-${nid.slice(-4)}`,
      html: buildPageHtml(`${p.title} copy`, `/page-${idx}-${nid.slice(-4)}`, siteNavLinks),
    };
    const next = [...pages, pg];
    set({ pages: next, nodes: buildNodes(next, theme, positionsByPageId(nodes), homePageId) });
  },
  deletePage: (id) => {
    const st = get();
    if (st.pages.length <= 1) return;
    const nextPages = st.pages.filter((p) => p.id !== id);
    const home = st.homePageId === id ? nextPages[0]!.id : st.homePageId;
    const nextEdges = st.edges.filter((e) => e.source !== id && e.target !== id);
    set({
      pages: nextPages,
      homePageId: home,
      edges: nextEdges,
      nodes: buildNodes(nextPages, st.theme, positionsByPageId(st.nodes), home),
    });
  },
  updatePagePath: (id, rawPath) => {
    const path = normalizeWebPath(rawPath);
    const { pages, siteNavLinks, theme, nodes, homePageId } = get();
    if (pages.some((p) => p.id !== id && normalizeWebPath(p.path) === path)) {
      return false;
    }
    const next = pages.map((p) =>
      p.id === id ? { ...p, path, html: buildPageHtml(p.title, path, siteNavLinks) } : p,
    );
    set({ pages: next, nodes: buildNodes(next, theme, positionsByPageId(nodes), homePageId) });
    return true;
  },
  updatePageHtml: (id, html) => {
    const { pages, theme, nodes, homePageId } = get();
    const next = pages.map((p) => (p.id === id ? { ...p, html } : p));
    set({ pages: next, nodes: buildNodes(next, theme, positionsByPageId(nodes), homePageId) });
  },
  arrangePagesInGrid: () => {
    const { pages, theme, homePageId } = get();
    const pos = new Map<string, { x: number; y: number }>();
    pages.forEach((p, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      pos.set(p.id, { x: 80 + col * 520, y: 40 + row * 680 });
    });
    set({ nodes: buildNodes(pages, theme, pos, homePageId) });
  },
  syncFlowEdgesFromNavLinks: () => {
    const st = get();
    const kept = st.edges.filter((e) => !(e.data as { fromNav?: boolean } | undefined)?.fromNav);
    const pathMap = new Map(st.pages.map((p) => [normalizeWebPath(p.path), p.id]));
    const newEdges: Edge[] = [];
    let seq = 0;
    const seen = new Set<string>();
    for (const p of st.pages) {
      for (const { path: href, label } of collectInternalNavTargetsFromHtml(p.html)) {
        const tid = pathMap.get(href);
        if (!tid || tid === p.id) continue;
        const key = `${p.id}->${tid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        newEdges.push({
          id: `forge-nav-${p.id}-${tid}-${seq++}`,
          source: p.id,
          target: tid,
          type: "smoothstep",
          label: label || undefined,
          data: { fromNav: true },
        });
      }
    }
    set({ edges: [...kept, ...newEdges] });
  },

  canvasProjectId: null,
  setCanvasProjectId: (canvasProjectId) => set({ canvasProjectId }),

  hydratePagesFromServer: (canvasProjectId, screens) => {
    const { theme, siteNavLinks } = get();
    const pos = positionsByPageId(get().nodes);
    for (const sc of screens) {
      const x = Number(sc.position_x);
      const y = Number(sc.position_y);
      if (Number.isFinite(x) && Number.isFinite(y)) pos.set(sc.id, { x, y });
    }
    if (!screens.length) {
      set({ canvasProjectId });
      return;
    }
    const nextPages: WebPageRecord[] = screens.map((sc, i) => {
      const path = slugToWebPath(sc.slug);
      const title = sc.name.trim() ? sc.name : `Page ${i + 1}`;
      const html =
        sc.html && sc.html.trim().length > 0 ? sc.html : buildPageHtml(title, path, siteNavLinks);
      return { id: sc.id, title, path, html };
    });
    const homePageId =
      nextPages.find((p) => normalizeWebPath(p.path) === normalizeWebPath("/"))?.id ??
      nextPages[0]!.id;
    set({
      canvasProjectId,
      pages: nextPages,
      homePageId,
      edges: [],
      nodes: buildNodes(nextPages, theme, pos, homePageId),
    });
    get().syncFlowEdgesFromNavLinks();
  },
}));
