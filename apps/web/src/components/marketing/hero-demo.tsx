"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { streamPublicDemo } from "@/lib/public-demo";

const PLACEHOLDERS = [
  "a booking page for my small construction business",
  "a contact form with file uploads for photographers",
  "a one-page sales proposal with accept and decline",
  "an RSVP page for a company holiday party",
  "a daily specials menu for our café",
] as const;

const CHIPS = [
  {
    label: "Booking form",
    prompt:
      "A simple booking form for small repair jobs with name, phone, and preferred date.",
  },
  {
    label: "Event RSVP",
    prompt:
      "An RSVP page for a team event with meal choice and plus-one.",
  },
  {
    label: "Sales proposal",
    prompt:
      "A one-page proposal with pricing tiers and a clear call to action.",
  },
] as const;

const AUTO_PROMPT =
  "A small jobs booking page for a contractor with name, phone, job description, and preferred date.";

async function loadDemoFallback(): Promise<string> {
  try {
    const r = await fetch("/demo-cache/1.html");
    if (!r.ok) throw new Error(String(r.status));
    return await r.text();
  } catch {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Forge</title></head><body style="font-family:system-ui;padding:2rem;background:#f9f7f3"><p>Preview sample — connect the API for live generation.</p></body></html>`;
  }
}

/** Interactive hero demo: textarea, chips, SSE preview, carousel fallback when API unavailable. */
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
    return () => {
      cancel = true;
    };
  }, [fallbackMode, fallbackIdx]);

  useEffect(() => {
    if (!fallbackMode) return;
    const id = setInterval(() => {
      setFallbackIdx((i) => (i + 1) % 3);
    }, 4500);
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
            onError: () => {
              void applyFriendlyFallback();
            },
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
    <div className="mx-auto mt-10 max-w-2xl lg:mt-12">
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
        className="min-h-[120px] w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 font-body text-base text-text shadow-sm outline-none transition-[box-shadow] [-webkit-tap-highlight-color:transparent] placeholder:text-text-subtle focus:border-accent focus:ring-2 focus:ring-accent-mid disabled:opacity-60"
        autoComplete="off"
      />
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {statusLine ? (
          <p className="mr-auto text-sm text-text-muted" role="status">
            {statusLine}
          </p>
        ) : null}
        <Button
          type="button"
          size="lg"
          disabled={!value.trim() || phase === "generating"}
          onClick={onSubmit}
          className="min-h-11 min-w-[7rem]"
        >
          {phase === "generating" ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" aria-hidden />
              Generating
            </span>
          ) : (
            "Generate"
          )}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            className="min-h-11 rounded-full border border-border bg-bg-elevated px-4 py-2 text-sm text-text-muted transition-colors [-webkit-tap-highlight-color:transparent] hover:border-accent-mid hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

      <div className="mx-auto mt-10 max-w-4xl lg:mt-14">
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-md">
          <div className="flex items-center gap-2 border-b border-border bg-bg-elevated px-3 py-2.5">
            <span className="inline-flex gap-1.5" aria-hidden>
              <span className="h-3 w-3 rounded-full bg-danger/80" />
              <span className="h-3 w-3 rounded-full bg-warning/80" />
              <span className="h-3 w-3 rounded-full bg-success/80" />
            </span>
            <div className="ml-2 flex-1 rounded-md bg-bg px-3 py-1 text-center text-xs text-text-subtle">
              forge.app / preview
            </div>
          </div>
          <div className="bg-bg p-2">
            {iframeDoc ? (
              <iframe
                title="Page preview"
                className="h-[min(420px,55vh)] w-full rounded-md border border-border bg-white"
                srcDoc={iframeDoc}
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex h-[min(420px,55vh)] w-full items-center justify-center rounded-md border border-dashed border-border bg-bg-elevated text-sm text-text-muted">
                {phase === "generating"
                  ? "Streaming preview…"
                  : "Your generated page appears here."}
              </div>
            )}
          </div>
        </div>
        {fallbackMode ? (
          <p className="mt-2 text-center text-xs text-text-subtle font-body" role="status">
            Showing cached samples — live generation may be rate-limited or offline.
          </p>
        ) : null}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="secondary" size="lg" className="min-h-11">
            <Link href="/signup?source=hero_demo">Like what you see? Start free</Link>
          </Button>
          <Link
            href="/examples"
            className="min-h-11 inline-flex items-center text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Browse templates →
          </Link>
        </div>
      </div>
    </div>
  );
}
