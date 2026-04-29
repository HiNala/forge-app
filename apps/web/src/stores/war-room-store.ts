import { create } from "zustand";
import type { ForgeFourLayerPayload } from "@/lib/forge-four-layer";
import type { NextMove } from "@/lib/next-move-engine";

export type WarRoomStage = "idea" | "system" | "design" | "build" | "grow";

export type OrchestrationPaneHint = "strategy" | "canvas" | "system" | "idle";

export type WarRoomCanvasView = "design" | "flow" | "system" | "heatmap" | "logic";

export type WarRoomState = {
  projectId: string | null;
  stage: WarRoomStage;
  fourLayer: ForgeFourLayerPayload | null;
  primaryGoalDraft: string;
  primaryGoalDirty: boolean;
  streamPhase: OrchestrationPaneHint;
  simulateMode: boolean;
  canvasView: WarRoomCanvasView;
  nextMoveActive: NextMove | null;
  systemTab: "data" | "states" | "logic" | "money";
  dismissedHintIds: string[];
  hydrateFromGeneration: (payload: {
    fourLayer?: ForgeFourLayerPayload | null;
    primaryGoal?: string | null;
  }) => void;
  setStage: (s: WarRoomStage) => void;
  setPrimaryGoalDraft: (g: string) => void;
  clearPrimaryGoalDirty: () => void;
  setStreamPhase: (p: OrchestrationPaneHint) => void;
  setSimulateMode: (v: boolean) => void;
  setCanvasView: (v: WarRoomCanvasView) => void;
  setNextMove: (m: NextMove | null) => void;
  setSystemTab: (t: "data" | "states" | "logic" | "money") => void;
  dismissHint: (id: string) => void;
  setProjectId: (id: string | null) => void;
};

export const useWarRoomStore = create<WarRoomState>((set) => ({
  projectId: null,
  stage: "design",
  fourLayer: null,
  primaryGoalDraft: "",
  primaryGoalDirty: false,
  streamPhase: "idle",
  simulateMode: false,
  canvasView: "design",
  nextMoveActive: null,
  systemTab: "data",
  dismissedHintIds: [],
  hydrateFromGeneration: ({ fourLayer, primaryGoal }) =>
    set((s) => ({
      fourLayer: fourLayer ?? s.fourLayer,
      primaryGoalDraft: primaryGoal != null ? primaryGoal : s.primaryGoalDraft,
      primaryGoalDirty: false,
    })),
  setStage: (stage) => set({ stage }),
  setPrimaryGoalDraft: (primaryGoalDraft) => set({ primaryGoalDraft, primaryGoalDirty: true }),
  clearPrimaryGoalDirty: () => set({ primaryGoalDirty: false }),
  setStreamPhase: (streamPhase) => set({ streamPhase }),
  setSimulateMode: (simulateMode) => set({ simulateMode }),
  setCanvasView: (canvasView) => set({ canvasView }),
  setNextMove: (nextMoveActive) => set({ nextMoveActive }),
  setSystemTab: (systemTab) => set({ systemTab }),
  dismissHint: (id) =>
    set((st) =>
      st.dismissedHintIds.includes(id) ? st : { dismissedHintIds: [...st.dismissedHintIds, id] },
    ),
  setProjectId: (projectId) => set({ projectId }),
}));
