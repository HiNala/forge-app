/**
 * Typed client for `/canvas/*` — AL-03 canvas persistence.
 */
import { apiRequest } from "@/lib/api";

export type CanvasProjectKind = "mobile_app" | "website";

export type CanvasFlowOut = {
  id: string;
  from_screen_id: string;
  to_screen_id: string;
  trigger_label: string | null;
};

export type CanvasScreenOut = {
  id: string;
  project_id: string;
  name: string;
  slug: string;
  screen_type: string | null;
  position_x: string;
  position_y: string;
  html: string;
  component_tree: Record<string, unknown> | null;
  thumbnail_url: string | null;
  sort_order: number;
};

export type CanvasProjectOut = {
  id: string;
  organization_id: string;
  page_id: string | null;
  kind: CanvasProjectKind;
  title: string;
  intent_json: Record<string, unknown>;
  brand_snapshot?: Record<string, unknown> | null;
  design_tokens?: Record<string, unknown> | null;
  navigation_config?: Record<string, unknown> | null;
  viewport_config?: Record<string, unknown> | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CanvasProjectDetail = {
  project: CanvasProjectOut;
  screens: CanvasScreenOut[];
  flows: CanvasFlowOut[];
};

export async function getCanvasProject(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  projectId: string,
): Promise<CanvasProjectDetail> {
  return apiRequest<CanvasProjectDetail>(`/canvas/projects/${projectId}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export type CanvasScreenPatchBody = {
  name?: string;
  html?: string;
  component_tree?: Record<string, unknown> | null;
  position_x?: string;
  position_y?: string;
  sort_order?: number;
};

export async function patchCanvasScreen(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  projectId: string,
  screenId: string,
  body: CanvasScreenPatchBody,
): Promise<CanvasScreenOut> {
  return apiRequest<CanvasScreenOut>(`/canvas/projects/${projectId}/screens/${screenId}`, {
    method: "PATCH",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export type CanvasRefineOut = {
  screen_id: string;
  revision: number;
  html: string;
  message: string;
};

export async function refineCanvasScreen(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  projectId: string,
  screenId: string,
  body: { prompt: string; scope?: "element" | "region" | "screen"; element_ref?: string | null },
): Promise<CanvasRefineOut> {
  return apiRequest<CanvasRefineOut>(`/canvas/projects/${projectId}/screens/${screenId}/refine`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({
      prompt: body.prompt,
      scope: body.scope ?? "screen",
      element_ref: body.element_ref ?? null,
    }),
  });
}

export type CanvasProjectCreateBody = {
  kind: CanvasProjectKind;
  title: string;
  prompt: string;
  intent?: Record<string, unknown> | null;
};

export async function createCanvasProject(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: CanvasProjectCreateBody,
): Promise<CanvasProjectDetail> {
  return apiRequest<CanvasProjectDetail>("/canvas/projects", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}
