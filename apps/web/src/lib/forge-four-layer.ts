/** BP-01 four-layer output (API + Studio). */

export type ForgeFourLayerPayload = {
  layer1_reasoning?: string;
  layer2_design_spec_json?: Record<string, unknown>;
  layer3_code?: Record<string, unknown>;
  layer4_suggestions?: string[];
  /** Why outputs look this way — human-readable bullets from persisted design memory (BP-02). */
  memory_why?: string[];
};

/** GD-02 aesthetic alias; wire format remains unchanged for API compatibility. */
export type GlideDesignFourLayerPayload = ForgeFourLayerPayload;
