import { create } from "zustand";
import { addEdge, type Connection, type Edge, type Node } from "@xyflow/react";
import type { WebCanvasFontPairId } from "@/lib/web-canvas-fonts";
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
<header data-forge-region="header" data-forge-shared="1" style="padding:12px 20px;border-bottom:1px solid rgba(0,0,0,.08);background:var(--fc-bg-elevated);">
  <nav style="display:flex;gap:14px;align-items:center;justify-content:space-between;font:14px/1.2 var(--fc-font-body,system-ui,sans-serif);">
    <span data-forge-node-id="brand" style="font-weight:700;color:var(--fc-accent)">Acme</span>
    <span style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;">${navItems}</span>
    <span style="font-size:12px;opacity:.55">${p}</span>
  </nav>
</header>
<main style="padding:24px 20px;max-width:100%;font-family:var(--fc-font-body,system-ui,sans-serif);">
  <h1 data-forge-node-id="h1" style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;margin:0 0 12px;letter-spacing:-.02em;font-family:var(--fc-font-heading,inherit);">${t}</h1>
  <p data-forge-node-id="p1" style="font-size:16px;line-height:1.5;opacity:.88;margin:0 0 20px;">F-pattern friendly intro copy. The same page renders at three widths on the canvas.</p>
  <a data-forge-node-id="a1" href="#" style="display:inline-block;padding:10px 18px;border-radius:8px;background:var(--fc-accent);color:#fff;font-weight:600;font-size:15px;text-decoration:none;">Call to action</a>
</main>
<footer data-forge-region="footer" data-forge-shared="1" style="padding:16px 20px;font-size:12px;opacity:.6;border-top:1px solid rgba(0,0,0,.08);font-family:var(--fc-font-body,system-ui,sans-serif);">© Forge preview — shared site footer</footer>
`;
}

export type WebPageRecord = {
  id: string;
  title: string;
  path: string;
  html: string;
};

const INITIAL_PAGES: WebPageRecord[] = [
  { id: "wp-home", title: "Home", path: "/", html: buildPageHtml("Welcome home", "/", DEFAULT_SITE_NAV) },
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
): Node<WebBrowserNodeData>[] {
  return pages.map((p, i) => {
    const n = createWebPageNode(p.id, p.title, p.path, p.html, defaultPositionForIndex(i).x, defaultPositionForIndex(i).y);
    n.data = {
      ...n.data,
      theme,
      sharedHeader: true,
      sharedFooter: true,
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
};

export const useWebCanvasStore = create<Store>((set, get) => ({
  focusBreakpoint: "all",
  setFocusBreakpoint: (focusBreakpoint) => set({ focusBreakpoint }),
  siteNavEditorOpen: false,
  setSiteNavEditorOpen: (siteNavEditorOpen) => set({ siteNavEditorOpen }),
  siteNavLinks: DEFAULT_SITE_NAV,
  setSiteNavLinks: (siteNavLinks) => {
    const { pages, theme, nodes } = get();
    const nextPages = pages.map((p) => ({
      ...p,
      html: buildPageHtml(p.title, p.path, siteNavLinks),
    }));
    set({
      siteNavLinks,
      pages: nextPages,
      nodes: buildNodes(nextPages, theme, positionsByPageId(nodes)),
    });
  },
  theme: "light",
  setTheme: (theme) => {
    const { pages, nodes } = get();
    set({ theme, nodes: buildNodes(pages, theme, positionsByPageId(nodes)) });
  },
  marqueeMode: false,
  setMarqueeMode: (marqueeMode) => set({ marqueeMode }),
  toggleMarqueeMode: () => set((s) => ({ marqueeMode: !s.marqueeMode })),
  fontPairId: "system",
  setFontPairId: (fontPairId) => set({ fontPairId }),
  pages: INITIAL_PAGES,
  setPages: (u) => {
    const next = typeof u === "function" ? u(get().pages) : u;
    const { theme, nodes } = get();
    set({ pages: next, nodes: buildNodes(next, theme, positionsByPageId(nodes)) });
  },
  accentHue: 210,
  setAccentHue: (accentHue) => set({ accentHue }),
  cornerRadius: 8,
  setCornerRadius: (cornerRadius) => set({ cornerRadius }),
  applyTweaksToAll: true,
  setApplyTweaksToAll: (applyTweaksToAll) => set({ applyTweaksToAll }),
  nodes: buildNodes(INITIAL_PAGES, "light", new Map()),
  edges: [] as Edge[],
  setNodes: (u) => set({ nodes: typeof u === "function" ? u(get().nodes) : u }),
  setEdges: (u) => set({ edges: typeof u === "function" ? u(get().edges) : u }),
  onConnect: (c) => {
    set((st) => ({ edges: addEdge({ ...c, type: "smoothstep" }, st.edges) }));
  },
  resyncNodes: () => {
    const { pages, theme, nodes } = get();
    set({ nodes: buildNodes(pages, theme, positionsByPageId(nodes)) });
  },
  addPage: () => {
    const n = get().pages.length + 1;
    const { siteNavLinks } = get();
    const pg: WebPageRecord = {
      id: `wp-${Date.now()}`,
      title: `Page ${n}`,
      path: `/page-${n}`,
      html: buildPageHtml(`New page ${n}`, `/page-${n}`, siteNavLinks),
    };
    get().setPages((prev) => [...prev, pg]);
  },
  renamePage: (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const { siteNavLinks } = get();
    get().setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: trimmed, html: buildPageHtml(trimmed, p.path, siteNavLinks) } : p)),
    );
  },
  duplicatePage: (id) => {
    const { pages, siteNavLinks } = get();
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
    get().setPages((prev) => [...prev, pg]);
  },
  deletePage: (id) => {
    if (get().pages.length <= 1) return;
    get().setPages((prev) => prev.filter((p) => p.id !== id));
  },
}));
