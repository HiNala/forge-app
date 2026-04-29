/** Map BP-01 `orchestration.phase` agent to War Room pane focus indicators. */

import type { OrchestrationPaneHint } from "@/stores/war-room-store";

export function orchestrationAgentToPane(agent: string): OrchestrationPaneHint {
  switch (agent) {
    case "intent":
    case "strategy":
      return "strategy";
    case "system":
      return "system";
    default:
      return "canvas";
  }
}
