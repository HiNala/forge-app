"use client";

import {
  FileSignature,
  FileText,
  Layout,
  MonitorSmartphone,
  PanelTop,
  Presentation,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { WORKFLOW_LANDINGS, WORKFLOW_SLUGS, type WorkflowSlug } from "@/lib/workflow-landings";
import { cn } from "@/lib/utils";

const ROTATE_MS = 7000;

const ICONS: Record<WorkflowSlug, React.ReactNode> = {
  "mobile-app": <MonitorSmartphone className="size-[50px] stroke-[1.35]" />,
  website: <Layout className="size-[50px] stroke-[1.35]" />,
  "contact-form": <FileText className="size-[50px] stroke-[1.35]" />,
  proposal: <FileSignature className="size-[50px] stroke-[1.35]" />,
  "pitch-deck": <Presentation className="size-[50px] stroke-[1.35]" />,
  "landing-page": <PanelTop className="size-[50px] stroke-[1.35]" />,
};

export function WorkflowHeroPanel() {
  const [i, setI] = React.useState(0);
  const slug = WORKFLOW_SLUGS[i % WORKFLOW_SLUGS.length] as WorkflowSlug;
  const active = WORKFLOW_LANDINGS[slug];

  React.useEffect(() => {
    const t = setInterval(() => {
      setI((v) => (v + 1) % WORKFLOW_SLUGS.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-8 space-y-8">
      <p
        className="mx-auto max-w-[50ch] text-center font-body text-sm font-light leading-relaxed text-text-subtle"
        key={active.slug}
      >
        <span className="font-medium text-text-muted">Now showing: </span>
        {active.tileLabel} — {active.heroHighlight}
      </p>

      <ul className="mx-auto grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
        {WORKFLOW_SLUGS.map((s) => {
          const w = WORKFLOW_LANDINGS[s];
          const isOn = s === slug;
          return (
            <li key={s}>
              <Link
                href={w.path}
                className={cn(
                  "flex h-full flex-col rounded-2xl border p-4 transition-[border-color,box-shadow,transform] sm:p-5",
                  isOn
                    ? "border-accent/50 bg-bg-elevated shadow-sm ring-1 ring-accent/20"
                    : "border-border bg-surface hover:border-accent/30 hover:shadow-sm",
                )}
              >
                <span className="text-text transition-transform duration-500 [&_svg]:text-accent" aria-hidden>
                  {ICONS[s]}
                </span>
                <span className="mt-3 font-display text-[15px] font-bold leading-tight text-text sm:text-base">
                  {w.tileLabel}
                </span>
                <span className="mt-1.5 line-clamp-2 font-body text-xs font-light leading-snug text-text-muted sm:text-sm">
                  {w.heroHighlight}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
