"use client";

import * as React from "react";
import { FORGE_ORCHESTRATION_RUN_EVENT, readLastOrchestrationRunId } from "@/lib/forge-last-run";

/** Subscribes to {@link rememberLastOrchestrationRunId} + sessionStorage seed (same tab). */
export function useLastOrchestrationRunId(): string | null {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      function onEvt() {
        onStoreChange();
      }
      window.addEventListener(FORGE_ORCHESTRATION_RUN_EVENT, onEvt as EventListener);
      return () => window.removeEventListener(FORGE_ORCHESTRATION_RUN_EVENT, onEvt as EventListener);
    },
    () => readLastOrchestrationRunId(),
    () => null,
  );
}
