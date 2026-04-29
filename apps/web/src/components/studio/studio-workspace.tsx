"use client";

import { useAuth, useUser } from "@/providers/forge-auth-provider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ImagePlus, Monitor, PanelsTopLeft, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { toast } from "sonner";
import { Virtuoso } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apiRequest,
  getBillingPlan,
  getBillingUsage,
  getPage,
  getStudioConversation,
  getStudioUsage,
  patchUserPreferences,
  postStudioAttachmentPresign,
  postStudioAttachmentRegister,
  postStudioEstimate,
  publishPage,
  type BillingUsageOut,
  type PageDetailOut,
  type StudioEstimateOut,
  type StudioUsageOut,
} from "@/lib/api";
import {
  CreditConfirmDialog,
  type CreditConfirmEstimate,
} from "@/components/billing/credit-confirm-dialog";
import { formatCurrency } from "@/lib/format/currency";
import { shouldShowCreditConfirm, type CreditConfirmPrefsLike } from "@/lib/credit-preaction";
import { debounce } from "@/lib/debounce";
import { MOTION_TRANSITIONS, SPRINGS } from "@/lib/motion";
import { SIDEBAR_AUTO_COLLAPSE_EVENT } from "@/lib/shell-events";
import { brand } from "@/lib/copy";
import {
  DEFAULT_REFINE_CHIPS,
  SECTION_EDIT_QUICK_CHIPS,
  STUDIO_PLACEHOLDERS,
  STUDIO_SECONDARY_CHIPS,
  resolveSurprisePrompt,
} from "@/lib/studio-content";
import { recordWorkflowPageCreated } from "@/lib/studio-workflow-usage";
import { StudioWorkflowGrid } from "@/components/studio/studio-workflow-grid";
import { estimatedCreditsForAction } from "@/lib/usage-credits";
import { timeOfDayGreeting } from "@/lib/studio-greeting";
import {
  ensureBridgeInFullDocument,
  parseSectionIds,
  wrapStudioPreviewHtml,
} from "@/lib/studio-preview-html";
import { createChunkBuffer } from "@/lib/studio-buffer";
import type { ForgeFourLayerPayload } from "@/lib/forge-four-layer";
import { streamStudioSse } from "@/lib/sse";
import { fireFirstPublishConfetti } from "@/lib/confetti";
import { rememberLastOrchestrationRunId } from "@/lib/forge-last-run";
import { slugifyPageTitle } from "@/lib/slugify-page";
import { useForgeSession } from "@/providers/session-provider";
import { useUIStore } from "@/stores/ui";
import { studioSessionKey, useStudioStore, type StudioChatMsg } from "@/stores/studio-store";
import { cn } from "@/lib/utils";
import { ForgeLogo } from "@/components/icons/logo";
import { StudioPageArtifactCard } from "@/components/studio/studio-page-artifact-card";
import { StudioPublishDialog } from "@/components/studio/studio-publish-dialog";
import { StudioSessionUsageStrip } from "@/components/usage/studio-session-usage-strip";

const TRANSITION_PANEL = { ...SPRINGS.soft };

const CELEBRATION_KEY = "forge:first-page-live-celebration";
const STUDIO_ATTACHMENT_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

type StudioPendingAttachment = {
  id: string;
  name: string;
  mimeType: string;
};

function inferSummary(page: PageDetailOut): string {
  const t = page.title || "Untitled";
  return `A ${page.page_type.replace("-", " ")} page — ${t}.`.slice(0, 140);
}

function DotPulse({ className }: { className?: string }) {
  return (
    <span className={cn("studio-dot-wave inline-flex gap-1.5", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-accent"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </span>
  );
}

export function StudioWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageIdFromUrl = searchParams.get("pageId");
  const promptPrefill = searchParams.get("prompt");
  const workflowFromUrl = searchParams.get("workflow");
  const { getToken } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { activeOrganizationId, activeOrg, me } = useForgeSession();
  const creditsUsageQ = useQuery({
    queryKey: ["billing-usage", activeOrganizationId],
    queryFn: () => getBillingUsage(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
    staleTime: 15_000,
  });
  const billingPlanQ = useQuery({
    queryKey: ["billing-plan", activeOrganizationId],
    queryFn: () => getBillingPlan(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId,
    staleTime: 60_000,
  });
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const firstName =
    user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "there";

  const [usage, setUsage] = React.useState<StudioUsageOut | null>(null);
  const [active, setActive] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [promptEmpty, setPromptEmpty] = React.useState("");
  const [placeholderIdx, setPlaceholderIdx] = React.useState(0);
  const [emptyFocused, setEmptyFocused] = React.useState(false);

  const [pageId, setPageId] = React.useState<string | null>(null);
  const [pageSlug, setPageSlug] = React.useState<string | null>(null);
  const [pageTitle, setPageTitle] = React.useState("");
  const [pageStatus, setPageStatus] = React.useState<string>("draft");
  const [, setPageType] = React.useState("landing");
  const [finalHtml, setFinalHtml] = React.useState<string | null>(null);
  const streamAccRef = React.useRef("");
  const [previewTick, setPreviewTick] = React.useState(0);

  const [streamPhase, setStreamPhase] = React.useState<"idle" | "intent" | "building">("idle");
  const [streamBanner, setStreamBanner] = React.useState<string | null>(null);
  /** BP-01 product orchestrator status line (agent phase / judge). */
  const [orchestrationStatus, setOrchestrationStatus] = React.useState<string | null>(null);
  const fourLayerAccRef = React.useRef<ForgeFourLayerPayload | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const reviewFindingBufferRef = React.useRef<StudioChatMsg[]>([]);
  const lastStreamRef = React.useRef<{ kind: "generate" | "refine"; payload: Record<string, unknown> } | null>(null);
  const lastGeneratePromptRef = React.useRef<string>("");
  const lastUserPromptRef = React.useRef<string>("");
  const workflowHintRef = React.useRef<string | null>(null);
  /** Next generate: API `forced_workflow` (kebab) from empty-state grid. */
  const pendingForcedWorkflowRef = React.useRef<string | null>(null);
  const urlWorkflowConsumedRef = React.useRef(false);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const [refineChips, setRefineChips] = React.useState<string[]>([...DEFAULT_REFINE_CHIPS]);

  const [editMode, setEditMode] = React.useState(false);
  const [hoverSection, setHoverSection] = React.useState<string | null>(null);
  const [hoverRect, setHoverRect] = React.useState<DOMRect | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editSectionId, setEditSectionId] = React.useState<string | null>(null);
  const [editPrompt, setEditPrompt] = React.useState("");
  const [editBusy, setEditBusy] = React.useState(false);
  const [editAnchor, setEditAnchor] = React.useState<{ top: number; left: number; width: number } | null>(null);
  const editInputRef = React.useRef<HTMLInputElement>(null);
  const undoRef = React.useRef<{ html: string } | null>(null);

  const [publishOpen, setPublishOpen] = React.useState(false);
  const [sectionFocusIdx, setSectionFocusIdx] = React.useState(0);
  const liveAnnounceRef = React.useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = React.useState("");
  /** BP-04 — provisional SSE running total credits for this streaming run. */
  const [streamingRunCredits, setStreamingRunCredits] = React.useState<number | null>(null);
  const [emptyEstimate, setEmptyEstimate] = React.useState<StudioEstimateOut | null>(null);
  const [creditConfirmOpen, setCreditConfirmOpen] = React.useState(false);
  const [creditConfirmEstimate, setCreditConfirmEstimate] = React.useState<CreditConfirmEstimate | null>(null);
  const pendingCreditRunRef = React.useRef<{ kind: "generate" | "refine"; body: Record<string, unknown>; userText: string } | null>(
    null,
  );
  const [pendingAttachments, setPendingAttachments] = React.useState<StudioPendingAttachment[]>([]);
  const [attachmentBusy, setAttachmentBusy] = React.useState(false);
  const emptyAttachmentInputRef = React.useRef<HTMLInputElement>(null);
  const chatAttachmentInputRef = React.useRef<HTMLInputElement>(null);

  const sk = studioSessionKey(pageId);
  const storeMessages = useStudioStore((s) => s.sessions[sk]?.messages ?? []);
  const storeDraft = useStudioStore((s) => s.sessions[sk]?.draftInput ?? "");
  const setMessagesStore = useStudioStore((s) => s.setMessages);
  const setDraftStore = useStudioStore((s) => s.setDraft);
  const bootstrapSession = useStudioStore((s) => s.bootstrapSession);

  const [chatInput, setChatInput] = React.useState(storeDraft);
  const debouncedPersistDraft = React.useMemo(
    () =>
      debounce((pid: string | null, text: string) => {
        setDraftStore(pid, text);
      }, 2000),
    [setDraftStore],
  );

  const debouncedPersistEmptyPrompt = React.useMemo(
    () =>
      debounce((text: string) => {
        setDraftStore(null, text);
      }, 2000),
    [setDraftStore],
  );

  React.useEffect(() => {
    setChatInput(storeDraft);
  }, [sk, storeDraft]);

  React.useEffect(() => {
    if (!activeOrganizationId) return;
    void getStudioUsage(getToken, activeOrganizationId).then(setUsage).catch(() => setUsage(null));
  }, [getToken, activeOrganizationId]);

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  React.useEffect(() => {
    if (!promptPrefill) return;
    try {
      setPromptEmpty(decodeURIComponent(promptPrefill));
    } catch {
      setPromptEmpty(promptPrefill);
    }
  }, [promptPrefill]);

  React.useEffect(() => {
    if (!workflowFromUrl || active) return;
    const map: Record<string, string> = {
      contact_form: "A contact form for my business — ",
      proposal: "A proposal for ",
      pitch_deck: "A pitch deck for ",
      mobile_app: "A mobile app screen for ",
      website: "A simple website for ",
      landing_page: "A one-page landing for ",
    };
    const wfKey = workflowFromUrl.replace(/-/g, "_");
    const prime = map[wfKey];
    if (prime) setPromptEmpty((prev) => prev || prime);
  }, [workflowFromUrl, active]);

  React.useEffect(() => {
    const raw = me?.preferences as Record<string, unknown> | undefined;
    if (raw?.credit_estimate_display === "never") {
      setEmptyEstimate(null);
      return;
    }
    if (active || busy || !promptEmpty.trim() || !activeOrganizationId) {
      setEmptyEstimate(null);
      return;
    }
    const wf = searchParams.get("workflow");
    const tid = window.setTimeout(() => {
      void postStudioEstimate(getToken, activeOrganizationId, {
        prompt: promptEmpty.slice(0, 8000),
        page_id: null,
        forced_workflow: wf && !urlWorkflowConsumedRef.current ? wf : null,
      })
        .then(setEmptyEstimate)
        .catch(() => setEmptyEstimate(null));
    }, 400);
    return () => clearTimeout(tid);
  }, [
    promptEmpty,
    active,
    busy,
    activeOrganizationId,
    getToken,
    searchParams,
    me?.preferences,
  ]);

  React.useEffect(() => {
    if (emptyFocused) return;
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % STUDIO_PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [emptyFocused]);

  React.useEffect(() => {
    return useStudioStore.persist.onFinishHydration(() => {
      const d = useStudioStore.getState().getSession(null).draftInput;
      if (d) setPromptEmpty((prev) => prev || d);
    });
  }, []);

  React.useEffect(() => {
    if (active) return;
    debouncedPersistEmptyPrompt(promptEmpty);
  }, [active, promptEmpty, debouncedPersistEmptyPrompt]);

  const applyIframeHtml = React.useCallback((docHtml: string) => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const origin = window.location.origin;
    const src =
      docHtml.trimStart().startsWith("<!") || docHtml.trimStart().startsWith("<html")
        ? ensureBridgeInFullDocument(docHtml, origin)
        : wrapStudioPreviewHtml(docHtml, { withBridge: true, origin });
    iframe.srcdoc = src;
    setPreviewTick((t) => t + 1);
  }, []);

  const applyIframeRef = React.useRef(applyIframeHtml);
  applyIframeRef.current = applyIframeHtml;
  const bufferRef = React.useRef(
    createChunkBuffer(60, (acc) => {
      streamAccRef.current = acc;
      applyIframeRef.current(acc);
    }),
  );

  React.useEffect(() => {
    if (active) {
      setSidebarCollapsed(true);
      window.dispatchEvent(new CustomEvent(SIDEBAR_AUTO_COLLAPSE_EVENT));
    }
  }, [active, setSidebarCollapsed]);

  /** Bootstrap from ?pageId= */
  React.useEffect(() => {
    if (!pageIdFromUrl || !activeOrganizationId) return;
    if (pageIdFromUrl === pageId) return;
    let cancelled = false;
    void (async () => {
      try {
        const p = await getPage(getToken, activeOrganizationId, pageIdFromUrl);
        if (cancelled) return;
        setPageId(p.id);
        setPageSlug(p.slug);
        setPageTitle(p.title);
        setPageStatus(p.status);
        setPageType(p.page_type);
        setFinalHtml(p.current_html);
        setActive(true);
        applyIframeHtml(p.current_html);
        try {
          const conv = await getStudioConversation(getToken, activeOrganizationId, p.id);
          if (cancelled) return;
          const existing = useStudioStore.getState().getSession(p.id).messages;
          if (existing.length === 0 && conv.messages.length > 0) {
            const mapped: StudioChatMsg[] = conv.messages.map((m) => ({
              id: m.id,
              role: m.role === "user" ? "user" : "assistant",
              text: m.content,
              kind: "plain",
            }));
            bootstrapSession(p.id, { messages: mapped, draftInput: useStudioStore.getState().getSession(p.id).draftInput });
          }
        } catch {
          /* optional */
        }
      } catch {
        toast.error("Could not load that page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageIdFromUrl, activeOrganizationId, getToken, pageId, applyIframeHtml, bootstrapSession]);

  React.useEffect(() => {
    if (!liveAnnounceRef.current) return;
    if (streamPhase === "idle" && !busy) return;
    let t = "Ready.";
    if (busy) {
      t = streamPhase === "intent" ? "Understanding what you need…" : "Building the page…";
      if (streamPhase === "building") t += " Sections streaming.";
    }
    liveAnnounceRef.current.textContent = t;
  }, [streamPhase, busy]);

  React.useEffect(() => {
    if (!editOpen) return;
    const t = setTimeout(() => editInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [editOpen]);

  /** Section bridge */
  React.useEffect(() => {
    function onMsg(ev: MessageEvent) {
      const d = ev.data as {
        forgeStudio?: boolean;
        type?: string;
        sectionId?: string;
        rect?: { top: number; left: number; width: number; height: number };
      };
      if (!d?.forgeStudio) return;
      if (!editMode) return;
      if (d.type === "forge-section-hover" && d.sectionId && d.rect && iframeRef.current) {
        setHoverSection(d.sectionId);
        const ir = iframeRef.current.getBoundingClientRect();
        setHoverRect(
          new DOMRect(ir.left + d.rect.left, ir.top + d.rect.top, d.rect.width, d.rect.height),
        );
      }
      if (d.type === "forge-section-leave") {
        setHoverSection(null);
        setHoverRect(null);
      }
      if (d.type === "forge-section-click" && d.sectionId && d.rect && iframeRef.current) {
        const ir = iframeRef.current.getBoundingClientRect();
        const top = ir.top + d.rect.top;
        const left = ir.left + d.rect.left;
        setEditAnchor({ top, left, width: d.rect.width });
        setEditSectionId(d.sectionId);
        setEditPrompt("");
        setEditOpen(true);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [editMode]);

  const sectionIds = React.useMemo(
    () => parseSectionIds(finalHtml ?? streamAccRef.current),
    // previewTick bumps when streaming updates without committing finalHtml
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
    [finalHtml, previewTick],
  );

  React.useEffect(() => {
    if (!editMode || sectionIds.length === 0) return;
    function onKey(e: KeyboardEvent) {
      if (editOpen) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setSectionFocusIdx((i) => (i + 1) % sectionIds.length);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSectionFocusIdx((i) => (i - 1 + sectionIds.length) % sectionIds.length);
      }
      if (e.key === "Enter" && sectionIds[sectionFocusIdx] && iframeRef.current) {
        e.preventDefault();
        const id = sectionIds[sectionFocusIdx]!;
        const ir = iframeRef.current.getBoundingClientRect();
        setEditAnchor({ top: ir.top + 72, left: ir.left + 24, width: Math.min(320, ir.width - 48) });
        setEditSectionId(id);
        setEditPrompt("");
        setEditOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, sectionIds, sectionFocusIdx, editOpen]);

  React.useEffect(() => {
    const name = sectionIds[sectionFocusIdx] ?? "";
    liveAnnounceRef.current?.setAttribute(
      "data-section-focus",
      editMode ? `Section focus: ${name}` : "",
    );
  }, [sectionIds, sectionFocusIdx, editMode]);

  React.useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (busy || (promptEmpty.trim() && !active) || (chatInput.trim() && active)) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [busy, promptEmpty, chatInput, active]);

  /** Comfort-save: draft is auto-persisted; flash confirmation on explicit ⌘S / Ctrl+S. */
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const inField = t?.closest("input, textarea, [contenteditable=true]");
      if (!active || !inField) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toast.success("Saved", {
          description: "Your draft is synced to this device.",
          duration: 2000,
          className: "font-body",
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  function abortSse() {
    abortRef.current?.abort();
    abortRef.current = null;
  }

  async function runGenerateOrRefine(kind: "generate" | "refine", body: Record<string, unknown>, userText: string) {
    if (!activeOrganizationId) {
      toast.error("No active workspace.");
      return;
    }
    abortSse();
    const ac = new AbortController();
    abortRef.current = ac;
    if (kind === "generate") {
      const wh = workflowHintRef.current;
      if (wh) {
        body = { ...body, forced_workflow: wh };
        workflowHintRef.current = null;
      }
      const forced = pendingForcedWorkflowRef.current;
      if (forced) {
        body = { ...body, forced_workflow: forced };
        pendingForcedWorkflowRef.current = null;
      }
      lastGeneratePromptRef.current = userText;
    }
    lastStreamRef.current = { kind, payload: body };
    setBusy(true);
    setStreamingRunCredits(0);
    setStreamBanner(null);
    setOrchestrationStatus(null);
    fourLayerAccRef.current = null;
    setStreamPhase("intent");
    setActive(true);

    if (kind === "generate") {
      lastUserPromptRef.current = userText;
      reviewFindingBufferRef.current = [];
      streamAccRef.current = "";
      bufferRef.current.reset();
      setFinalHtml(null);
      setMessagesStore(null, (m) => [...m, { id: crypto.randomUUID(), role: "user", text: userText }]);
    } else if (pageId) {
      setMessagesStore(pageId, (m) => [...m, { id: crypto.randomUUID(), role: "user", text: userText }]);
    }

    try {
      await streamStudioSse(
        kind === "generate" ? "/studio/generate" : "/studio/refine",
        body,
        { getToken, activeOrgId: activeOrganizationId, signal: ac.signal },
        async (event, data) => {
          if (event === "orchestration.phase" && data && typeof data === "object") {
            const d = data as { label?: string };
            if (d.label) setOrchestrationStatus(d.label);
          }
          if (event === "orchestration.four_layer" && data && typeof data === "object") {
            fourLayerAccRef.current = data as ForgeFourLayerPayload;
          }
          if (event === "orchestration.judge" && data && typeof data === "object") {
            const d = data as { verdict?: string; quality?: number };
            const parts = ["Review"];
            if (d.verdict) parts.push(String(d.verdict));
            if (typeof d.quality === "number") parts.push(Number(d.quality).toFixed(1));
            setOrchestrationStatus(parts.join(" · "));
          }
          if (event === "clarify" && data && typeof data === "object") {
            const d = data as {
              candidates?: { workflow?: string; confidence?: number }[];
              non_blocking?: boolean;
            };
            const raw = Array.isArray(d.candidates) ? d.candidates : [];
            const mapped = raw
              .filter((c): c is { workflow: string; confidence: number } => typeof c?.workflow === "string")
              .map((c) => ({
                workflow: c.workflow,
                confidence: typeof c.confidence === "number" ? c.confidence : 0,
                rationale: "",
              }));
            if (mapped.length > 0) {
              setMessagesStore(pageId ?? null, (m) => [
                ...m,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  kind: "workflow_clarify",
                  text: d.non_blocking
                    ? "We started with the best match — pick another workflow if you prefer."
                    : "Which workflow fits best?",
                  clarifyMeta: { candidates: mapped },
                },
              ]);
            }
          }
          if (event === "workflow_clarify" && data && typeof data === "object") {
            const d = data as {
              message?: string;
              candidates?: { workflow: string; confidence: number; rationale: string }[];
              default?: string;
            };
            const candidates = Array.isArray(d.candidates) ? d.candidates : [];
            const hasExplicitMessage =
              typeof d.message === "string" && d.message.trim().length > 0;

            /** Avoid duplicate SSE handlers: legacy path used `null` vs `pageId` store keys. */
            if (hasExplicitMessage) {
              setMessagesStore(null, (m) => [
                ...m,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  kind: "workflow_clarify",
                  text: d.message!,
                  clarifyMeta: {
                    message: d.message ?? "",
                    candidates,
                    default:
                      typeof d.default === "string"
                        ? d.default
                        : candidates[0]?.workflow ?? "custom",
                  },
                },
              ]);
            } else if (candidates.length > 0) {
              const defaultWorkflow =
                (typeof d.default === "string" && d.default) ||
                candidates[0]?.workflow ||
                "";
              setMessagesStore(pageId ?? null, (m) => [
                ...m,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  kind: "workflow_clarify",
                  text: "",
                  clarifyMeta: {
                    candidates,
                    ...(defaultWorkflow ? { default: defaultWorkflow } : {}),
                  },
                },
              ]);
            } else {
              setMessagesStore(null, (m) => [
                ...m,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  kind: "workflow_clarify",
                  text: "Which workflow should I use?",
                  clarifyMeta: {
                    message: "",
                    candidates: [],
                    default: typeof d.default === "string" ? d.default : "custom",
                  },
                },
              ]);
            }
          }
          if (event === "intent") setStreamPhase("intent");
          if (event === "review.finding" && data && typeof data === "object") {
            const rf = data as {
              expert?: string;
              message?: string;
              severity?: string;
              suggested_action?: string;
            };
            const line = `${rf.expert ?? "Review"}: ${rf.message ?? ""}`.trim();
            reviewFindingBufferRef.current.push({
              id: crypto.randomUUID(),
              role: "assistant",
              kind: "review_finding",
              text: line,
              reviewMeta: {
                expert: rf.expert,
                severity: rf.severity,
                message: rf.message,
                suggested_action: rf.suggested_action,
              },
            });
          }
          if (event === "review.complete" && data && typeof data === "object") {
            const rc = data as { summary?: string; quality_score?: number };
            if (rc.summary && rc.summary.length > 0) {
              reviewFindingBufferRef.current.push({
                id: crypto.randomUUID(),
                role: "assistant",
                kind: "review_summary",
                text: rc.summary,
              });
            }
          }
          if (event === "credit.charged" && data && typeof data === "object" && activeOrganizationId) {
            const d = data as {
              provisional?: boolean;
              running_total?: number;
              usage?: Partial<BillingUsageOut>;
            };
            if (d.provisional && typeof d.running_total === "number") {
              setStreamingRunCredits(d.running_total);
            }
            if (d.usage && typeof d.usage === "object") {
              queryClient.setQueryData(
                ["billing-usage", activeOrganizationId],
                (prev: BillingUsageOut | undefined) =>
                  prev ? { ...prev, ...d.usage } : ({ ...d.usage } as BillingUsageOut),
              );
            }
          }
          if (event === "html.start") {
            setStreamPhase("building");
            bufferRef.current.reset();
          }
          if (event === "html.chunk" && data && typeof data === "object") {
            const frag = (data as { fragment?: string }).fragment;
            if (frag) bufferRef.current.append(frag);
          }
          if (event === "html.complete" && data && typeof data === "object") {
            bufferRef.current.flushNow();
            const d = data as {
              page_id?: string;
              slug?: string;
              title?: string;
              refine_suggestions?: string[];
              page_type?: string;
              quality_score?: number;
              degraded_quality?: boolean;
              publish_ack_required?: boolean;
              four_layer?: ForgeFourLayerPayload;
              run_id?: string;
            };
            if (typeof d.run_id === "string" && d.run_id.trim().length > 0) {
              rememberLastOrchestrationRunId(d.run_id.trim());
            }
            if (d.page_id && activeOrganizationId) {
              const p = await getPage(getToken, activeOrganizationId, d.page_id);
              setFinalHtml(p.current_html);
              setPageSlug(p.slug);
              setPageTitle(p.title);
              setPageStatus(p.status);
              setPageType(p.page_type);
              applyIframeHtml(p.current_html);
              router.replace(`/studio?pageId=${p.id}`, { scroll: false });
              const sug =
                Array.isArray(d.refine_suggestions) && d.refine_suggestions.length > 0
                  ? d.refine_suggestions
                  : [...DEFAULT_REFINE_CHIPS];
              setRefineChips(sug);
              const wasGenerate = lastStreamRef.current?.kind === "generate";
              if (wasGenerate) {
                const pt = p.page_type;
                if (pt === "booking-form" || pt === "contact-form")
                  recordWorkflowPageCreated("contact");
                else if (pt === "proposal") recordWorkflowPageCreated("proposal");
                else if (pt === "pitch_deck") recordWorkflowPageCreated("deck");
                const fromEmpty = useStudioStore.getState().getSession(null).messages;
                const pending = reviewFindingBufferRef.current;
                reviewFindingBufferRef.current = [];
                const mergedFour = d.four_layer ?? fourLayerAccRef.current ?? undefined;
                const artifact: StudioChatMsg = {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  kind: "artifact",
                  text: "",
                  artifactMeta: {
                    pageId: p.id,
                    title: p.title,
                    pageType: p.page_type,
                    slug: p.slug,
                    status: p.status,
                    summary: inferSummary(p),
                    qualityScore: typeof d.quality_score === "number" ? d.quality_score : undefined,
                    degradedQuality: !!d.degraded_quality,
                    fourLayer: mergedFour ?? null,
                    runId: typeof d.run_id === "string" ? d.run_id : undefined,
                  },
                };
                setMessagesStore(p.id, [...fromEmpty, ...pending, artifact]);
                if (d.publish_ack_required) {
                  toast.message("Low quality score", {
                    description: "GlideDesign suggests reviewing before publishing.",
                  });
                }
                bootstrapSession(null, { messages: [], draftInput: "" });
              } else {
                setMessagesStore(p.id, (m) => [
                  ...m,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    kind: "plain",
                    text: "Changes applied — preview updated.",
                  },
                ]);
              }
              setPageId(p.id);
            }
            setStreamPhase("idle");
            setOrchestrationStatus(null);
            if (activeOrganizationId) {
              void getStudioUsage(getToken, activeOrganizationId).then(setUsage).catch(() => {});
              void queryClient.invalidateQueries({ queryKey: ["billing-usage", activeOrganizationId] });
              void (async () => {
                const u = await getBillingUsage(getToken, activeOrganizationId);
                const wasGen = lastStreamRef.current?.kind === "generate";
                const est = estimatedCreditsForAction(wasGen ? "generate" : "refine");
                const remPct = Math.max(0, 100 - u.credits_session_percent);
                toast.message(wasGen ? "Build complete" : "Changes applied", {
                  description: `~${est} credits · ~${Math.round(remPct)}% of session headroom left`,
                  duration: 3000,
                });
              })().catch(() => {});
            }
          }
          if (event === "error" && data && typeof data === "object") {
            const msg = (data as { message?: string }).message ?? "Generation failed";
            setMessagesStore(pageId ?? null, (m) => [
              ...m,
              { id: crypto.randomUUID(), role: "system", text: msg },
            ]);
            toast.error(msg);
            setStreamPhase("idle");
          }
        },
      );
    } catch (e) {
      if (ac.signal.aborted) return;
      setStreamBanner("Connection lost");
      toast.error(e instanceof Error ? e.message : "Stream failed");
    } finally {
      if (!ac.signal.aborted) {
        setBusy(false);
        setStreamPhase("idle");
        setStreamingRunCredits(null);
      }
      abortRef.current = null;
    }
  }

  function cannotUseForgeCredits(): boolean {
    const bu = creditsUsageQ.data;
    if (!bu) return false;
    if (bu.extra_usage_enabled) return false;
    if ((bu.credits_session_cap ?? 0) > 0 && (bu.credits_session_percent ?? 0) >= 100) {
      return true;
    }
    if ((bu.credits_week_cap ?? 0) > 0 && (bu.credits_week_percent ?? 0) >= 100) {
      return true;
    }
    return false;
  }

  function creditPrefsMerged(): CreditConfirmPrefsLike {
    const p = me?.preferences as Record<string, unknown> | undefined;
    return {
      credit_confirm_threshold_cents:
        typeof p?.credit_confirm_threshold_cents === "number" ? p.credit_confirm_threshold_cents : 50,
      credit_confirm_skip_under_credits:
        typeof p?.credit_confirm_skip_under_credits === "number" ? p.credit_confirm_skip_under_credits : 75,
    };
  }

  function localeForMoney(): string {
    const p = me?.preferences as Record<string, unknown> | undefined;
    return typeof p?.locale === "string" && p.locale.length >= 2 ? p.locale : "en-US";
  }

  function heavySessionWarning(kind: "generate" | "refine"): string | null {
    const bu = creditsUsageQ.data;
    if (!bu || (bu.credits_session_cap ?? 0) <= 0) return null;
    const rem = bu.credits_session_cap - bu.credits_session_used;
    const est = estimatedCreditsForAction(kind);
    if (rem <= 0) return null;
    if (est / rem <= 0.5) return null;
    return `This will use a large share of your remaining session credits (about ${est} of ${rem} left).`;
  }

  const attachmentIds = React.useCallback(
    () => pendingAttachments.map((a) => a.id),
    [pendingAttachments],
  );

  async function onAttachFiles(files: FileList | null) {
    if (!files?.length || !activeOrganizationId) return;
    setAttachmentBusy(true);
    try {
      const next: StudioPendingAttachment[] = [];
      for (const file of Array.from(files).slice(0, 5 - pendingAttachments.length)) {
        if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
          toast.error(`${file.name} is not supported`, {
            description: "Upload PNG, JPEG, WebP, GIF, or PDF files.",
          });
          continue;
        }
        const sessionId = pageId ?? "new";
        const presign = await postStudioAttachmentPresign(getToken, activeOrganizationId, {
          session_id: sessionId,
          filename: file.name,
          content_type: file.type,
        });
        if (file.size > presign.max_size_bytes) {
          toast.error(`${file.name} is too large`, {
            description: `Max upload size is ${Math.round(presign.max_size_bytes / 1024 / 1024)} MB.`,
          });
          continue;
        }
        const uploaded = await fetch(presign.url, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploaded.ok) throw new Error(`Upload failed for ${file.name}`);
        const reg = await postStudioAttachmentRegister(getToken, activeOrganizationId, {
          session_id: sessionId,
          storage_key: presign.storage_key,
          kind: file.type.startsWith("image/") ? "screenshot" : "pdf",
          mime_type: file.type,
          description: file.name,
        });
        next.push({ id: reg.id, name: file.name, mimeType: file.type });
      }
      if (next.length) {
        setPendingAttachments((prev) => [...prev, ...next].slice(0, 5));
        toast.success(next.length === 1 ? "Attachment added" : `${next.length} attachments added`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload attachment");
    } finally {
      setAttachmentBusy(false);
      if (emptyAttachmentInputRef.current) emptyAttachmentInputRef.current.value = "";
      if (chatAttachmentInputRef.current) chatAttachmentInputRef.current.value = "";
    }
  }

  function removeAttachment(id: string) {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function onSubmitEmpty(e?: React.FormEvent) {
    e?.preventDefault();
    const text = promptEmpty.trim();
    if (!text || busy) return;
    if (cannotUseForgeCredits()) {
      toast.error("Credit limit reached for this window.", {
        description: "Upgrade, enable extra usage in Billing, or wait for the next reset.",
      });
      return;
    }
    const ids = attachmentIds();
    const genBody: Record<string, unknown> = {
      prompt: text,
      page_id: null,
      provider: "openai",
      vision_attachment_ids: ids,
    };
    const wfUrl = searchParams.get("workflow");
    if (wfUrl && !urlWorkflowConsumedRef.current && !pendingForcedWorkflowRef.current) {
      pendingForcedWorkflowRef.current = wfUrl;
      urlWorkflowConsumedRef.current = true;
    }
    void (async () => {
      if (!activeOrganizationId) {
        toast.error("No active workspace.");
        return;
      }
      let est: StudioEstimateOut;
      try {
        est = await postStudioEstimate(getToken, activeOrganizationId, {
          prompt: text,
          page_id: null,
          forced_workflow: pendingForcedWorkflowRef.current ?? searchParams.get("workflow"),
          vision_attachment_ids: ids,
        });
      } catch {
        void runGenerateOrRefine("generate", genBody, text);
        setPromptEmpty("");
        return;
      }
      const bu = creditsUsageQ.data;
      const cur = (billingPlanQ.data?.currency ?? "usd").toLowerCase();
      const squeeze =
        !!bu &&
        (bu.credits_session_cap ?? 0) > 0 &&
        bu.credits_session_used / bu.credits_session_cap >= 0.7;
      const show = shouldShowCreditConfirm({
        estimatedCredits: est.estimated_credits,
        estimatedCostCentsHint: est.estimated_cost_cents_hint,
        sessionCapCredits: bu?.credits_session_cap ?? 0,
        sessionUsedCredits: bu?.credits_session_used ?? 0,
        prefs: creditPrefsMerged(),
        squeezeSession: squeeze,
      });
      const confidences: Record<string, string> = {
        low: "Low",
        medium: "Medium",
        high: "High",
      };
      if (show) {
        pendingCreditRunRef.current = { kind: "generate", body: genBody, userText: text };
        setCreditConfirmEstimate({
          estimatedCredits: est.estimated_credits,
          estimatedSeconds: est.estimated_seconds,
          estimatedCostDisplay: formatCurrency(est.estimated_cost_cents_hint ?? 0, cur, localeForMoney()),
          confidenceLabel: confidences[est.confidence] ?? est.confidence,
          sessionCap: bu?.credits_session_cap ?? 0,
          sessionUsedBefore: bu?.credits_session_used ?? 0,
        });
        setCreditConfirmOpen(true);
        return;
      }
      void runGenerateOrRefine("generate", genBody, text);
      setPromptEmpty("");
      setPendingAttachments([]);
    })();
  }

  function onSecondaryChipPrime(prompt: string) {
    const p = prompt || resolveSurprisePrompt();
    setPromptEmpty(p);
  }

  function onWorkflowClarifyPick(workflow: string) {
    const p = lastGeneratePromptRef.current.trim();
    if (!p || busy) return;
    workflowHintRef.current = workflow;
    void runGenerateOrRefine(
      "generate",
      { prompt: p, page_id: null, provider: "openai", vision_attachment_ids: attachmentIds() },
      p,
    );
  }

  function onSubmitChat(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pageId) return;
    const text = chatInput.trim();
    if (!text || busy) return;
    if (cannotUseForgeCredits()) {
      toast.error("Credit limit reached for this window.", {
        description: "Upgrade, enable extra usage in Billing, or wait for the next reset.",
      });
      return;
    }
    const ids = attachmentIds();
    const refineBody: Record<string, unknown> = {
      message: text,
      page_id: pageId,
      provider: "openai",
      vision_attachment_ids: ids,
    };
    void (async () => {
      if (!activeOrganizationId) {
        toast.error("No active workspace.");
        return;
      }
      let est: StudioEstimateOut;
      try {
        est = await postStudioEstimate(getToken, activeOrganizationId, {
          prompt: text,
          page_id: pageId,
          vision_attachment_ids: ids,
        });
      } catch {
        void runGenerateOrRefine("refine", refineBody, text);
        debouncedPersistDraft(pageId, "");
        setChatInput("");
        return;
      }
      const bu = creditsUsageQ.data;
      const cur = (billingPlanQ.data?.currency ?? "usd").toLowerCase();
      const squeeze =
        !!bu &&
        (bu.credits_session_cap ?? 0) > 0 &&
        bu.credits_session_used / bu.credits_session_cap >= 0.7;
      const show = shouldShowCreditConfirm({
        estimatedCredits: est.estimated_credits,
        estimatedCostCentsHint: est.estimated_cost_cents_hint,
        sessionCapCredits: bu?.credits_session_cap ?? 0,
        sessionUsedCredits: bu?.credits_session_used ?? 0,
        prefs: creditPrefsMerged(),
        squeezeSession: squeeze,
      });
      const confidences: Record<string, string> = {
        low: "Low",
        medium: "Medium",
        high: "High",
      };
      if (show) {
        pendingCreditRunRef.current = { kind: "refine", body: refineBody, userText: text };
        setCreditConfirmEstimate({
          estimatedCredits: est.estimated_credits,
          estimatedSeconds: est.estimated_seconds,
          estimatedCostDisplay: formatCurrency(est.estimated_cost_cents_hint ?? 0, cur, localeForMoney()),
          confidenceLabel: confidences[est.confidence] ?? est.confidence,
          sessionCap: bu?.credits_session_cap ?? 0,
          sessionUsedBefore: bu?.credits_session_used ?? 0,
        });
        setCreditConfirmOpen(true);
        return;
      }
      void runGenerateOrRefine("refine", refineBody, text);
      debouncedPersistDraft(pageId, "");
      setChatInput("");
      setPendingAttachments([]);
    })();
  }

  function onReconnect() {
    const last = lastStreamRef.current;
    if (!last) return;
    if (last.kind === "generate") {
      const p = last.payload.prompt as string;
      void runGenerateOrRefine("generate", last.payload, p);
    } else {
      const msg = last.payload.message as string;
      void runGenerateOrRefine("refine", last.payload, msg);
    }
    setStreamBanner(null);
  }

  function resetToEmpty() {
    abortSse();
    setActive(false);
    setPageId(null);
    setPageSlug(null);
    setFinalHtml(null);
    streamAccRef.current = "";
    bootstrapSession(null, { messages: [], draftInput: "" });
    bufferRef.current.reset();
    router.replace("/studio", { scroll: false });
  }

  async function openPreviewTab() {
    if (!pageSlug || !activeOrg?.organization_slug) return;
    const token = await getToken();
    const url = new URL(
      `${window.location.origin}/p/${activeOrg.organization_slug}/${pageSlug}`,
    );
    url.searchParams.set("preview", "true");
    if (token) url.searchParams.set("token", token);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  async function onPublishClick() {
    if (!pageId || !activeOrganizationId) return;
    if (pageStatus === "live") {
      try {
        const out = await publishPage(getToken, activeOrganizationId, pageId);
        fireCelebrationIfFirst();
        toast.success("Republished", { description: "Live page updated." });
        setPageStatus("live");
        void navigator.clipboard.writeText(out.public_url).catch(() => {});
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Publish failed");
      }
      return;
    }
    setPublishOpen(true);
  }

  function fireCelebrationIfFirst() {
    try {
      if (typeof window === "undefined" || localStorage.getItem(CELEBRATION_KEY)) return;
      localStorage.setItem(CELEBRATION_KEY, "1");
      void fireFirstPublishConfetti();
      toast.success("Your mini-app is live", {
        description: "Share it with your world.",
        duration: 6000,
        className: "bg-accent/10 border border-accent/30",
      });
    } catch {
      /* ignore */
    }
  }

  async function onSectionEditSubmit() {
    if (!pageId || !activeOrganizationId || !editSectionId || !finalHtml) return;
    setEditBusy(true);
    const prev = finalHtml;
    undoRef.current = { html: prev };
    try {
      const res = await apiRequest<{ current_html: string }>("/studio/sections/edit", {
        method: "POST",
        getToken,
        activeOrgId: activeOrganizationId,
        body: JSON.stringify({
          page_id: pageId,
          section_id: editSectionId,
          html: null,
          instruction: editPrompt.trim() || "Polish this section.",
          provider: "openai",
        }),
      });
      const newFull = res.current_html;
      setFinalHtml(newFull);
      applyIframeHtml(newFull);
      setEditOpen(false);
      toast.success("Section updated", {
        action: {
          label: "Undo",
          onClick: () => {
            const u = undoRef.current;
            if (!u || !pageId) return;
            setFinalHtml(u.html);
            applyIframeHtml(u.html);
            undoRef.current = null;
            toast.message("Reverted last edit");
          },
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setEditBusy(false);
    }
  }

  const messages = storeMessages;
  const chatVirt = messages.length > 50;

  return (
    <LayoutGroup>
      <div
        className={cn(
          "relative flex min-h-[calc(100vh-6rem)] flex-col",
          active && "lg:flex-row",
        )}
      >
        <div
          ref={liveAnnounceRef}
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />

        {!active ? (
          <motion.div
            layout
            transition={TRANSITION_PANEL}
            className="flex flex-1 flex-col items-center justify-center px-4 py-12"
          >
            <motion.div layout transition={TRANSITION_PANEL} className="flex w-full max-w-3xl flex-col items-center">
              <ForgeLogo size="lg" className="mb-6" />
              <motion.p
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-2 text-center font-display text-2xl font-bold tracking-tight text-text"
              >
                {timeOfDayGreeting(firstName)}
              </motion.p>
              <p className="mb-8 max-w-xl text-center text-sm font-light leading-relaxed text-text-muted font-body">
                {brand.studioEmptyHint}
              </p>
              {usage ? (
                <p className="mb-4 text-xs text-text-muted font-body">
                  This month: {usage.pages_generated}/{usage.pages_quota} pages
                </p>
              ) : null}

              {cannotUseForgeCredits() ? (
                <div className="mb-4 w-full rounded-2xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left">
                  <p className="text-sm font-medium text-text font-body">Session and weekly credits are at the limit</p>
                  <p className="mt-1 text-xs text-text-muted font-body">
                    You can wait for the next window, add extra usage in Billing, or upgrade.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/settings/usage"
                      className="text-sm font-medium text-accent underline-offset-2 hover:underline font-body"
                    >
                      View usage
                    </Link>
                    <Link
                      href="/settings/billing"
                      className="text-sm font-medium text-accent underline-offset-2 hover:underline font-body"
                    >
                      Billing
                    </Link>
                    <Link
                      href="/pricing"
                      className="text-sm font-medium text-text-muted hover:text-text font-body"
                    >
                      Compare plans
                    </Link>
                  </div>
                </div>
              ) : null}
              {heavySessionWarning("generate") && !cannotUseForgeCredits() ? (
                <p className="mb-2 text-center text-xs text-amber-700 dark:text-amber-300/90 font-body">
                  {heavySessionWarning("generate")}
                </p>
              ) : null}

              <form
                className="relative w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmitEmpty();
                }}
              >
                <TextareaAutosize
                  value={promptEmpty}
                  onChange={(e) => setPromptEmpty(e.target.value)}
                  onKeyDown={(e) => {
                    const submitChord = (e.metaKey || e.ctrlKey) && e.key === "Enter";
                    if (submitChord || (e.key === "Enter" && !e.shiftKey)) {
                      e.preventDefault();
                      onSubmitEmpty();
                    }
                  }}
                  onFocus={() => setEmptyFocused(true)}
                  onBlur={() => setEmptyFocused(false)}
                  minRows={2}
                  maxRows={6}
                  disabled={busy || cannotUseForgeCredits()}
                  placeholder={emptyFocused ? "" : STUDIO_PLACEHOLDERS[placeholderIdx]}
                  className={cn(
                    "w-full resize-none rounded-2xl border border-border bg-surface px-4 py-4 pr-14",
                    "text-base leading-relaxed text-text shadow-sm font-body",
                    "placeholder:text-text-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
                  )}
                />
                <div className="pointer-events-none absolute bottom-3 right-3">
                  {busy ? (
                    <>
                      <span className="sr-only" aria-live="polite">
                        Working on your mini-app…
                      </span>
                      <DotPulse />
                    </>
                  ) : (
                    <button
                      type="submit"
                      disabled={!promptEmpty.trim() || cannotUseForgeCredits()}
                      className={cn(
                        "pointer-events-auto flex size-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-accent transition-opacity",
                        (!promptEmpty.trim() || cannotUseForgeCredits()) && "opacity-40",
                      )}
                      aria-label="Send prompt"
                    >
                      <Send className="size-4" />
                    </button>
                  )}
                </div>
                <div className="absolute bottom-3 left-3">
                  <input
                    ref={emptyAttachmentInputRef}
                    type="file"
                    multiple
                    accept={STUDIO_ATTACHMENT_ACCEPT}
                    className="sr-only"
                    onChange={(e) => void onAttachFiles(e.currentTarget.files)}
                  />
                  <button
                    type="button"
                    disabled={busy || attachmentBusy || pendingAttachments.length >= 5}
                    onClick={() => emptyAttachmentInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-2 py-1.5 text-xs font-medium text-text-muted transition-colors hover:text-accent disabled:opacity-40 font-body"
                  >
                    <ImagePlus className="size-3.5" />
                    {attachmentBusy ? "Uploading" : "Attach"}
                  </button>
                </div>
              </form>
              {pendingAttachments.length ? (
                <div className="mt-2 flex w-full flex-wrap justify-center gap-1.5">
                  {pendingAttachments.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-[11px] text-text-muted font-body"
                    >
                      {a.name}
                      <button type="button" onClick={() => removeAttachment(a.id)} aria-label={`Remove ${a.name}`}>
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
              {emptyEstimate && !active && (me?.preferences as Record<string, unknown> | undefined)?.credit_estimate_display !== "never" ? (
                <p className="mt-2 text-[11px] text-text-muted font-body">
                  ~
                  <span className="tabular-nums">{emptyEstimate.estimated_credits}</span> credits · ~
                  <span>{formatCurrency(emptyEstimate.estimated_cost_cents_hint ?? 0, billingPlanQ.data?.currency ?? "usd", localeForMoney())}</span> ·
                  ~
                  <span className="tabular-nums">{emptyEstimate.estimated_seconds}</span>s ·{" "}
                  {emptyEstimate.confidence.charAt(0).toUpperCase() + emptyEstimate.confidence.slice(1)}{" "}
                  confidence
                </p>
              ) : null}

              <StudioWorkflowGrid
                disabled={busy}
                onPrimePrompt={(prime, workflowQuery) => {
                  setPromptEmpty(prime);
                  if (workflowQuery) pendingForcedWorkflowRef.current = workflowQuery;
                }}
              />

              <motion.div layout transition={TRANSITION_PANEL} className="mt-6 flex flex-wrap justify-center gap-2">
                {STUDIO_SECONDARY_CHIPS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      onSecondaryChipPrime(c.id === "surprise2" ? "" : c.prompt)
                    }
                    className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent font-body"
                  >
                    {c.label}
                  </button>
                ))}
              </motion.div>

              <Link
                href="/app-templates"
                className="mt-8 text-sm text-accent underline-offset-4 hover:underline font-body"
              >
                Browse templates →
              </Link>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            layout
            transition={TRANSITION_PANEL}
            className={cn(
              "flex min-h-[min(720px,100vh)] w-full flex-1 flex-col-reverse gap-0 lg:min-h-[calc(100vh-6rem)] lg:flex-row",
            )}
          >
            {/* Chat column (below preview on narrow viewports) */}
            <motion.section
              layout
              transition={TRANSITION_PANEL}
              className={cn(
                "flex min-h-[320px] w-full min-w-0 flex-col border-border bg-surface-dark text-white shadow-xl",
                "lg:max-w-[480px] lg:min-w-[360px] lg:flex-[0_0_40%] lg:border-r",
                "rounded-none",
              )}
              style={{ willChange: "transform, opacity" }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/2.5 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-white/50 font-body">
                    Studio · {pageTitle || "Untitled page"}
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" className="shrink-0 text-white hover:bg-white/10" onClick={resetToEmpty}>
                  New page
                </Button>
              </header>

              {streamBanner ? (
                <div
                  className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2 text-xs text-amber-200 font-body"
                  role="status"
                >
                  <span>Connection lost</span>
                  <button type="button" className="underline" onClick={onReconnect}>
                    Reconnect
                  </button>
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-hidden">
                {chatVirt ? (
                  <Virtuoso
                    className="h-full"
                    data={messages}
                    followOutput="smooth"
                    itemContent={(_, msg) => (
                      <ChatRow
                        msg={msg}
                        orgSlug={activeOrg?.organization_slug ?? ""}
                        onWorkflowClarifyPick={onWorkflowClarifyPick}
                        getToken={getToken}
                        activeOrgId={activeOrganizationId}
                        setDraftStore={setDraftStore}
                      />
                    )}
                  />
                ) : (
                  <div className="h-full overflow-y-auto px-4 py-4">
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <ChatRow
                          key={msg.id}
                          msg={msg}
                          orgSlug={activeOrg?.organization_slug ?? ""}
                          onWorkflowClarifyPick={onWorkflowClarifyPick}
                          getToken={getToken}
                          activeOrgId={activeOrganizationId}
                          setDraftStore={setDraftStore}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                {busy ? (
                  <div
                  className="flex items-center gap-2 border-t border-white/10 bg-white/2 px-4 py-2 font-body text-xs text-white/60"
                    role="status"
                    aria-live="polite"
                  >
                    <DotPulse />
                    <span>
                      {orchestrationStatus ??
                        (streamPhase === "intent" ? "Understanding what you need…" : "Building the page…")}
                    </span>
                  </div>
                ) : null}
              </div>

              {cannotUseForgeCredits() ? (
                <div className="border-t border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-amber-100 font-body">
                  <p className="font-medium">Generation credit limit reached for this window.</p>
                  <p className="mt-0.5 text-white/60">
                    <Link href="/settings/usage" className="text-accent hover:underline">
                      Usage
                    </Link>{" "}
                    ·{" "}
                    <Link href="/settings/billing" className="text-accent hover:underline">
                      Extra usage
                    </Link>{" "}
                    ·{" "}
                    <Link href="/pricing" className="text-white/50 hover:text-white/80">
                      Plans
                    </Link>
                  </p>
                </div>
              ) : null}
              {heavySessionWarning("refine") && !cannotUseForgeCredits() ? (
                <div className="border-t border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-[11px] text-amber-100/90 font-body">
                  {heavySessionWarning("refine")}
                </div>
              ) : null}
              <StudioSessionUsageStrip active={active} streamingRunCredits={streamingRunCredits ?? undefined} />

              <footer className="border-t border-white/10 bg-white/2.5 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSubmitChat();
                  }}
                  className="space-y-2"
                >
                  <div className="relative flex gap-2">
                    <TextareaAutosize
                      value={chatInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setChatInput(v);
                        debouncedPersistDraft(pageId, v);
                      }}
                      onKeyDown={(e) => {
                        const submitChord = (e.metaKey || e.ctrlKey) && e.key === "Enter";
                        if (submitChord || (e.key === "Enter" && !e.shiftKey)) {
                          e.preventDefault();
                          onSubmitChat();
                        }
                      }}
                      minRows={1}
                      maxRows={4}
                      disabled={busy || !pageId || cannotUseForgeCredits()}
                      placeholder="Refine this page…"
                      className="min-h-0 flex-1 resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2 font-body text-sm text-white shadow-sm transition-[border-color,box-shadow,background-color] placeholder:text-white/40 hover:bg-white/[0.07] focus-visible:border-accent focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--accent)_24%,transparent)]"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      disabled={!chatInput.trim() || !pageId || busy || cannotUseForgeCredits()}
                      className="shrink-0"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      ref={chatAttachmentInputRef}
                      type="file"
                      multiple
                      accept={STUDIO_ATTACHMENT_ACCEPT}
                      className="sr-only"
                      onChange={(e) => void onAttachFiles(e.currentTarget.files)}
                    />
                    <button
                      type="button"
                      disabled={busy || attachmentBusy || pendingAttachments.length >= 5}
                      onClick={() => chatAttachmentInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-body text-[11px] text-white/70 transition-colors hover:bg-white/10 disabled:opacity-40"
                    >
                      <ImagePlus className="size-3" />
                      {attachmentBusy ? "Uploading" : "Attach image/PDF"}
                    </button>
                    {pendingAttachments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-body text-[11px] text-white/70"
                      >
                        {a.name}
                        <button type="button" onClick={() => removeAttachment(a.id)} aria-label={`Remove ${a.name}`}>
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {pageId && refineChips.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {refineChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          disabled={busy}
                          className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 font-body text-[11px] text-white/80 transition-colors hover:border-white/25 hover:bg-white/10"
                          onClick={() => {
                            if (!pageId || busy || cannotUseForgeCredits()) return;
                            const refineBody: Record<string, unknown> = {
                              message: chip,
                              page_id: pageId,
                              provider: "openai",
                            };
                            void (async () => {
                              if (!activeOrganizationId) {
                                toast.error("No active workspace.");
                                return;
                              }
                              let est: StudioEstimateOut;
                              try {
                                est = await postStudioEstimate(getToken, activeOrganizationId, {
                                  prompt: chip,
                                  page_id: pageId,
                                });
                              } catch {
                                void runGenerateOrRefine("refine", refineBody, chip);
                                debouncedPersistDraft(pageId, "");
                                setChatInput("");
                                return;
                              }
                              const bu = creditsUsageQ.data;
                              const cur = (billingPlanQ.data?.currency ?? "usd").toLowerCase();
                              const squeeze =
                                !!bu &&
                                (bu.credits_session_cap ?? 0) > 0 &&
                                bu.credits_session_used / bu.credits_session_cap >= 0.7;
                              const show = shouldShowCreditConfirm({
                                estimatedCredits: est.estimated_credits,
                                estimatedCostCentsHint: est.estimated_cost_cents_hint,
                                sessionCapCredits: bu?.credits_session_cap ?? 0,
                                sessionUsedCredits: bu?.credits_session_used ?? 0,
                                prefs: creditPrefsMerged(),
                                squeezeSession: squeeze,
                              });
                              const confidences: Record<string, string> = {
                                low: "Low",
                                medium: "Medium",
                                high: "High",
                              };
                              if (show) {
                                pendingCreditRunRef.current = { kind: "refine", body: refineBody, userText: chip };
                                setCreditConfirmEstimate({
                                  estimatedCredits: est.estimated_credits,
                                  estimatedSeconds: est.estimated_seconds,
                                  estimatedCostDisplay: formatCurrency(
                                    est.estimated_cost_cents_hint ?? 0,
                                    cur,
                                    localeForMoney(),
                                  ),
                                  confidenceLabel: confidences[est.confidence] ?? est.confidence,
                                  sessionCap: bu?.credits_session_cap ?? 0,
                                  sessionUsedBefore: bu?.credits_session_used ?? 0,
                                });
                                setCreditConfirmOpen(true);
                                return;
                              }
                              void runGenerateOrRefine("refine", refineBody, chip);
                              debouncedPersistDraft(pageId, "");
                              setChatInput("");
                            })();
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </form>
              </footer>
            </motion.section>

            {/* Preview column */}
            <motion.section
              layout
              transition={TRANSITION_PANEL}
              className="flex min-h-[420px] min-w-0 flex-1 flex-col border-border bg-bg"
              style={{ willChange: "transform, opacity" }}
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-bg-elevated/35 px-3 py-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface/90 px-2 py-1 shadow-sm">
                  <span className="flex gap-1" aria-hidden>
                    <span className="size-2.5 rounded-full bg-red-400/80" />
                    <span className="size-2.5 rounded-full bg-amber-400/80" />
                    <span className="size-2.5 rounded-full bg-emerald-400/80" />
                  </span>
                  <span className="max-w-[min(280px,40vw)] truncate text-[11px] text-text-muted font-body">
                    {origin && activeOrg?.organization_slug && pageSlug
                      ? `${origin}/p/${activeOrg.organization_slug}/${pageSlug}`
                      : "Preview URL"}
                  </span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={editMode ? "primary" : "secondary"}
                    className="h-8 text-xs"
                    onClick={() => setEditMode((v) => !v)}
                  >
                    <PanelsTopLeft className="size-3.5" />
                    Edit mode
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs"
                    disabled={!pageSlug || !activeOrg?.organization_slug}
                    onClick={openPreviewTab}
                  >
                    <Monitor className="size-3.5" />
                    Open
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs"
                    disabled={!pageId}
                    onClick={() => void onPublishClick()}
                  >
                    {pageStatus === "live" ? "Republish" : "Publish"}
                  </Button>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--accent)_8%,transparent),transparent_42%),var(--bg-elevated)] p-3">
                <iframe
                  ref={iframeRef}
                  title="Live page preview"
                  aria-label="Live page preview"
                  sandbox="allow-forms allow-scripts"
                  className="h-full min-h-[360px] w-full rounded-xl border border-border/70 bg-white shadow-sm"
                />
                {busy ? (
                  <div
                    className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/40 to-transparent"
                    style={{ willChange: "opacity" }}
                  />
                ) : null}
              </div>

              {hoverSection && editMode && hoverRect ? (
                <div
                  className="pointer-events-none fixed z-10 rounded-md border-2 border-dashed border-accent"
                  style={{
                    top: hoverRect.top,
                    left: hoverRect.left,
                    width: hoverRect.width,
                    height: hoverRect.height,
                    willChange: "transform",
                  }}
                />
              ) : null}

              {editOpen && editAnchor ? (
                <FocusScope trapped loop>
                  <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="section-edit-title"
                    tabIndex={-1}
                    className="fixed z-50 w-[min(92vw,360px)] rounded-2xl border border-border bg-surface p-3 shadow-lg outline-none"
                    style={{
                      top: Math.min(editAnchor.top + 8, window.innerHeight - 280),
                      left: Math.min(editAnchor.left, window.innerWidth - 380),
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditOpen(false);
                    }}
                  >
                    <p id="section-edit-title" className="text-xs font-medium text-text-muted font-body">
                      Edit {editSectionId}
                    </p>
                    <Input
                      ref={editInputRef}
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="What should change?"
                      className="mt-2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void onSectionEditSubmit();
                        }
                      }}
                    />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {SECTION_EDIT_QUICK_CHIPS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] font-body"
                          onClick={() => setEditPrompt(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditOpen(false)}>
                        Close
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        loading={editBusy}
                        onClick={() => void onSectionEditSubmit()}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </FocusScope>
              ) : null}
            </motion.section>
          </motion.div>
        )}
      </div>

      <CreditConfirmDialog
        open={creditConfirmOpen}
        onOpenChange={(v) => {
          setCreditConfirmOpen(v);
          if (!v) pendingCreditRunRef.current = null;
        }}
        estimate={creditConfirmEstimate}
        onConfirm={({ raiseSkipUnderCreditsTo }) => {
          if (raiseSkipUnderCreditsTo != null) {
            void patchUserPreferences(getToken, {
              credit_confirm_skip_under_credits: raiseSkipUnderCreditsTo,
            }).then(() => queryClient.invalidateQueries({ queryKey: ["me"] }));
          }
          const p = pendingCreditRunRef.current;
          pendingCreditRunRef.current = null;
          if (!p) return;
          void runGenerateOrRefine(p.kind, p.body, p.userText);
          if (p.kind === "generate") setPromptEmpty("");
          if (p.kind === "refine" && pageId) {
            debouncedPersistDraft(pageId, "");
            setChatInput("");
          }
        }}
      />

      {pageId ? (
        <StudioPublishDialog
          open={publishOpen}
          onOpenChange={setPublishOpen}
          getToken={getToken}
          activeOrgId={activeOrganizationId}
          pageId={pageId}
          initialTitle={pageTitle}
          currentSlug={pageSlug ?? slugifyPageTitle(pageTitle)}
          onPublished={(out) => {
            fireCelebrationIfFirst();
            setPageStatus("live");
            toast.success("Published", {
              action: { label: "View live page ↗", onClick: () => window.open(out.public_url, "_blank") },
            });
          }}
        />
      ) : null}
    </LayoutGroup>
  );
}

function ChatRow({
  msg,
  orgSlug,
  onWorkflowClarifyPick,
  getToken,
  activeOrgId,
  setDraftStore,
}: {
  msg: StudioChatMsg;
  orgSlug: string;
  onWorkflowClarifyPick: (workflow: string) => void;
  getToken: () => Promise<string | null>;
  activeOrgId: string | null;
  setDraftStore: (pageId: string | null, text: string) => void;
}) {
  const router = useRouter();

  if (msg.kind === "review_finding") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITIONS.fadeUp}
        className="mb-2 flex justify-start gap-2 opacity-90"
      >
        <ForgeLogo size="sm" className="mt-0.5 shrink-0 opacity-80" />
        <div className="max-w-[95%] rounded-lg border border-white/10 bg-white/4 px-4 py-2 font-body text-xs text-white/90">
          <p className="text-[11px] text-white/60 font-body">Design review</p>
          <p className="mt-2 text-[11px] text-white/75 font-body">{msg.text}</p>
        </div>
      </motion.div>
    );
  }

  if (msg.kind === "review_summary") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITIONS.fadeUp}
        className="mb-2 flex justify-start gap-2"
      >
        <ForgeLogo size="sm" className="mt-0.5 shrink-0 opacity-80" />
        <div className="max-w-[95%] rounded-lg border border-white/10 bg-white/4 px-4 py-2 font-body text-xs text-white/90">
          <p className="text-[11px] text-white/60 font-body">Review summary</p>
          <p className="mt-2 text-white/80 font-body">{msg.text}</p>
        </div>
      </motion.div>
    );
  }

  if (msg.kind === "workflow_clarify" && msg.clarifyMeta) {
    const cm = msg.clarifyMeta;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITIONS.fadeUp}
        className="mb-3"
      >
        <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white/90 font-body">
          <p className="text-[11px] text-white/60 font-body">
            We could go a few ways — pick one to steer this generation (optional):
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {cm.candidates.map((c) => (
              <button
                key={c.workflow}
                type="button"
                className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] text-white hover:bg-white/15 font-body"
                onClick={() => onWorkflowClarifyPick(c.workflow)}
              >
                {c.workflow.replace(/-/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (msg.kind === "artifact" && msg.artifactMeta) {
    const m = msg.artifactMeta;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITIONS.fadeUp}
        className="mb-3"
      >
        <div className="flex gap-2">
          <ForgeLogo size="sm" className="mt-1 shrink-0 opacity-80" />
          <StudioPageArtifactCard
            meta={m}
            orgSlug={orgSlug}
            getToken={getToken}
            activeOrgId={activeOrgId}
            onDraftRefinePrefill={(prefill) => {
              setDraftStore(m.pageId ?? null, prefill);
            }}
            onOpen={() => {
              const base = window.location.origin;
              const url =
                m.status === "live"
                  ? `${base}/p/${orgSlug}/${m.slug}`
                  : `${base}/p/${orgSlug}/${m.slug}?preview=true`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
            onSaveExit={() => router.push(`/pages/${m.pageId}`)}
            onCopyLink={async () => {
              const base = window.location.origin;
              const url =
                m.status === "live"
                  ? `${base}/p/${orgSlug}/${m.slug}`
                  : `${base}/p/${orgSlug}/${m.slug}?preview=true`;
              await navigator.clipboard.writeText(url);
              toast.success("Link copied");
            }}
          />
        </div>
      </motion.div>
    );
  }

  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={MOTION_TRANSITIONS.fadeUp}
      className={cn("mb-3 flex", isUser ? "justify-end" : "justify-start gap-2")}
    >
      {!isUser ? <ForgeLogo size="sm" className="mt-1 shrink-0 opacity-80" /> : null}
      <div
        className={cn(
          "max-w-[95%] rounded-lg px-3 py-2 text-sm font-body",
          isUser ? "bg-accent/25 text-white" : "bg-white/10 text-white/90",
        )}
      >
        {msg.text}
      </div>
    </motion.div>
  );
}

