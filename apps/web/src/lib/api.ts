/**
 * Typed API client: Bearer Clerk JWT + Forge active-org header.
 * Backend tenant header: `x-forge-active-org-id` (see apps/api/app/deps/tenant.py).
 */
import { toast } from "sonner";

export const FORGE_ACTIVE_ORG_HEADER = "x-forge-active-org-id";

export function getApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return raw.replace(/\/?$/, "") + "/api/v1";
}

export type MembershipOut = {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: string;
};

export type UserOut = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type MeResponse = {
  user: UserOut;
  memberships: MembershipOut[];
  active_organization_id: string | null;
  active_role: string | null;
  preferences: Record<string, unknown> | null;
};

type ApiRequestOptions = RequestInit & {
  getToken: () => Promise<string | null>;
  /** Forge organization UUID; omit only for /auth/me first load. */
  activeOrgId?: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Low-level JSON request with auth + org headers. */
export async function apiRequest<T>(
  path: string,
  { getToken, activeOrgId, headers, ...init }: ApiRequestOptions,
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }

  const h = new Headers(headers);
  h.set("Authorization", `Bearer ${token}`);
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }
  if (activeOrgId) {
    h.set(FORGE_ACTIVE_ORG_HEADER, activeOrgId);
  }

  const res = await fetch(`${getApiUrl()}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers: h,
  });

  const ct = res.headers.get("content-type") ?? "";
  const json = ct.includes("application/json") ? await res.json().catch(() => null) : null;

  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(
      `${window.location.pathname}${window.location.search}`,
    );
    window.location.assign(`/signin?next=${next}`);
    throw new ApiError("Unauthorized", 401, json);
  }

  if (res.status === 402) {
    toast.error("Plan limit reached. Upgrade to keep going.");
    throw new ApiError("Payment required", 402, json);
  }

  if (res.status === 403) {
    toast.error("You don’t have access to that.");
    throw new ApiError("Forbidden", 403, json);
  }

  if (res.status === 429) {
    toast.warning("Too many requests — try again in a moment.");
    throw new ApiError("Too many requests", 429, json);
  }

  if (!res.ok) {
    throw new ApiError(res.statusText || "Request failed", res.status, json);
  }

  return json as T;
}

export async function getMe(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<MeResponse> {
  return apiRequest<MeResponse>("/auth/me", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function postSignup(
  getToken: () => Promise<string | null>,
  workspaceName: string,
): Promise<{ user_id: string; organization_id: string }> {
  return apiRequest("/auth/signup", {
    method: "POST",
    getToken,
    body: JSON.stringify({ workspace_name: workspaceName }),
  });
}

export async function postSwitchOrg(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  organizationId: string,
): Promise<{ ok: boolean; active_organization_id: string }> {
  return apiRequest("/auth/switch-org", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({ organization_id: organizationId }),
  });
}

export async function patchUserPreferences(
  getToken: () => Promise<string | null>,
  body: { sidebar_collapsed?: boolean },
): Promise<{ ok: boolean }> {
  return apiRequest("/auth/me/preferences", {
    method: "PATCH",
    getToken,
    body: JSON.stringify(body),
  });
}

export async function patchOrg(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: { name?: string; slug?: string },
): Promise<unknown> {
  return apiRequest("/org", {
    method: "PATCH",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export type BrandKitOut = {
  organization_id: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  display_font: string | null;
  body_font: string | null;
  voice_note: string | null;
};

export async function getBrand(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<BrandKitOut> {
  return apiRequest<BrandKitOut>("/org/brand", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function putBrand(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: {
    primary_color?: string | null;
    secondary_color?: string | null;
    display_font?: string | null;
    body_font?: string | null;
    voice_note?: string | null;
  },
): Promise<BrandKitOut> {
  return apiRequest<BrandKitOut>("/org/brand", {
    method: "PUT",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function postBrandLogo(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  file: File,
): Promise<{ logo_url: string }> {
  const token = await getToken();
  if (!token) throw new ApiError("Not authenticated", 401);
  const fd = new FormData();
  fd.set("file", file);
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  if (activeOrgId) h.set(FORGE_ACTIVE_ORG_HEADER, activeOrgId);
  const res = await fetch(`${getApiUrl()}/org/brand/logo`, { method: "POST", headers: h, body: fd });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.statusText, res.status, json);
  return json as { logo_url: string };
}

export type MemberOut = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
};

export async function getTeamMembers(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<MemberOut[]> {
  return apiRequest<MemberOut[]>("/team/members", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function postTeamInvite(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: { email: string; role: "owner" | "editor" | "viewer" },
): Promise<{ ok: boolean; invitation_id: string }> {
  return apiRequest("/team/invite", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function patchTeamMember(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  memberId: string,
  body: { role: "owner" | "editor" | "viewer" },
): Promise<MemberOut> {
  return apiRequest<MemberOut>(`/team/members/${memberId}`, {
    method: "PATCH",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function deleteTeamMember(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  memberId: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/team/members/${memberId}`, {
    method: "DELETE",
    getToken,
    activeOrgId,
  });
}

export type PageOut = {
  id: string;
  organization_id: string;
  slug: string;
  page_type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
};

/** From GET `/pages/{id}` — includes generated HTML for preview. */
export type PageDetailOut = PageOut & {
  current_html: string;
};

export async function listPages(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<PageOut[]> {
  return apiRequest<PageOut[]>("/pages", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function getPage(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
): Promise<PageDetailOut> {
  return apiRequest<PageDetailOut>(`/pages/${pageId}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export type StudioUsageOut = {
  plan: string;
  pages_generated: number;
  pages_quota: number;
  period_start: string;
  period_end: string;
  tokens_prompt: number;
  tokens_completion: number;
  cost_cents: number;
};

export async function getStudioUsage(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<StudioUsageOut> {
  return apiRequest<StudioUsageOut>("/studio/usage", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function getNotificationUnreadCount(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<{ count: number }> {
  try {
    return await apiRequest<{ count: number }>("/org/notifications/unread-count", {
      method: "GET",
      getToken,
      activeOrgId,
    });
  } catch {
    return { count: 0 };
  }
}
