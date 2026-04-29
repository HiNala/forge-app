"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { PageDetailOut } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function WarRoomAgentsDrawer({ onClose, page }: { onClose: () => void; page: PageDetailOut }) {
  const report = page.last_review_report as Record<string, unknown> | undefined;
  const findingLines: string[] = Array.isArray(report?.findings)
    ? (report!.findings as unknown[]).slice(0, 6).map((f, i) => {
        if (f && typeof f === "object" && "message" in f && typeof (f as { message?: unknown }).message === "string") {
          return (f as { message: string }).message;
        }
        return `Finding ${i + 1}`;
      })
    : [];

  const codeHint = layerCodeHint(page);

  const agents = [
    { id: "pm", title: "PM", body: findingLines[0] ?? "Scope & loop checks populate from review runs after ship." },
    { id: "design", title: "Designer", body: findingLines[1] ?? "Accessibility and layout notes attach to review findings." },
    { id: "growth", title: "Growth", body: "Growth opportunities surface in Strategy and the action dock." },
    { id: "eng", title: "Engineer", body: codeHint },
  ] as const;

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-end">
      <button type="button" className="absolute inset-0 bg-black/35" aria-label="Close agents" onClick={onClose} />
      <aside
        aria-label="Agents"
        className="relative flex max-h-[100dvh] w-[min(100vw,440px)] flex-col border-l border-border bg-surface p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-base font-semibold text-text">Multi-agent critiques</p>
            <p className="text-[11px] text-text-muted">BP-01 review payloads. Discuss turns remain cost-bounded.</p>
          </div>
          <Button type="button" variant="ghost" size="sm" className="size-9 p-0" onClick={onClose} aria-label="Close panel">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {agents.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-bg-elevated/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{a.title}</p>
              <p className="mt-2 text-[13px] leading-snug text-text">{a.body}</p>
              <Button type="button" variant="secondary" size="sm" className="mt-2" disabled>
                Discuss (soon)
              </Button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function layerCodeHint(page: PageDetailOut) {
  const r = page.last_review_report as Record<string, unknown> | undefined;
  const fl = r?.bp01_four_layer as Record<string, unknown> | undefined;
  const code = (fl?.layer3_code ?? r?.layer3_code) as Record<string, unknown> | undefined;
  if (code && typeof code === "object") return JSON.stringify(code).slice(0, 400);
  return "Layer 3 code appears when orchestration emits TSX/Tailwind payloads.";
}
