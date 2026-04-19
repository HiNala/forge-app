"use client";

import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, getPage, getStudioUsage, type StudioUsageOut } from "@/lib/api";
import { streamStudioSse } from "@/lib/sse";
import { useForgeSession } from "@/providers/session-provider";
import { useUIStore } from "@/stores/ui";
import { cn } from "@/lib/utils";

const CHIPS = [
  "Booking page for a handyman",
  "Contact form for a coffee shop",
  "Minimal landing for a law firm",
] as const;

type ChatMsg = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

function previewShell(body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>body{margin:0;font-family:system-ui,sans-serif;background:#fafafa;color:#111;}</style></head><body>${body}</body></html>`;
}

function parseSectionIds(html: string): string[] {
  const re = /data-forge-section="([^"]+)"/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

export function StudioWorkspace() {
  const { getToken } = useAuth();
  const { activeOrganizationId, activeOrg } = useForgeSession();
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);

  const [prompt, setPrompt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const [streamBody, setStreamBody] = React.useState("");
  const [finalHtml, setFinalHtml] = React.useState<string | null>(null);
  const [pageId, setPageId] = React.useState<string | null>(null);
  const [pageSlug, setPageSlug] = React.useState<string | null>(null);
  const [usage, setUsage] = React.useState<StudioUsageOut | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [sectionId, setSectionId] = React.useState("");
  const [sectionPrompt, setSectionPrompt] = React.useState("");
  const [sectionBusy, setSectionBusy] = React.useState(false);

  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const displaySrc = finalHtml ?? previewShell(streamBody);

  React.useEffect(() => {
    if (!activeOrganizationId) return;
    void (async () => {
      try {
        const u = await getStudioUsage(getToken, activeOrganizationId);
        setUsage(u);
      } catch {
        setUsage(null);
      }
    })();
  }, [getToken, activeOrganizationId]);

  React.useEffect(() => {
    if (active) setSidebarCollapsed(true);
  }, [active, setSidebarCollapsed]);

  async function runGenerate(body: { prompt: string; page_id?: string | null }) {
    if (!activeOrganizationId) {
      toast.error("No active workspace.");
      return;
    }
    setBusy(true);
    setActive(true);
    setStreamBody("");
    setFinalHtml(null);
    const userMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      text: body.prompt,
    };
    setMessages((m) => [...m, userMsg]);

    try {
      await streamStudioSse(
        "/studio/generate",
        { prompt: body.prompt, page_id: body.page_id ?? null, provider: "openai" },
        { getToken, activeOrgId: activeOrganizationId },
        async (event, data) => {
          if (event === "html.chunk" && data && typeof data === "object") {
            const frag = (data as { fragment?: string }).fragment;
            if (frag) setStreamBody((p) => p + frag);
          }
          if (event === "html.complete" && data && typeof data === "object") {
            const d = data as { page_id?: string; slug?: string };
            if (d.page_id) setPageId(d.page_id);
            if (d.slug) setPageSlug(d.slug);
            if (d.page_id && activeOrganizationId) {
              try {
                const p = await getPage(getToken, activeOrganizationId, d.page_id);
                setFinalHtml(p.current_html);
              } catch {
                /* keep streamed preview */
              }
            }
            setMessages((m) => [
              ...m,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                text: "Page generated — preview updated.",
              },
            ]);
            toast.success("Page ready");
            void getStudioUsage(getToken, activeOrganizationId).then(setUsage).catch(() => {});
          }
          if (event === "error" && data && typeof data === "object") {
            const msg = (data as { message?: string }).message ?? "Generation failed";
            toast.error(msg);
            setMessages((m) => [
              ...m,
              { id: crypto.randomUUID(), role: "system", text: msg },
            ]);
          }
        },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stream failed");
    } finally {
      setBusy(false);
    }
  }

  async function runSectionEdit() {
    if (!activeOrganizationId || !pageId || !sectionId.trim()) {
      toast.error("Need a page and section id.");
      return;
    }
    setSectionBusy(true);
    try {
      const res = await apiRequest<{ current_html: string }>("/studio/sections/edit", {
        method: "POST",
        getToken,
        activeOrgId: activeOrganizationId,
        body: JSON.stringify({
          page_id: pageId,
          section_id: sectionId.trim(),
          html: null,
          instruction: sectionPrompt || "Polish copy.",
          provider: "openai",
        }),
      });
      setFinalHtml(res.current_html);
      toast.success("Section updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Edit failed");
    } finally {
      setSectionBusy(false);
    }
  }

  const openPreviewTab = () => {
    if (!pageSlug || !activeOrg?.organization_slug) return;
    const url = `${window.location.origin}/p/${activeOrg.organization_slug}/${pageSlug}?preview=true`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const sectionChoices = parseSectionIds(finalHtml ?? previewShell(streamBody));

  return (
    <div
      className={cn(
        "flex min-h-[calc(100vh-8rem)] flex-col gap-6",
        active && "lg:grid lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-0",
      )}
    >
      {!active ? (
        <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center py-8">
          <div className="mb-2 flex items-center gap-2 font-display text-2xl font-semibold text-text">
            <Sparkles className="size-7 text-accent" />
            Studio
          </div>
          <p className="mb-8 text-center text-sm text-text-muted font-body">
            Describe a page. Forge parses intent, composes sections, and streams the preview.
          </p>
          {usage ? (
            <p className="mb-4 text-xs text-text-muted font-body">
              This month: {usage.pages_generated}/{usage.pages_quota} pages
            </p>
          ) : null}
          <div className="flex w-full flex-wrap justify-center gap-2">
            {CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:text-accent font-body"
                onClick={() => setPrompt(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-8 w-full">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. One-page booking form for small drywall jobs…"
              minRows={3}
              className="resize-none rounded-[10px] border-border bg-surface"
            />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                variant="primary"
                className="gap-2"
                loading={busy}
                disabled={!prompt.trim() || busy}
                onClick={() => runGenerate({ prompt: prompt.trim() })}
              >
                <Wand2 className="size-4" />
                Generate
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex min-h-[420px] flex-col border-border bg-surface-dark text-text lg:min-h-0 lg:border-r",
              "rounded-[10px] lg:rounded-none lg:rounded-l-[10px]",
            )}
          >
            <div className="border-b border-white/10 px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/50 font-body">
              Chat
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "max-w-[95%] rounded-lg px-3 py-2 text-sm font-body",
                        msg.role === "user"
                          ? "ml-auto bg-accent/20 text-white"
                          : "mr-auto bg-white/10 text-white/90",
                      )}
                    >
                      {msg.text}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {busy ? (
                  <div className="flex items-center gap-2 text-xs text-white/50 font-body">
                    <Loader2 className="size-4 animate-spin" />
                    Generating…
                  </div>
                ) : null}
              </div>
              <div className="border-t border-white/10 p-3">
                <div className="flex gap-2">
                  <Input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Refine: shorter hero, add phone…"
                    className="border-white/20 bg-white/5 text-white placeholder:text-white/40"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (pageId && prompt.trim() && !busy) {
                          void (async () => {
                            setBusy(true);
                            try {
                              await streamStudioSse(
                                "/studio/refine",
                                {
                                  message: prompt.trim(),
                                  page_id: pageId,
                                  provider: "openai",
                                },
                                { getToken, activeOrgId: activeOrganizationId },
                                async (event, data) => {
                                  if (event === "html.complete" && data && typeof data === "object") {
                                    const d = data as { page_id?: string };
                                    if (d.page_id && activeOrganizationId) {
                                      const p = await getPage(getToken, activeOrganizationId, d.page_id);
                                      setFinalHtml(p.current_html);
                                    }
                                    toast.success("Refined");
                                  }
                                  if (event === "error") toast.error("Refine failed");
                                },
                              );
                            } finally {
                              setBusy(false);
                              setPrompt("");
                            }
                          })();
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!prompt.trim() || !pageId || busy}
                    onClick={() => {
                      if (!pageId) return;
                      void (async () => {
                        setBusy(true);
                        try {
                          await streamStudioSse(
                            "/studio/refine",
                            {
                              message: prompt.trim(),
                              page_id: pageId,
                              provider: "openai",
                            },
                            { getToken, activeOrgId: activeOrganizationId },
                            async (event, data) => {
                              if (event === "html.complete" && data && typeof data === "object") {
                                const d = data as { page_id?: string };
                                if (d.page_id && activeOrganizationId) {
                                  const p = await getPage(getToken, activeOrganizationId, d.page_id);
                                  setFinalHtml(p.current_html);
                                }
                                toast.success("Refined");
                              }
                              if (event === "error") toast.error("Refine failed");
                            },
                          );
                        } finally {
                          setBusy(false);
                          setPrompt("");
                        }
                      })();
                    }}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col rounded-[10px] border border-border bg-bg lg:min-h-0 lg:rounded-none lg:rounded-r-[10px] lg:border-l-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-xs font-medium text-text-muted font-body">Preview</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setEditMode(!editMode)}
                >
                  Edit mode
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-xs"
                  disabled={!pageSlug || !activeOrg?.organization_slug}
                  onClick={openPreviewTab}
                >
                  <ExternalLink className="size-3.5" />
                  Open
                </Button>
              </div>
            </div>
            <div className="relative flex-1 overflow-hidden bg-bg-elevated/50">
              <iframe
                ref={iframeRef}
                title="Page preview"
                sandbox="allow-forms allow-same-origin"
                className="h-full min-h-[360px] w-full bg-white"
                srcDoc={displaySrc}
              />
              {busy ? (
                <div className="pointer-events-none absolute inset-0 animate-pulse bg-white/30" />
              ) : null}
            </div>
            {editMode ? (
              <div className="space-y-2 border-t border-border p-3">
                <p className="text-xs text-text-muted font-body">
                  Section-targeted edit (server extracts HTML by id).
                </p>
                <div className="flex flex-wrap gap-2">
                  {sectionChoices.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-body",
                        sectionId === id
                          ? "border-accent bg-accent-light text-accent"
                          : "border-border bg-surface text-text-muted",
                      )}
                      onClick={() => setSectionId(id)}
                    >
                      {id}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder="Section id (e.g. hero-centered-0)"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                />
                <Textarea
                  placeholder="Instruction"
                  value={sectionPrompt}
                  onChange={(e) => setSectionPrompt(e.target.value)}
                  minRows={2}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  loading={sectionBusy}
                  disabled={!pageId || !sectionId.trim() || sectionBusy}
                  onClick={() => runSectionEdit()}
                >
                  Apply to section
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
