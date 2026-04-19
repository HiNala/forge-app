"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { Monitor, PanelsTopLeft, Send } from "lucide-react";
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
  getPage,
  getStudioConversation,
  getStudioUsage,
  listPages,
  publishPage,
  type PageDetailOut,
  type StudioUsageOut,
} from "@/lib/api";
import { debounce } from "@/lib/debounce";
import { MOTION_TRANSITIONS, SPRINGS } from "@/lib/motion";
import { SIDEBAR_AUTO_COLLAPSE_EVENT } from "@/lib/shell-events";
import {
  DEFAULT_REFINE_CHIPS,
  SECTION_EDIT_QUICK_CHIPS,
  STUDIO_PLACEHOLDERS,
  resolveSurprisePrompt,
} from "@/lib/studio-content";
import { STUDIO_SECONDARY_CHIPS } from "@/lib/studio-workflow-chips";
import { WORKFLOW_PRIMERS, type FlagshipWorkflowId } from "@/lib/workflow-config";
import { timeOfDayGreeting } from "@/lib/studio-greeting";
import {
  ensureBridgeInFullDocument,
  parseSectionIds,
  wrapStudioPreviewHtml,
} from "@/lib/studio-preview-html";
import { createChunkBuffer } from "@/lib/studio-buffer";
import { streamStudioSse } from "@/lib/sse";
import { fireFirstPublishConfetti } from "@/lib/confetti";
import { slugifyPageTitle } from "@/lib/slugify-page";
import { useForgeSession } from "@/providers/session-provider";
import { useUIStore } from "@/stores/ui";
import { studioSessionKey, useStudioStore, type StudioChatMsg } from "@/stores/studio-store";
import { cn } from "@/lib/utils";
import { ForgeLogo } from "@/components/icons/logo";
import { StudioPageArtifactCard } from "@/components/studio/studio-page-artifact-card";
import { StudioPublishDialog } from "@/components/studio/studio-publish-dialog";

const TRANSITION_PANEL = { ...SPRINGS.soft };

const CELEBRATION_KEY = "forge:first-page-live-celebration";

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
  const { activeOrganizationId, activeOrg } = useForgeSession();
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const firstName = user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "there";

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
  const abortRef = React.useRef<AbortController | null>(null);
  const lastStreamRef = React.useRef<{ kind: "generate" | "refine"; payload: Record<string, unknown> } | null>(
    null,
  );
  const lastUserPromptRef = React.useRef("");
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
    if (!workflowFromUrl) return;
    const w = workflowFromUrl.toLowerCase().replace(/_/g, "-");
    if (w === "contact-form" || w === "contact") {
      setPromptEmpty(WORKFLOW_PRIMERS["contact-form"].prime);
    } else if (w === "proposal") {
      setPromptEmpty(WORKFLOW_PRIMERS.proposal.prime);
    } else if (w === "pitch-deck" || w === "deck") {
      setPromptEmpty(WORKFLOW_PRIMERS.pitch_deck.prime);
    }
  }, [workflowFromUrl]);

  const pagesForPrimersQ = useQuery({
    queryKey: ["pages", activeOrganizationId],
    queryFn: () => listPages(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId && !active,
  });

  const flagshipOrder = React.useMemo((): FlagshipWorkflowId[] => {
    const base: FlagshipWorkflowId[] = ["contact-form", "proposal", "pitch_deck"];
    const rows = pagesForPrimersQ.data ?? [];
    const countContact = () =>
      rows.filter((p) => ["contact-form", "booking-form", "rsvp"].includes(p.page_type)).length;
    const count = (id: FlagshipWorkflowId) => {
      if (id === "proposal") return rows.filter((p) => p.page_type === "proposal").length;
      if (id === "pitch_deck") return rows.filter((p) => p.page_type === "pitch_deck").length;
      return countContact();
    };
    return [...base].sort((a, b) => count(b) - count(a) || base.indexOf(a) - base.indexOf(b));
  }, [pagesForPrimersQ.data]);

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
    lastStreamRef.current = { kind, payload: body };
    setBusy(true);
    setStreamBanner(null);
    setStreamPhase("intent");
    setActive(true);

    if (kind === "generate") {
      lastUserPromptRef.current = userText;
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
          if (event === "workflow_clarify" && data && typeof data === "object") {
            const d = data as {
              message?: string;
              candidates?: { workflow: string; confidence: number; rationale: string }[];
              default?: string;
            };
            setMessagesStore(null, (m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                kind: "workflow_clarify",
                text: d.message ?? "Which workflow should I use?",
                clarifyMeta: {
                  message: d.message ?? "",
                  candidates: Array.isArray(d.candidates) ? d.candidates : [],
                  default: typeof d.default === "string" ? d.default : "custom",
                },
              },
            ]);
          }
          if (event === "intent") setStreamPhase("intent");
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
            };
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
                const fromEmpty = useStudioStore.getState().getSession(null).messages;
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
                  },
                };
                setMessagesStore(p.id, [...fromEmpty, artifact]);
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
            if (activeOrganizationId) void getStudioUsage(getToken, activeOrganizationId).then(setUsage).catch(() => {});
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
      }
      abortRef.current = null;
    }
  }

  function onSubmitEmpty(e?: React.FormEvent) {
    e?.preventDefault();
    const text = promptEmpty.trim();
    if (!text || busy) return;
    void runGenerateOrRefine("generate", { prompt: text, page_id: null, provider: "openai" }, text);
    setPromptEmpty("");
  }

  function onPickWorkflowClarify(forced: string) {
    const prompt = lastUserPromptRef.current.trim();
    if (!prompt) return;
    abortSse();
    void runGenerateOrRefine(
      "generate",
      { prompt, page_id: null, provider: "openai", forced_workflow: forced },
      prompt,
    );
  }

  function primeSecondaryChip(prime: string) {
    if (prime) {
      setPromptEmpty(prime);
      return;
    }
    setPromptEmpty(resolveSurprisePrompt());
  }

  function onSubmitChat(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pageId) return;
    const text = chatInput.trim();
    if (!text || busy) return;
    debouncedPersistDraft(pageId, "");
    setChatInput("");
    void runGenerateOrRefine(
      "refine",
      { message: text, page_id: pageId, provider: "openai" },
      text,
    );
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
      toast.success("Your first page is live", {
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
                className="mb-8 text-center font-display text-2xl font-semibold tracking-tight text-text"
              >
                {timeOfDayGreeting(firstName)}
              </motion.p>
              {usage ? (
                <p className="mb-4 text-xs text-text-muted font-body">
                  This month: {usage.pages_generated}/{usage.pages_quota} pages
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
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSubmitEmpty();
                    }
                  }}
                  onFocus={() => setEmptyFocused(true)}
                  onBlur={() => setEmptyFocused(false)}
                  minRows={2}
                  maxRows={6}
                  disabled={busy}
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
                        Working on your page…
                      </span>
                      <DotPulse />
                    </>
                  ) : (
                    <button
                      type="submit"
                      disabled={!promptEmpty.trim()}
                      className={cn(
                        "pointer-events-auto flex size-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-accent transition-opacity",
                        !promptEmpty.trim() && "opacity-40",
                      )}
                      aria-label="Send prompt"
                    >
                      <Send className="size-4" />
                    </button>
                  )}
                </div>
              </form>

              <div className="mt-8 w-full">
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-text-muted font-body">
                  Start from a workflow
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {flagshipOrder.map((key) => {
                    const wf = WORKFLOW_PRIMERS[key];
                    const Icon = wf.icon;
                    const top = flagshipOrder[0] === key && (pagesForPrimersQ.data?.length ?? 0) > 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={busy}
                        onClick={() => setPromptEmpty(wf.prime)}
                        className={cn(
                          "flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                          "border-border bg-surface shadow-sm hover:border-accent/50 hover:shadow-md",
                          top && "ring-2 ring-accent/30 ring-offset-2 ring-offset-bg",
                        )}
                      >
                        <motion.span
                          className="text-accent"
                          whileHover={{
                            rotate: [0, -5, 5, -3, 0],
                            transition: { duration: 0.45, ease: "easeOut" },
                          }}
                        >
                          <Icon className="size-8" aria-hidden />
                        </motion.span>
                        <span>
                          <span className="block font-display text-sm font-semibold text-text">{wf.title}</span>
                          <span className="mt-1 block text-xs leading-snug text-text-muted font-body">
                            {wf.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 w-full">
                <p className="mb-2 text-center text-[11px] text-text-muted font-body">
                  More starting points — tap to add to your prompt
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {STUDIO_SECONDARY_CHIPS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      disabled={busy}
                      onClick={() => primeSecondaryChip(c.prime)}
                      className="rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent font-body"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <Link
                href="/templates"
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
                "flex min-h-[320px] w-full min-w-0 flex-col border-border bg-surface-dark text-white",
                "lg:max-w-[480px] lg:min-w-[360px] lg:flex-[0_0_40%] lg:border-r",
                "rounded-none",
              )}
              style={{ willChange: "transform, opacity" }}
            >
              <header className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-white/50 font-body">
                    Studio · {pageTitle || "Untitled page"}
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" className="shrink-0 text-white" onClick={resetToEmpty}>
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
                        onPickClarify={onPickWorkflowClarify}
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
                          onPickClarify={onPickWorkflowClarify}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
                {busy ? (
                  <div
                    className="flex items-center gap-2 border-t border-white/10 px-4 py-2 text-xs text-white/60 font-body"
                    role="status"
                    aria-live="polite"
                  >
                    <DotPulse />
                    <span>
                      {streamPhase === "intent" ? "Understanding what you need…" : "Building the page…"}
                    </span>
                  </div>
                ) : null}
              </div>

              <footer className="border-t border-white/10 p-3">
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
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          onSubmitChat();
                        }
                      }}
                      minRows={1}
                      maxRows={4}
                      disabled={busy || !pageId}
                      placeholder="Refine this page…"
                      className="min-h-0 flex-1 resize-none rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 font-body focus-visible:border-accent focus-visible:outline-none"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="primary"
                      disabled={!chatInput.trim() || !pageId || busy}
                      className="shrink-0"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                  {pageId && refineChips.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {refineChips.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          disabled={busy}
                          className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/10 font-body"
                          onClick={() => {
                            setChatInput(chip);
                            debouncedPersistDraft(pageId, chip);
                            void runGenerateOrRefine(
                              "refine",
                              { message: chip, page_id: pageId, provider: "openai" },
                              chip,
                            );
                            setChatInput("");
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
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1">
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

              <div className="relative min-h-0 flex-1 overflow-hidden bg-bg-elevated/40">
                <iframe
                  ref={iframeRef}
                  title="Live page preview"
                  aria-label="Live page preview"
                  sandbox="allow-forms allow-same-origin allow-scripts"
                  className="h-full min-h-[360px] w-full bg-white"
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
                    className="fixed z-50 w-[min(92vw,360px)] rounded-xl border border-border bg-surface p-3 shadow-lg outline-none"
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

function workflowClarifyLabel(w: string): string {
  const m: Record<string, string> = {
    "contact-form": "Contact / booking",
    "booking-form": "Booking",
    proposal: "Proposal",
    pitch_deck: "Pitch deck",
  };
  return m[w] ?? w;
}

function ChatRow({
  msg,
  orgSlug,
  onPickClarify,
}: {
  msg: StudioChatMsg;
  orgSlug: string;
  onPickClarify?: (workflow: string) => void;
}) {
  const router = useRouter();

  if (msg.kind === "workflow_clarify" && msg.clarifyMeta) {
    const top = msg.clarifyMeta.candidates.slice(0, 2);
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_TRANSITIONS.fadeUp}
        className="mb-3 flex gap-2"
      >
        <ForgeLogo size="sm" className="mt-1 shrink-0 opacity-80" />
        <div className="max-w-[95%] rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/90 font-body">
          <p className="text-[13px] leading-relaxed">{msg.clarifyMeta.message}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {top.map((c) => (
              <Button
                key={c.workflow}
                type="button"
                size="sm"
                variant="secondary"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15"
                onClick={() => onPickClarify?.(c.workflow)}
              >
                {workflowClarifyLabel(c.workflow)}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/50">
            Or keep typing — we’ll continue with the default ({workflowClarifyLabel(msg.clarifyMeta.default)}).
          </p>
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

