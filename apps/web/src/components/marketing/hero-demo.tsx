"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { streamPublicDemo } from "@/lib/public-demo";

const PLACEHOLDERS = [
  "a booking page for my small construction business",
  "a contact form with file uploads for photographers",
  "a one-page sales proposal with accept/decline",
  "an RSVP page for a company holiday party",
  "a daily specials menu for our café",
] as const;

const CHIPS = [
  {
    label: "Booking form",
    prompt: "A simple booking form for small repair jobs with name, phone, and preferred date.",
  },
  {
    label: "Event RSVP",
    prompt: "An RSVP page for a team event with meal choice and plus-one.",
  },
  {
    label: "Sales proposal",
    prompt: "A one-page proposal with pricing tiers and a clear call to action.",
  },
] as const;

const AUTO_PROMPT = "a small jobs booking page for a contractor";

async function loadDemoFallback(): Promise<string> {
  try {
    const r = await fetch("/demo-cache/1.html");
    if (!r.ok) throw new Error(String(r.status));
    return await r.text();
  } catch {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Forge</title></head><body style="font-family:system-ui;padding:2rem;background:#f9f7f3"><p style="color:#666">Preview sample — connect the API for live generation.</p></body></html>`;
  }
}

export function HeroDemo() {
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [focused, setFocused] = useState(false);
  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [fallbackIdx, setFallbackIdx] = useState(0);
  const [carouselHtml, setCarouselHtml] = useState("");
  const interacted = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (focused) return;
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(t);
  }, [focused]);

  useEffect(() => {
    if (!fallbackMode) return;
    let cancel = false;
    void fetch(`/demo-cache/${fallbackIdx + 1}.html`)
      .then((r) => r.text())
      .then((t) => {
        if (!cancel) setCarouselHtml(t);
      });
    return () => { cancel = true; };
  }, [fallbackMode, fallbackIdx]);

  useEffect(() => {
    if (!fallbackMode) return;
    const id = setInterval(() => setFallbackIdx((i) => (i + 1) % 3), 4500);
    return () => clearInterval(id);
  }, [fallbackMode]);

  const applyFriendlyFallback = useCallback(async () => {
    setFallbackMode(true);
    setPhase("done");
    setStatusLine(null);
    setFallbackIdx(0);
    try {
      const t = await fetch("/demo-cache/1.html").then((r) => r.text());
      setCarouselHtml(t);
      setPreviewHtml(t);
    } catch {
      const fb = await loadDemoFallback();
      setCarouselHtml(fb);
      setPreviewHtml(fb);
    }
  }, []);

  const run = useCallback(
    async (prompt: string) => {
      interacted.current = true;
      setFallbackMode(false);
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      setPhase("generating");
      setStatusLine("Understanding what you need…");
      setPreviewHtml(null);
      try {
        await streamPublicDemo(
          prompt,
          {
            onIntent: () => setStatusLine("Building the page…"),
            onHtmlChunk: () => setStatusLine("Building the page…"),
            onComplete: (data) => {
              if (data.html) {
                setPreviewHtml(data.html);
                setStatusLine(null);
                setPhase("done");
              } else {
                void applyFriendlyFallback();
              }
            },
            onError: () => void applyFriendlyFallback(),
          },
          abortRef.current.signal,
        );
      } catch {
        await applyFriendlyFallback();
      }
    },
    [applyFriendlyFallback],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (interacted.current) return;
      void run(AUTO_PROMPT);
    }, 15000);
    return () => clearTimeout(t);
  }, [run]);

  const onSubmit = () => {
    const p = value.trim();
    if (!p || phase === "generating") return;
    void run(p);
  };

  const iframeDoc = fallbackMode ? carouselHtml || previewHtml : previewHtml;

  return (
    <div className="animate-fade-up-d2 mx-auto mt-10 flex w-full max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:mt-12 lg:flex-row lg:items-start lg:gap-12">
      <div className="mx-auto w-full max-w-2xl shrink-0 lg:mx-0 lg:w-[min(100%,42rem)]">
      {/* Prompt input */}
      <div className="input-focus-ring relative overflow-hidden rounded-2xl border border-border bg-surface shadow-md">
        <label className="sr-only" htmlFor="hero-prompt">
          Describe your page
        </label>
        <textarea
          id="hero-prompt"
          rows={3}
          value={value}
          onChange={(e) => {
            interacted.current = true;
            setValue(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          disabled={phase === "generating"}
          placeholder={focused ? "Describe your page…" : PLACEHOLDERS[placeholderIdx]}
          className="min-h-[100px] w-full resize-none bg-transparent px-5 pt-5 pb-3 font-body text-base text-text outline-none placeholder:text-text-muted/50 disabled:opacity-60"
          autoComplete="off"
        />
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          {statusLine ? (
            <p className="text-xs text-text-muted" role="status">
              {statusLine}
            </p>
          ) : (
            <p className="text-xs text-text-subtle">Press Enter to generate</p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!value.trim() || phase === "generating"}
            onClick={onSubmit}
            className="min-h-9 min-w-[6.5rem] shrink-0"
          >
            {phase === "generating" ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="studio-dot-wave flex gap-0.5">
                  <span className="size-1.5 rounded-full bg-current" style={{ animationDelay: "0ms" }} />
                  <span className="size-1.5 rounded-full bg-current" style={{ animationDelay: "160ms" }} />
                  <span className="size-1.5 rounded-full bg-current" style={{ animationDelay: "320ms" }} />
                </span>
                Building
              </span>
            ) : (
              "Generate →"
            )}
          </Button>
        </div>
      </div>

      {/* Quick-start chips */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="min-h-9 rounded-full border border-border bg-bg px-3.5 py-1.5 font-body text-xs font-medium text-text-muted transition-colors hover:border-accent/40 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            onClick={() => {
              interacted.current = true;
              setValue(c.prompt);
              void run(c.prompt);
            }}
            disabled={phase === "generating"}
          >
            {c.label}
          </button>
        ))}
      </div>
      </div>

      {/* Browser preview — stacks under input on narrow viewports */}
      <div className="animate-fade-up-d3 mx-auto w-full min-w-0 max-w-4xl flex-1 lg:mx-0 lg:mt-0">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-bg-elevated px-4 py-3">
            <span className="flex gap-1.5" aria-hidden>
              <span className="size-3 rounded-full bg-danger/70" />
              <span className="size-3 rounded-full bg-warning/70" />
              <span className="size-3 rounded-full bg-success/70" />
            </span>
            <div className="mx-3 flex flex-1 items-center justify-center rounded-md bg-bg px-3 py-1">
              <span className="font-body text-[11px] text-text-subtle">forge.app / preview</span>
            </div>
          </div>
          {/* Preview area */}
          <div className="bg-bg p-2">
            {iframeDoc ? (
              <iframe
                title="Page preview"
                className="h-[min(440px,58vh)] w-full rounded-2xl border border-border bg-white"
                srcDoc={iframeDoc}
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex h-[min(440px,58vh)] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-bg-elevated">
                {phase === "generating" ? (
                  <>
                    <div className="studio-dot-wave flex gap-1.5">
                      <span className="size-2 rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                      <span className="size-2 rounded-full bg-accent" style={{ animationDelay: "200ms" }} />
                      <span className="size-2 rounded-full bg-accent" style={{ animationDelay: "400ms" }} />
                    </div>
                    <p className="font-body text-sm text-text-muted">Building your page…</p>
                  </>
                ) : (
                  <p className="font-body text-sm text-text-subtle">
                    Your generated page appears here
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {fallbackMode && (
          <p className="mt-2 text-center font-body text-xs text-text-subtle" role="status">
            Showing cached samples — live generation may be rate-limited.
          </p>
        )}

        {phase === "done" && iframeDoc ? (
          <p className="mt-6 text-center font-display text-lg font-semibold text-text">
            Like what you see?
          </p>
        ) : null}

        {/* Post-demo CTAs */}
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="min-h-11 min-w-[10rem]">
            <Link href="/signup?source=hero_demo">Start free</Link>
          </Button>
          <Link
            href="/examples"
            className="min-h-11 inline-flex items-center font-body text-sm font-medium text-text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Browse examples →
          </Link>
        </div>
      </div>
    </div>
  );
}
