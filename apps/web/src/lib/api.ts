/**
 * Typed API client: Bearer GlideDesign JWT + active organization header.
 * Backend tenant header: `x-forge-active-org-id` (see apps/api/app/deps/tenant.py).
 */
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-url";

export const FORGE_ACTIVE_ORG_HEADER = "x-forge-active-org-id";
export {
  getAnalyticsTrackUrl,
  getApiUrl,
  getPublicPageApiUrl,
  normalizeApiOrigin,
} from "@/lib/api-url";

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
  is_platform_admin?: boolean;
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
  /** GlideDesign organization UUID; omit only for /auth/me first load. */
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

/** Create a fetch with timeout using AbortController (default 30s). */
function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 30000, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...rest, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
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

  const res = await fetchWithTimeout(
    `${getApiUrl()}${path.startsWith("/") ? path : `/${path}`}`,
    {
      ...init,
      headers: h,
    },
  );

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
    toast.error("Plan limit reached. Raise limits under Settings → Billing.");
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

export async function postVerifyEmail(token: string): Promise<{ ok: boolean; user_id: string }> {
  const res = await fetchWithTimeout(`${getApiUrl()}/auth/email/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = typeof json?.detail === "string" ? json.detail : "Email verification failed";
    throw new ApiError(message, res.status, json);
  }
  return json as { ok: boolean; user_id: string };
}

export async function postResendEmailVerification(
  getToken: () => Promise<string | null>,
): Promise<{ ok: boolean; sent: boolean; already_verified: boolean }> {
  return apiRequest("/auth/email/verification/resend", {
    method: "POST",
    getToken,
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
  body: {
    onboarded_for_workflow?:
      | "contact-form"
      | "proposal"
      | "pitch_deck"
      | "mobile_app"
      | "website"
      | "landing_page"
      | "undecided"
      | null;
    sidebar_collapsed?: boolean;
    dashboard_tip_dismissed?: boolean;
    notification_daily_automation_digest?: boolean;
    notification_weekly_submissions?: boolean;
    notification_product_updates?: boolean;
    workspace_timezone?: string | null;
    forge_apply_memory?: boolean;
    forge_memory_share_across_orgs?: boolean;
    forge_contribute_feedback_to_platform?: boolean;
    forge_weekly_learning_digest?: boolean;
    studio_war_room_layout?: boolean;
    forge_auto_improve?: boolean;
    credit_confirm_threshold_cents?: number;
    credit_confirm_skip_under_credits?: number;
    credit_estimate_display?: "always" | "big_only" | "never";
    credit_post_action_toast?: "always" | "big_only" | "never";
    studio_concurrency_behavior?: "queue" | "reject";
  },
): Promise<{ ok: boolean }> {
  return apiRequest("/auth/me/preferences", {
    method: "PATCH",
    getToken,
    body: JSON.stringify(body),
  });
}

export async function postAuthSignOut(
  getToken: () => Promise<string | null>,
): Promise<{ ok: boolean }> {
  return apiRequest("/auth/signout", {
    method: "POST",
    getToken,
    activeOrgId: null,
  });
}

export async function postCreateWorkspace(
  getToken: () => Promise<string | null>,
  body: { name: string },
): Promise<{ id: string; name: string; slug: string; plan: string }> {
  return apiRequest("/org/workspaces", {
    method: "POST",
    getToken,
    activeOrgId: null,
    body: JSON.stringify(body),
  });
}

export type OrganizationOut = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  trial_ends_at: string | null;
  deleted_at: string | null;
  scheduled_purge_at: string | null;
};

export async function getOrg(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<OrganizationOut> {
  return apiRequest<OrganizationOut>("/org", {
    method: "GET",
    getToken,
    activeOrgId,
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

/** W-01 — availability calendars for booking slots on live pages. */
export type AvailabilityCalendarOut = {
  id: string;
  organization_id: string;
  name: string;
  source_type: string;
  source_ref: string | null;
  timezone: string;
  business_hours: Record<string, unknown>;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  min_notice_minutes: number;
  max_advance_days: number;
  slot_duration_minutes: number;
  slot_increment_minutes: number;
  all_day_events_block: boolean;
  metadata: Record<string, unknown> | null;
  last_synced_at: string | null;
  last_sync_summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export async function listAvailabilityCalendars(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<AvailabilityCalendarOut[]> {
  return apiRequest<AvailabilityCalendarOut[]>("/availability-calendars", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function createAvailabilityCalendar(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: { name: string; source_type: "ics_file" | "ics_url" | "google"; source_ref?: string | null; timezone?: string },
): Promise<AvailabilityCalendarOut> {
  return apiRequest<AvailabilityCalendarOut>("/availability-calendars", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function patchAvailabilityCalendar(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  calendarId: string,
  body: Record<string, unknown>,
): Promise<AvailabilityCalendarOut> {
  return apiRequest<AvailabilityCalendarOut>(`/availability-calendars/${calendarId}`, {
    method: "PATCH",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function previewAvailabilityIcs(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  file: File,
): Promise<{
  event_count: number;
  busy_block_count: number;
  recurrence_expansions: number;
  warnings: string[];
  duration_ms: number;
  business_hours_suggested: Record<string, unknown>;
}> {
  const form = new FormData();
  form.append("file", file);
  const token = await getToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  if (activeOrgId) {
    h.set(FORGE_ACTIVE_ORG_HEADER, activeOrgId);
  }
  const res = await fetchWithTimeout(`${getApiUrl()}/availability-calendars/preview-ics`, {
    method: "POST",
    body: form,
    headers: h,
  });
  const ct = res.headers.get("content-type") ?? "";
  const json = ct.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiError(typeof json?.detail === "string" ? json.detail : "Preview failed", res.status, json);
  }
  return json as {
    event_count: number;
    busy_block_count: number;
    recurrence_expansions: number;
    warnings: string[];
    duration_ms: number;
    business_hours_suggested: Record<string, unknown>;
  };
}

export async function uploadAvailabilityCalendarIcs(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  calendarId: string,
  file: File,
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("file", file);
  const token = await getToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401);
  }
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  if (activeOrgId) {
    h.set(FORGE_ACTIVE_ORG_HEADER, activeOrgId);
  }
  const res = await fetchWithTimeout(`${getApiUrl()}/availability-calendars/${calendarId}/upload-ics`, {
    method: "POST",
    body: form,
    headers: h,
  });
  const ct = res.headers.get("content-type") ?? "";
  const json = ct.includes("application/json") ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    throw new ApiError(typeof json?.detail === "string" ? json.detail : "Upload failed", res.status, json);
  }
  return json as Record<string, unknown>;
}

export async function deleteOrg(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<OrganizationOut> {
  return apiRequest<OrganizationOut>("/org", {
    method: "DELETE",
    getToken,
    activeOrgId,
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
  const res = await fetchWithTimeout(`${getApiUrl()}/org/brand/logo`, { method: "POST", headers: h, body: fd });
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
  body: {
    email?: string;
    emails?: string;
    role: "owner" | "editor" | "viewer";
  },
): Promise<{ invitation_ids: string[] }> {
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

export type InvitationPendingOut = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
  invited_by_email: string | null;
};

export async function getPendingInvitations(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<InvitationPendingOut[]> {
  return apiRequest<InvitationPendingOut[]>("/team/invitations/pending", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function cancelTeamInvitation(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  invitationId: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/team/invitations/${invitationId}`, {
    method: "DELETE",
    getToken,
    activeOrgId,
  });
}

export async function postTransferOwnership(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  targetMembershipId: string,
): Promise<MemberOut> {
  return apiRequest<MemberOut>("/team/transfer-ownership", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({ target_membership_id: targetMembershipId }),
  });
}

/** Range: 7d | 30d | 90d */
export async function getPageAnalyticsSummary(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  range: "7d" | "30d" | "90d",
): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ range });
  return apiRequest(`/pages/${pageId}/analytics/summary?${q}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function getPageAnalyticsFunnel(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  range: "7d" | "30d" | "90d",
): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ range });
  return apiRequest(`/pages/${pageId}/analytics/funnel?${q}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function getPageAnalyticsEngagement(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  range: "7d" | "30d" | "90d",
): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ range });
  return apiRequest(`/pages/${pageId}/analytics/engagement?${q}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function getOrgAnalyticsSummary(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  range: "7d" | "30d" | "90d",
): Promise<Record<string, unknown>> {
  const q = new URLSearchParams({ range });
  return apiRequest(`/analytics/summary?${q}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export type BillingPlanOut = {
  plan: string;
  currency?: string;
  status: string | null;
  trial_ends_at: string | null;
  next_invoice_at: string | null;
  payment_method_last4: string | null;
  payment_failed_at: string | null;
};

export type BillingUsageOut = {
  pages_generated: number;
  pages_quota: number;
  submissions_received: number;
  submissions_quota: number;
  tokens_prompt: number;
  tokens_completion: number;
  period_start: string;
  period_end: string;
  /** Generation credits — rolling session (5 h) and week (7 d); see PRICING_MODEL */
  credits_tier: string;
  credits_session_used: number;
  credits_session_cap: number;
  credits_session_percent: number;
  credits_week_used: number;
  credits_week_cap: number;
  credits_week_percent: number;
  credits_session_resets_at: string | null;
  credits_week_resets_at: string | null;
  extra_usage_enabled: boolean;
  extra_usage_monthly_cap_cents: number | null;
  extra_usage_spent_period_cents: number;
};

export async function getBillingPlan(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<BillingPlanOut> {
  return apiRequest<BillingPlanOut>("/billing/plan", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function getBillingUsage(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<BillingUsageOut> {
  return apiRequest<BillingUsageOut>("/billing/usage", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function postBillingCheckout(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  plan: "starter" | "pro" | "max_5x" | "max_20x",
  billingInterval: "monthly" | "annual" = "monthly",
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/billing/checkout", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({ plan, billing_interval: billingInterval }),
  });
}

export async function postBillingPortal(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<{ url: string }> {
  return apiRequest<{ url: string }>("/billing/portal", {
    method: "POST",
    getToken,
    activeOrgId,
  });
}

/** Latest non-dismissed row from `plan_recommendations`, or null. */
export type PlanRecommendationPayload = {
  id: string;
  current_plan: string;
  recommended_plan: string;
  savings_cents: number;
  reasoning: string;
  currency: string;
  generated_at: string;
};

export async function getBillingPlanRecommendation(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<{ recommendation: PlanRecommendationPayload | null }> {
  return apiRequest<{ recommendation: PlanRecommendationPayload | null }>("/billing/plan-recommendation", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function postDismissPlanRecommendation(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  recommendationId: string,
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/billing/plan-recommendation/dismiss", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({ recommendation_id: recommendationId }),
  });
}

export type InvoiceRow = {
  id: string;
  created: number;
  amount_due: number;
  currency: string;
  status: string | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
};

export async function getBillingInvoices(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<{ items: InvoiceRow[] }> {
  return apiRequest<{ items: InvoiceRow[] }>("/billing/invoices", {
    method: "GET",
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
  /** Set when a screenshot job has run (Mission FE-05). */
  preview_image_url?: string | null;
};

/** From GET `/pages/{id}` — includes generated HTML for preview. */
export type PageDetailOut = PageOut & {
  current_html: string;
  form_schema: Record<string, unknown> | null;
  intent_json: Record<string, unknown> | null;
  brand_kit_snapshot: Record<string, unknown> | null;
  last_review_quality_score?: number | null;
  last_review_report?: Record<string, unknown> | null;
  review_degraded_quality?: boolean | null;
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

/** Curated global templates (Mission 09) — browse without an active org. */
export type TemplateListItemOut = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  preview_image_url: string | null;
  sort_order: number;
  /** From template intent_json.page_type (P-06) */
  page_type: string | null;
  /** intent_json.migrate_from — P-08 cohort tags */
  migrate_from?: string[];
};

export async function listTemplates(
  getToken: () => Promise<string | null>,
  options?: { q?: string; category?: string; fromTool?: string },
): Promise<TemplateListItemOut[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set("q", options.q);
  if (options?.category) params.set("category", options.category);
  if (options?.fromTool) params.set("from_tool", options.fromTool);
  const qs = params.toString();
  return apiRequest<TemplateListItemOut[]>(`/templates${qs ? `?${qs}` : ""}`, {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export type TemplateDetailOut = TemplateListItemOut & {
  html: string;
  form_schema: Record<string, unknown> | null;
  intent_json: Record<string, unknown> | null;
  updated_at: string;
};

export async function getTemplateDetail(
  getToken: () => Promise<string | null>,
  templateId: string,
): Promise<TemplateDetailOut> {
  return apiRequest<TemplateDetailOut>(`/templates/${templateId}`, {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export async function postTemplateUse(
  getToken: () => Promise<string | null>,
  activeOrgId: string,
  templateId: string,
): Promise<{ page_id: string; studio_path: string }> {
  return apiRequest(`/templates/${templateId}/use`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({}),
  });
}

export type PublicTemplateOut = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  preview_image_url: string | null;
  html: string;
};

export async function getPublicTemplateBySlug(slug: string): Promise<PublicTemplateOut> {
  const res = await fetchWithTimeout(`${getApiUrl()}/public/templates/by-slug/${encodeURIComponent(slug)}`);
  const json = res.headers.get("content-type")?.includes("application/json")
    ? await res.json().catch(() => null)
    : null;
  if (!res.ok) {
    throw new ApiError(res.statusText || "Request failed", res.status, json);
  }
  return json as PublicTemplateOut;
}

export async function listPublicTemplateSlugs(): Promise<string[]> {
  const res = await fetchWithTimeout(`${getApiUrl()}/public/templates/slugs`);
  const json = res.headers.get("content-type")?.includes("application/json")
    ? await res.json().catch(() => null)
    : null;
  if (!res.ok) {
    throw new ApiError(res.statusText || "Request failed", res.status, json);
  }
  return (json as { slugs: string[] }).slugs;
}

/** GL-02 — platform admin session (no `x-forge-active-org-id`; permissions from platform RBAC). */
export type PlatformSession = {
  user_id: string;
  permissions: string[];
  platform_roles: string[];
  legacy_is_admin: boolean;
};

export async function getPlatformSession(
  getToken: () => Promise<string | null>,
): Promise<PlatformSession> {
  return apiRequest<PlatformSession>("/admin/platform/session", {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export async function postPlatformVisit(getToken: () => Promise<string | null>): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/admin/platform/visit", {
    method: "POST",
    getToken,
    activeOrgId: null,
    body: JSON.stringify({}),
  });
}

export type AdminOverviewSummary = {
  totals: {
    users: number;
    organizations: number;
    active_users_7d: number;
    llm_cost_cents_today: number;
  };
  generated_at: string;
};

export async function getAdminOverviewSummary(
  getToken: () => Promise<string | null>,
): Promise<AdminOverviewSummary> {
  return apiRequest<AdminOverviewSummary>("/admin/overview/summary", {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export type AdminPlatformAnalytics = {
  window_days: number;
  users: { total: number; new_in_window: number };
  organizations: { total: number; by_plan: Record<string, number> };
  pages: { total: number; live: number };
  submissions_in_window: number;
  page_views_in_window: number;
  llm: { cost_cents_in_window: number; runs_in_window: number };
  generated_at: string;
};

export async function getAdminPlatformAnalytics(
  getToken: () => Promise<string | null>,
  days = 30,
): Promise<AdminPlatformAnalytics> {
  return apiRequest<AdminPlatformAnalytics>(`/admin/analytics/platform?days=${days}`, {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export type AdminLlmSummary = {
  window_days: number;
  total_cost_cents: number;
  run_count: number;
  runs_by_status: Record<string, number>;
};

export async function getAdminLlmSummary(
  getToken: () => Promise<string | null>,
  days = 30,
): Promise<AdminLlmSummary> {
  return apiRequest<AdminLlmSummary>(`/admin/llm/summary?days=${days}`, {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export type AdminOrganizationDetail = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  account_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id?: string | null;
  member_count: number;
  created_at: string | null;
  org_settings: Record<string, unknown>;
};

export async function getAdminOrganization(
  getToken: () => Promise<string | null>,
  orgId: string,
): Promise<AdminOrganizationDetail> {
  return apiRequest<AdminOrganizationDetail>(`/admin/organizations/${encodeURIComponent(orgId)}`, {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export type AdminOrganizationListItem = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  account_status: string;
  stripe_customer_id: string | null;
  member_count: number;
  created_at: string | null;
};

export type AdminUserListItem = {
  id: string;
  email: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string | null;
};

export async function listAdminUsers(
  getToken: () => Promise<string | null>,
  q?: string,
): Promise<{ items: AdminUserListItem[]; next_cursor: string | null }> {
  const qs = q ? `?limit=50&q=${encodeURIComponent(q)}` : "?limit=50";
  return apiRequest(`/admin/users${qs}`, {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export async function listAdminOrganizations(
  getToken: () => Promise<string | null>,
  q?: string,
): Promise<{ items: AdminOrganizationListItem[]; next_cursor: string | null }> {
  const qs = q ? `?limit=50&q=${encodeURIComponent(q)}` : "?limit=50";
  return apiRequest(`/admin/organizations${qs}`, {
    method: "GET",
    getToken,
    activeOrgId: null,
  });
}

export type AdminTemplateRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  preview_image_url: string | null;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function adminListTemplates(
  getToken: () => Promise<string | null>,
  activeOrgId: string,
): Promise<AdminTemplateRow[]> {
  return apiRequest<AdminTemplateRow[]>("/admin/templates", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export type OrchestrationQualityOut = {
  samples_with_review: number;
  avg_quality_score: number | null;
  avg_by_workflow: Record<string, number>;
  orchestration_runs_total: number;
};

export async function adminOrchestrationQuality(
  getToken: () => Promise<string | null>,
  activeOrgId: string,
): Promise<OrchestrationQualityOut> {
  return apiRequest<OrchestrationQualityOut>("/admin/orchestration-quality", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function adminRegenerateTemplatePreview(
  getToken: () => Promise<string | null>,
  activeOrgId: string,
  templateId: string,
): Promise<AdminTemplateRow> {
  return apiRequest<AdminTemplateRow>(`/admin/templates/${templateId}/regenerate-preview`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({}),
  });
}

export async function patchPage(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  body: {
    title?: string;
    slug?: string;
    status?: string;
    form_schema?: Record<string, unknown>;
    intent_json?: Record<string, unknown>;
  },
): Promise<PageOut> {
  return apiRequest<PageOut>(`/pages/${pageId}`, {
    method: "PATCH",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export type PublishOut = {
  ok: boolean;
  page_id: string;
  status: string;
  published_version_id: string;
  public_url: string;
};

export async function publishPage(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
): Promise<PublishOut> {
  return apiRequest<PublishOut>(`/pages/${pageId}/publish`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({}),
  });
}

export type StudioMessageOut = {
  id: string;
  role: string;
  content: string;
  created_at: string;
};

export type StudioConversationResponse = {
  page_id: string;
  conversation_id: string;
  messages: StudioMessageOut[];
};

export async function getStudioConversation(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
): Promise<StudioConversationResponse> {
  return apiRequest<StudioConversationResponse>(`/studio/conversations/${pageId}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export type StudioEstimateOut = {
  estimated_credits: number;
  estimated_cost_cents_hint: number | null;
  estimated_seconds: number;
  confidence: "low" | "medium" | "high";
};

export type StudioPresignOut = {
  url: string;
  storage_key: string;
  max_size_bytes: number;
};

export async function postStudioAttachmentPresign(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: { session_id?: string; filename: string; content_type: string },
): Promise<StudioPresignOut> {
  return apiRequest<StudioPresignOut>("/studio/attachments/presign", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({
      session_id: body.session_id ?? "default",
      filename: body.filename,
      content_type: body.content_type,
    }),
  });
}

export type StudioRegisterAttachmentOut = {
  id: string;
  storage_key: string;
};

export async function postStudioAttachmentRegister(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: {
    session_id?: string;
    storage_key: string;
    kind?: string;
    mime_type: string;
    width?: number | null;
    height?: number | null;
    description?: string | null;
  },
): Promise<StudioRegisterAttachmentOut> {
  return apiRequest<StudioRegisterAttachmentOut>("/studio/attachments/register", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({
      session_id: body.session_id ?? "default",
      storage_key: body.storage_key,
      kind: body.kind ?? "screenshot",
      mime_type: body.mime_type,
      width: body.width ?? null,
      height: body.height ?? null,
      description: body.description ?? null,
    }),
  });
}

export async function postStudioEstimate(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: {
    prompt: string;
    page_id?: string | null;
    forced_workflow?: string | null;
    provider?: "openai" | "anthropic" | "gemini";
    session_id?: string;
    vision_attachment_ids?: string[];
  },
): Promise<StudioEstimateOut> {
  return apiRequest<StudioEstimateOut>("/studio/estimate", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({
      prompt: body.prompt,
      page_id: body.page_id ?? null,
      forced_workflow: body.forced_workflow ?? null,
      provider: body.provider ?? "openai",
      session_id: body.session_id ?? "default",
      vision_attachment_ids: body.vision_attachment_ids ?? [],
    }),
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

export type AutomationRuleOut = {
  page_id: string;
  organization_id: string;
  notify_emails: string[];
  confirm_submitter: boolean;
  confirm_template_subject: string | null;
  confirm_template_body: string | null;
  calendar_sync_enabled: boolean;
  calendar_connection_id: string | null;
  calendar_event_duration_min: number;
  calendar_send_invite: boolean;
};

export type AutomationRunOut = {
  id: string;
  submission_id: string | null;
  step: string;
  status: string;
  error_message: string | null;
  result_json: Record<string, unknown> | null;
  ran_at: string;
};

export async function getPageAutomations(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
): Promise<AutomationRuleOut> {
  return apiRequest<AutomationRuleOut>(`/pages/${pageId}/automations`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function putPageAutomations(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  body: Partial<AutomationRuleOut>,
): Promise<AutomationRuleOut> {
  return apiRequest<AutomationRuleOut>(`/pages/${pageId}/automations`, {
    method: "PUT",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function getAutomationRuns(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
): Promise<AutomationRunOut[]> {
  return apiRequest<AutomationRunOut[]>(`/pages/${pageId}/automations/runs`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function postAutomationRunRetry(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  runId: string,
): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>(`/pages/${pageId}/automations/runs/${runId}/retry`, {
    method: "POST",
    getToken,
    activeOrgId,
  });
}

export type CalendarConnectionOut = {
  id: string;
  provider: string;
  calendar_id: string;
  calendar_name: string | null;
  connected_at: string;
  last_error: string | null;
};

export async function listCalendarConnections(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<CalendarConnectionOut[]> {
  return apiRequest<CalendarConnectionOut[]>("/calendar/connections", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function postGoogleCalendarConnect(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId?: string,
): Promise<{ authorize_url: string; state: string }> {
  return apiRequest<{ authorize_url: string; state: string }>("/calendar/connect/google", {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({ page_id: pageId ?? null }),
  });
}

/** Per-page count of submissions with status `new`. */
export async function getPageUnreadCounts(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<Record<string, number>> {
  return apiRequest<Record<string, number>>("/pages/unread-counts", {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export type SubmissionOut = {
  id: string;
  organization_id: string;
  page_id: string;
  page_version_id: string | null;
  payload: Record<string, unknown>;
  submitter_email: string | null;
  submitter_name: string | null;
  status: string;
  created_at: string;
};

export type SubmissionListOut = {
  items: SubmissionOut[];
  next_before: string | null;
};

export async function listPageSubmissions(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  opts?: {
    limit?: number;
    before?: string | null;
    status?: string | null;
    q?: string | null;
  },
): Promise<SubmissionListOut> {
  const p = new URLSearchParams();
  if (opts?.limit) p.set("limit", String(opts.limit));
  if (opts?.before) p.set("before", opts.before);
  if (opts?.status) p.set("status", opts.status);
  if (opts?.q) p.set("q", opts.q);
  const qs = p.toString();
  return apiRequest<SubmissionListOut>(`/pages/${pageId}/submissions${qs ? `?${qs}` : ""}`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function patchSubmission(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  submissionId: string,
  body: { status?: string },
): Promise<SubmissionOut> {
  return apiRequest<SubmissionOut>(`/submissions/${submissionId}`, {
    method: "PATCH",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function postSubmissionDraftReply(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  submissionId: string,
): Promise<{ subject: string; body: string }> {
  return apiRequest<{ subject: string; body: string }>(`/submissions/${submissionId}/draft-reply`, {
    method: "POST",
    getToken,
    activeOrgId,
  });
}

export async function postSubmissionReply(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  submissionId: string,
  body: { subject: string; body: string },
): Promise<{ ok: boolean; resend_message_id: string }> {
  return apiRequest(`/submissions/${submissionId}/reply`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export async function deleteSubmission(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  submissionId: string,
): Promise<void> {
  const token = await getToken();
  if (!token) throw new ApiError("Not authenticated", 401);
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  if (activeOrgId) h.set(FORGE_ACTIVE_ORG_HEADER, activeOrgId);
  const res = await fetchWithTimeout(`${getApiUrl()}/submissions/${submissionId}`, {
    method: "DELETE",
    headers: h,
  });
  if (res.status === 401 && typeof window !== "undefined") {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.assign(`/signin?next=${next}`);
    throw new ApiError("Unauthorized", 401);
  }
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(res.statusText || "Request failed", res.status, json);
  }
}

export async function duplicatePage(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
): Promise<PageOut> {
  return apiRequest(`/pages/${pageId}/duplicate`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({}),
  });
}

export async function revertPage(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  versionId: string,
): Promise<PageOut> {
  return apiRequest(`/pages/${pageId}/revert/${versionId}`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({}),
  });
}

export async function postDeckExport(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  format: "pptx" | "pdf" | "keynote" | "google_slides",
): Promise<{ status: string; format: string; message: string }> {
  return apiRequest(`/pages/${pageId}/deck/export`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify({ format }),
  });
}

function parseContentDispositionFilename(cd: string | null): string | null {
  if (!cd) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";\n]+)/i.exec(cd);
  if (!m?.[1]) return null;
  return decodeURIComponent(m[1].replace(/^"|"$/g, ""));
}

export async function exportSubmissionsCsv(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
  opts?: { status?: string | null; q?: string | null },
): Promise<{ blob: Blob; filename: string }> {
  const token = await getToken();
  if (!token) throw new ApiError("Not authenticated", 401);
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  if (activeOrgId) h.set(FORGE_ACTIVE_ORG_HEADER, activeOrgId);
  const p = new URLSearchParams();
  if (opts?.status) p.set("status", opts.status);
  if (opts?.q) p.set("q", opts.q);
  const qs = p.toString();
  const res = await fetchWithTimeout(`${getApiUrl()}/pages/${pageId}/submissions/export${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: h,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(res.statusText, res.status, json);
  }
  const fname = parseContentDispositionFilename(res.headers.get("content-disposition")) ?? `submissions-${pageId}.csv`;
  const blob = await res.blob();
  return { blob, filename: fname };
}

export async function exportPageHtml(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  pageId: string,
): Promise<{ blob: Blob; filename: string }> {
  const token = await getToken();
  if (!token) throw new ApiError("Not authenticated", 401);
  const h = new Headers();
  h.set("Authorization", `Bearer ${token}`);
  if (activeOrgId) h.set(FORGE_ACTIVE_ORG_HEADER, activeOrgId);
  const res = await fetchWithTimeout(`${getApiUrl()}/pages/${pageId}/export/html`, {
    method: "GET",
    headers: h,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new ApiError(res.statusText, res.status, json);
  }
  const fname = parseContentDispositionFilename(res.headers.get("content-disposition")) ?? `page-${pageId}.html`;
  const blob = await res.blob();
  return { blob, filename: fname };
}

export async function deleteCalendarConnection(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  connectionId: string,
): Promise<{ ok: boolean }> {
  return apiRequest(`/calendar/connections/${connectionId}`, {
    method: "DELETE",
    getToken,
    activeOrgId,
  });
}

export type FeedbackSubmitBody = {
  run_id: string;
  artifact_kind: "screen" | "slide" | "page" | "code_file" | "reasoning" | "suggestion";
  artifact_ref?: string;
  sentiment: "positive" | "negative" | "improvement_request";
  structured_reasons: string[];
  free_text?: string | null;
  action_taken?: string | null;
  preceded_refine_run_id?: string | null;
};

export async function postArtifactFeedback(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
  body: FeedbackSubmitBody,
): Promise<{ id: string; memory_writes: Record<string, unknown>[] }> {
  return apiRequest(`/feedback`, {
    method: "POST",
    getToken,
    activeOrgId,
    body: JSON.stringify(body),
  });
}

export type DesignMemoryRow = {
  id: string;
  kind: string;
  key: string;
  value: Record<string, unknown>;
  strength: number;
  updated_at: string | null;
};

export async function listDesignMemory(
  getToken: () => Promise<string | null>,
  activeOrgId: string | null,
): Promise<DesignMemoryRow[]> {
  return apiRequest(`/design-memory`, {
    method: "GET",
    getToken,
    activeOrgId,
  });
}

export async function resetDesignMemory(getToken: () => Promise<string | null>, activeOrgId: string | null) {
  return apiRequest<{ deleted: number }>(`/design-memory/reset`, {
    method: "POST",
    getToken,
    activeOrgId,
  });
}

export async function getAdminPatternsFeed(getToken: () => Promise<string | null>, days = 7) {
  return apiRequest<{ items: Record<string, unknown>[]; generated_at: string }>(
    `/admin/patterns/feed?days=${days}`,
    {
      method: "GET",
      getToken,
      activeOrgId: null,
    },
  );
}
