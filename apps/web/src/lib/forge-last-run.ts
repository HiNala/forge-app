/** Last completed Studio orchestration run id (for canvas feedback strips, etc.). */

export const FORGE_ORCHESTRATION_RUN_EVENT = "forge-orchestration-run";

export function rememberLastOrchestrationRunId(runId: string): void {
  if (typeof window === "undefined" || !runId) return;
  try {
    sessionStorage.setItem("forge:lastOrchestrationRunId", runId);
    window.dispatchEvent(
      new CustomEvent(FORGE_ORCHESTRATION_RUN_EVENT, { detail: { runId } }),
    );
  } catch {
    // quota / private mode
  }
}

export function readLastOrchestrationRunId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("forge:lastOrchestrationRunId");
  } catch {
    return null;
  }
}
