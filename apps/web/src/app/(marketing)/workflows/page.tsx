import type { Metadata } from "next";
import Link from "next/link";
import { WORKFLOW_LANDINGS, WORKFLOW_SLUGS } from "@/lib/workflow-landings";

export const metadata: Metadata = {
  title: "Workflows",
  description: "Explore every mini-app you can build with Forge — pages, forms, sales assets, and personal sites.",
};

export default function WorkflowsIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <h1 className="font-display text-3xl font-bold tracking-tight text-text">Workflows</h1>
      <p className="mt-2 font-body text-text-muted">
        Pick a path — each page compares Forge to the tool you might use instead.
      </p>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2">
        {WORKFLOW_SLUGS.map((slug) => {
          const w = WORKFLOW_LANDINGS[slug];
          return (
            <li key={slug}>
              <Link
                href={w.path}
                className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent"
              >
                {w.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
