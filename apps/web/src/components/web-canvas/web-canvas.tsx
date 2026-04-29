"use client";

import { useAuth } from "@/providers/forge-auth-provider";
import { useQuery } from "@tanstack/react-query";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  PanOnScrollMode,
  useStore,
  useReactFlow,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { getCanvasProject, patchCanvasScreen } from "@/lib/canvas-api";
import { useForgeSession } from "@/providers/session-provider";
import { useWebCanvasStore } from "./web-canvas-store";
import { WebCanvasToolbar } from "./web-canvas-toolbar";
import { WebCanvasTweaks } from "./web-canvas-tweaks";
import { BrowserFrameNode } from "./browser-frame-node";
import type { WebBrowserNodeData } from "./types";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

const EXTENT: [[number, number], [number, number]] = [
  [-50_000, -50_000],
  [50_000, 50_000],
];

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStore) => {
      if (typeof window === "undefined") return () => {};
      const q = window.matchMedia("(prefers-reduced-motion: reduce)");
      q.addEventListener("change", onStore);
      return () => q.removeEventListener("change", onStore);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function isKeyEventFromEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function ZoomReadout() {
  const z = useStore((s) => s.transform[2]);
  const zoomLabel = Math.round(z * 100);
  return (
    <Panel position="bottom-left" className="!m-0 !mb-3 !ml-3">
      <span
        className="pointer-events-none font-body text-[10px] tabular-nums text-text-muted"
        aria-label={`Canvas zoom ${zoomLabel} percent`}
      >
        {zoomLabel}%
      </span>
    </Panel>
  );
}

/** When preview `<a href="/path">` matches another page, frame that node on the canvas. */
function WebCanvasPendingFocus() {
  const rf = useReactFlow();
  const pending = useWebCanvasStore((s) => s.pendingFocusPageId);
  const clear = useWebCanvasStore((s) => s.clearPendingFocusPageId);
  const nodeList = useWebCanvasStore((s) => s.nodes);

  useEffect(() => {
    if (!pending) return;
    if (!nodeList.some((n) => n.id === pending)) {
      clear();
      return;
    }
    const id = pending;
    clear();
    const handle = requestAnimationFrame(() => {
      void rf.fitView({
        nodes: [{ id }],
        padding: 0.35,
        duration: 300,
        minZoom: 0.25,
        maxZoom: 2,
      });
    });
    return () => cancelAnimationFrame(handle);
  }, [pending, nodeList, rf, clear]);

  return null;
}

function DotGridBackground() {
  const z = useStore((s) => s.transform[2]);
  const reduceMotion = usePrefersReducedMotion();
  if (z < 0.5) {
    return null;
  }
  return (
    <Background
      id="web-dot-grid"
      variant={BackgroundVariant.Dots}
      gap={20}
      size={1.2}
      color="currentColor"
      className="text-text-muted/30"
      style={{ opacity: reduceMotion ? 0.2 : 0.45 }}
    />
  );
}

function isUuidLike(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function useDebouncedPersist() {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  return useCallback((screenId: string, run: () => Promise<void>) => {
    const prev = timers.current.get(screenId);
    if (prev) clearTimeout(prev);
    const id = setTimeout(() => {
      timers.current.delete(screenId);
      void run();
    }, 800);
    timers.current.set(screenId, id);
  }, []);
}

function useHydrateWebProject(projectId: string) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const hydratePagesFromServer = useWebCanvasStore((s) => s.hydratePagesFromServer);
  const setCanvasProjectId = useWebCanvasStore((s) => s.setCanvasProjectId);

  const shouldFetch = Boolean(activeOrganizationId && isUuidLike(projectId));

  const q = useQuery({
    queryKey: ["canvas-web", activeOrganizationId, projectId],
    queryFn: () => getCanvasProject(getToken, activeOrganizationId, projectId),
    enabled: shouldFetch,
  });

  useEffect(() => {
    if (projectId === "new") setCanvasProjectId(null);
  }, [projectId, setCanvasProjectId]);

  useEffect(() => {
    if (!q.data?.screens?.length) return;
    hydratePagesFromServer(projectId, q.data.screens);
  }, [hydratePagesFromServer, projectId, q.data]);
}

function WebFlowBody({ projectId }: { projectId: string }) {
  useHydrateWebProject(projectId);
  const canvasProjectId = useWebCanvasStore((s) => s.canvasProjectId);
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const schedulePersist = useDebouncedPersist();

  const nodes = useWebCanvasStore((s) => s.nodes) as Node<WebBrowserNodeData>[];
  const edges = useWebCanvasStore((s) => s.edges) as Edge[];
  const setNodes = useWebCanvasStore((s) => s.setNodes);
  const setEdges = useWebCanvasStore((s) => s.setEdges);
  const onConnect = useWebCanvasStore((s) => s.onConnect);
  const toggleMarqueeMode = useWebCanvasStore((s) => s.toggleMarqueeMode);
  const marqueeMode = useWebCanvasStore((s) => s.marqueeMode);

  const onNodeDragStop = useCallback(
    (_evt: unknown, node: Node<WebBrowserNodeData>) => {
      const pid = canvasProjectId;
      if (!pid || !isUuidLike(pid)) return;
      schedulePersist(node.id, async () => {
        await patchCanvasScreen(getToken, activeOrganizationId, pid, node.id, {
          position_x: String(Math.round(node.position.x * 100) / 100),
          position_y: String(Math.round(node.position.y * 100) / 100),
        });
      });
    },
    [activeOrganizationId, canvasProjectId, getToken, schedulePersist],
  );

  const onNodesChange = useCallback(
    (ch: NodeChange<Node<WebBrowserNodeData>>[]) => {
      setNodes((prev) => applyNodeChanges(ch, prev) as Node<WebBrowserNodeData>[]);
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (ch: EdgeChange[]) => {
      setEdges((prev) => applyEdgeChanges(ch, prev as Edge[]));
    },
    [setEdges],
  );

  const nodeTypes = useMemo(
    () => ({
      browserFrame: BrowserFrameNode,
    }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isKeyEventFromEditableTarget(e.target)) return;
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMarqueeMode();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleMarqueeMode]);

  return (
    <div className="relative h-full min-h-[min(100dvh,920px)] w-full">
      <ReactFlow
        className={cn("!bg-bg", marqueeMode && "cursor-crosshair")}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        minZoom={0.25}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        translateExtent={EXTENT}
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        panOnScrollSpeed={0.5}
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick
        zoomActivationKeyCode={["Meta", "Control"]}
        panActivationKeyCode="Space"
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
        fitView
        fitViewOptions={{ padding: 0.25, minZoom: 0.25, maxZoom: 4, duration: 0 }}
        nodesDraggable
        elementsSelectable
        connectOnClick={false}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Meta", "Control"]}
      >
        <DotGridBackground />
        <Panel position="top-center" className="!m-0 !mt-3 !max-w-[100vw] px-1">
          <WebCanvasToolbar />
        </Panel>
        <Panel position="top-right" className="!m-0 !mt-3 !mr-3">
          <WebCanvasTweaks />
        </Panel>
        <MiniMap
          className="!bottom-3 !right-3 !z-10 rounded-lg border border-border bg-surface/90"
          pannable
          zoomable
          maskColor="color-mix(in oklch, var(--fg-strong) 10%, transparent)"
        />
        <ZoomReadout />
        <WebCanvasPendingFocus />
      </ReactFlow>
    </div>
  );
}

/**
 * Web / website workflow: multi-breakpoint browser frames on an infinite canvas (V2 P-03).
 * @param projectId — UUID loads `/canvas/projects/{id}`; `new` keeps local demo seed; `legacy` for older routes without a slug.
 */
export function WebCanvas({ projectId = "legacy" }: { projectId?: string }) {
  return (
    <ReactFlowProvider>
      <WebFlowBody projectId={projectId} />
    </ReactFlowProvider>
  );
}
