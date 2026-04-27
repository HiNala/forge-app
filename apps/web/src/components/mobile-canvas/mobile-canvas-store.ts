import { create } from "zustand";
import type { MobileDeviceId } from "@/lib/mobile-devices";
import { addEdge, type Connection, type Edge, type Node } from "@xyflow/react";
import { createMobilePhoneNode, type MobilePhoneNodeData } from "./types";

type ThemeMode = "light" | "dark";

export type MobileScreen = {
  id: string;
  title: string;
  html: string;
};

function escapeHtmlText(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const demoHtml = (title: string) => {
  const t = escapeHtmlText(title);
  return `
<div class="fc-root" style="min-height:100%;background:var(--fc-bg);color:var(--fc-fg);font:16px/1.4 system-ui,-apple-system,sans-serif;padding:16px;box-sizing:border-box;">
  <p data-forge-node-id="t1" data-forge-tappable="1" style="font-size:12px;opacity:.6;margin:0 0 8px;">9:41</p>
  <h1 data-forge-node-id="h1" data-forge-tappable="1" style="font-size:24px;font-weight:700;margin:0 0 12px;letter-spacing:-.02em;">${t}</h1>
  <p data-forge-node-id="p1" data-forge-tappable="1" style="font-size:15px;opacity:.85;margin:0 0 20px;">Describe changes with a region box or tap an element. This is a live HTML preview.</p>
  <button data-forge-node-id="b1" data-forge-tappable="1" type="button" style="display:block;width:100%;padding:14px 16px;border-radius:12px;border:none;background:var(--fc-accent);color:#fff;font-weight:600;font-size:16px;cursor:default;">Primary action</button>
</div>
`;
};

const INITIAL_SCREENS: MobileScreen[] = [
  { id: "s1", title: "Home · Main", html: demoHtml("Welcome") },
  { id: "s2", title: "Onboarding", html: demoHtml("Get started") },
];

function positionsByScreenId(nodes: Node<MobilePhoneNodeData>[]): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>();
  for (const n of nodes) m.set(n.id, { ...n.position });
  return m;
}

function buildNodes(
  screens: MobileScreen[],
  deviceId: MobileDeviceId,
  theme: ThemeMode,
  previousPositions: Map<string, { x: number; y: number }>,
): Node<MobilePhoneNodeData>[] {
  return screens.map((s, i) => {
    const n = createMobilePhoneNode(s.id, s.title, s.html, deviceId, 40 + i * 420, 60);
    n.data = { ...n.data, theme };
    const kept = previousPositions.get(s.id);
    if (kept) n.position = kept;
    return n;
  });
}

const INITIAL_DEVICE: MobileDeviceId = "iphone-15";

type Store = {
  deviceId: MobileDeviceId;
  setDeviceId: (id: MobileDeviceId) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  marqueeMode: boolean;
  setMarqueeMode: (v: boolean) => void;
  toggleMarqueeMode: () => void;
  screens: MobileScreen[];
  setScreens: (s: MobileScreen[] | ((prev: MobileScreen[]) => MobileScreen[])) => void;
  accentHue: number;
  setAccentHue: (n: number) => void;
  cornerRadius: number;
  setCornerRadius: (n: number) => void;
  density: "compact" | "comfortable" | "spacious";
  setDensity: (d: "compact" | "comfortable" | "spacious") => void;
  applyTweaksToAll: boolean;
  setApplyTweaksToAll: (v: boolean) => void;
  nodes: Node<MobilePhoneNodeData>[];
  edges: Edge[];
  setNodes: (n: Node<MobilePhoneNodeData>[] | ((p: Node<MobilePhoneNodeData>[]) => Node<MobilePhoneNodeData>[])) => void;
  setEdges: (e: Edge[] | ((p: Edge[]) => Edge[])) => void;
  onConnect: (c: Connection) => void;
  resyncNodes: () => void;
  addScreen: () => void;
};

export const useMobileCanvasStore = create<Store>((set, get) => ({
  deviceId: INITIAL_DEVICE,
  setDeviceId: (deviceId) => {
    const { screens, theme, nodes } = get();
    set({ deviceId, nodes: buildNodes(screens, deviceId, theme, positionsByScreenId(nodes)) });
  },
  theme: "light",
  setTheme: (theme) => {
    const { screens, deviceId, nodes } = get();
    set({ theme, nodes: buildNodes(screens, deviceId, theme, positionsByScreenId(nodes)) });
  },
  marqueeMode: false,
  setMarqueeMode: (marqueeMode) => set({ marqueeMode }),
  toggleMarqueeMode: () => set((s) => ({ marqueeMode: !s.marqueeMode })),
  screens: INITIAL_SCREENS,
  setScreens: (u) => {
    const next = typeof u === "function" ? u(get().screens) : u;
    const { deviceId, theme, nodes } = get();
    set({ screens: next, nodes: buildNodes(next, deviceId, theme, positionsByScreenId(nodes)) });
  },
  accentHue: 210,
  setAccentHue: (accentHue) => set({ accentHue }),
  cornerRadius: 12,
  setCornerRadius: (cornerRadius) => set({ cornerRadius }),
  density: "comfortable",
  setDensity: (density) => set({ density }),
  applyTweaksToAll: true,
  setApplyTweaksToAll: (applyTweaksToAll) => set({ applyTweaksToAll }),
  nodes: buildNodes(INITIAL_SCREENS, INITIAL_DEVICE, "light", new Map()),
  edges: [] as Edge[],
  setNodes: (u) => set({ nodes: typeof u === "function" ? u(get().nodes) : u }),
  setEdges: (u) => set({ edges: typeof u === "function" ? u(get().edges) : u }),
  onConnect: (c) => {
    set((st) => ({ edges: addEdge({ ...c, type: "smoothstep" }, st.edges) }));
  },
  resyncNodes: () => {
    const { screens, deviceId, theme, nodes } = get();
    set({ nodes: buildNodes(screens, deviceId, theme, positionsByScreenId(nodes)) });
  },
  addScreen: () => {
    const n = get().screens.length + 1;
    const s: MobileScreen = {
      id: `s${Date.now()}`,
      title: `Screen ${n}`,
      html: demoHtml("New screen"),
    };
    get().setScreens((prev) => [...prev, s]);
  },
}));
