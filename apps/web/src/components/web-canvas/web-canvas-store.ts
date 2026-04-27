import { create } from "zustand";
import { addEdge, type Connection, type Edge, type Node } from "@xyflow/react";
import { createWebPageNode, type WebBrowserNodeData, type WebCanvasFocusBreakpoint } from "./types";

type ThemeMode = "light" | "dark";

function escapeHtmlText(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const demoWebHtml = (title: string, path: string) => {
  const t = escapeHtmlText(title);
  const p = escapeHtmlText(path);
  return `
<header data-forge-region="header" data-forge-shared="1" style="padding:12px 20px;border-bottom:1px solid rgba(0,0,0,.08);background:var(--fc-bg-elevated);">
  <nav style="display:flex;gap:20px;align-items:center;justify-content:space-between;font:14px/1.2 system-ui,sans-serif;">
    <span style="font-weight:700;color:var(--fc-accent)">Acme</span>
    <span style="font-size:12px;opacity:.55">${p}</span>
  </nav>
</header>
<main style="padding:24px 20px;max-width:100%;">
  <h1 data-forge-node-id="h1" style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;margin:0 0 12px;letter-spacing:-.02em;">${t}</h1>
  <p data-forge-node-id="p1" style="font-size:16px;line-height:1.5;opacity:.88;margin:0 0 20px;">F-pattern friendly intro copy. The same page renders at three widths on the canvas.</p>
  <a data-forge-node-id="a1" href="#" style="display:inline-block;padding:10px 18px;border-radius:8px;background:var(--fc-accent);color:#fff;font-weight:600;font-size:15px;text-decoration:none;">Call to action</a>
</main>
<footer data-forge-region="footer" data-forge-shared="1" style="padding:16px 20px;font-size:12px;opacity:.6;border-top:1px solid rgba(0,0,0,.08);">© Forge preview — shared site footer</footer>
`;
};

export type WebPageRecord = {
  id: string;
  title: string;
  path: string;
  html: string;
};

const INITIAL_PAGES: WebPageRecord[] = [
  { id: "wp-home", title: "Home", path: "/", html: demoWebHtml("Welcome home", "/") },
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
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  marqueeMode: boolean;
  setMarqueeMode: (v: boolean) => void;
  toggleMarqueeMode: () => void;
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
};

export const useWebCanvasStore = create<Store>((set, get) => ({
  focusBreakpoint: "all",
  setFocusBreakpoint: (focusBreakpoint) => set({ focusBreakpoint }),
  siteNavEditorOpen: false,
  setSiteNavEditorOpen: (siteNavEditorOpen) => set({ siteNavEditorOpen }),
  theme: "light",
  setTheme: (theme) => {
    const { pages, nodes } = get();
    set({ theme, nodes: buildNodes(pages, theme, positionsByPageId(nodes)) });
  },
  marqueeMode: false,
  setMarqueeMode: (marqueeMode) => set({ marqueeMode }),
  toggleMarqueeMode: () => set((s) => ({ marqueeMode: !s.marqueeMode })),
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
    const pg: WebPageRecord = {
      id: `wp-${Date.now()}`,
      title: `Page ${n}`,
      path: `/page-${n}`,
      html: demoWebHtml(`New page ${n}`, `/page-${n}`),
    };
    get().setPages((prev) => [...prev, pg]);
  },
}));
