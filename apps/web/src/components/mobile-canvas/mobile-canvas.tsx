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
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { getCanvasProject, patchCanvasScreen } from "@/lib/canvas-api";
import { useForgeSession } from "@/providers/session-provider";
import { useMobileCanvasStore } from "./mobile-canvas-store";
import { MobileCanvasToolbar } from "./mobile-canvas-toolbar";
import { MobileCanvasTweaks } from "./mobile-canvas-tweaks";
import { PhoneScreenNode } from "./phone-screen-node";
import type { MobilePhoneNodeData } from "./types";
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

function DotGridBackground() {
  const z = useStore((s) => s.transform[2]);
  const reduceMotion = usePrefersReducedMotion();
  if (z < 0.5) {
    return null;
  }
  return (
    <Background
      id="mobile-dot-grid"
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

function useHydrateMobileProject(projectId: string) {
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const hydrate = useMobileCanvasStore((s) => s.hydrateScreensFromServer);
  const setCanvasProjectId = useMobileCanvasStore((s) => s.setCanvasProjectId);

  const shouldFetch = Boolean(activeOrganizationId && isUuidLike(projectId));

  const q = useQuery({
    queryKey: ["canvas-mobile", activeOrganizationId, projectId],
    queryFn: () => getCanvasProject(getToken, activeOrganizationId, projectId),
    enabled: shouldFetch,
  });

  useEffect(() => {
    if (projectId === "new") setCanvasProjectId(null);
  }, [projectId, setCanvasProjectId]);

  useEffect(() => {
    if (!q.data?.screens?.length) return;
    hydrate(projectId, q.data.screens);
  }, [hydrate, projectId, q.data]);
}

function MobileFlowBody({ projectId }: { projectId: string }) {
  useHydrateMobileProject(projectId);
  const canvasProjectId = useMobileCanvasStore((s) => s.canvasProjectId);
  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const schedulePersist = useDebouncedPersist();

  const nodes = useMobileCanvasStore((s) => s.nodes) as Node<MobilePhoneNodeData>[];
  const edges = useMobileCanvasStore((s) => s.edges) as Edge[];
  const setNodes = useMobileCanvasStore((s) => s.setNodes);
  const setEdges = useMobileCanvasStore((s) => s.setEdges);
  const onConnect = useMobileCanvasStore((s) => s.onConnect);
  const toggleMarqueeMode = useMobileCanvasStore((s) => s.toggleMarqueeMode);
  const marqueeMode = useMobileCanvasStore((s) => s.marqueeMode);

  const onNodeDragStop = useCallback(
    (_evt: unknown, node: Node<MobilePhoneNodeData>) => {
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
    (ch: NodeChange<Node<MobilePhoneNodeData>>[]) => {
      setNodes((prev) => applyNodeChanges(ch, prev) as Node<MobilePhoneNodeData>[]);
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
      phoneScreen: PhoneScreenNode,
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
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        minZoom={0.25}
        maxZoom={4}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
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
        fitViewOptions={{ padding: 0.2, minZoom: 0.25, maxZoom: 4, duration: 0 }}
        nodesDraggable
        elementsSelectable
        connectOnClick={false}
        deleteKeyCode={["Backspace", "Delete"]}
        selectionKeyCode="Shift"
        multiSelectionKeyCode={["Meta", "Control"]}
      >
        <DotGridBackground />
        <Panel position="top-center" className="!m-0 !mt-3">
          <MobileCanvasToolbar />
        </Panel>
        <Panel position="top-right" className="!m-0 !mt-3 !mr-3">
          <MobileCanvasTweaks />
        </Panel>
        <MiniMap
          className="!bottom-3 !right-3 !z-10 rounded-lg border border-border bg-surface/90"
          pannable
          zoomable
          maskColor="color-mix(in oklch, var(--fg-strong) 10%, transparent)"
        />
        <ZoomReadout />
      </ReactFlow>
    </div>
  );
}

/**
 * @param projectId — UUID loads `/canvas/projects/{id}`; `new` keeps local demo seed; `'legacy'` for older routes without a slug.
 */
export function MobileCanvas({ projectId = "legacy" }: { projectId?: string }) {
  return (
    <ReactFlowProvider>
      <MobileFlowBody projectId={projectId} />
    </ReactFlowProvider>
  );
}
