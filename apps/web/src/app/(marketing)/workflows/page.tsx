import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { WORKFLOW_LANDINGS, WORKFLOW_SLUGS } from "@/lib/workflow-landings";

export const metadata: Metadata = {
  title: "Workflows",
  description: "Explore every product surface you can build with GlideDesign: pages, apps, decks, forms, proposals, and sites.",
};

export default function WorkflowsIndexPage() {
  return (
    <>
      <section className="bg-marketing-mint py-20 sm:py-28">
        <Container max="xl">
          <p className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-text-muted">
            Workflows
          </p>
          <h1 className="text-display-xl max-w-[11ch] text-marketing-ink">Build the surface your product needs.</h1>
          <p className="mt-6 max-w-2xl text-[22px] font-medium leading-[1.45] text-marketing-ink/75">
            Pick a path. GlideDesign brings strategy, screens, copy, code, and next moves together.
          </p>
        </Container>
      </section>
      <Container max="xl" className="py-16 sm:py-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW_SLUGS.map((slug, index) => {
            const w = WORKFLOW_LANDINGS[slug];
            return (
              <Link
                key={slug}
                href={w.path}
                className="group rounded-[32px] border border-border bg-surface p-6 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-8 aspect-[4/3] rounded-[24px] bg-[image:var(--brand-gradient)] p-4">
                  <div className="h-full rounded-[18px] bg-white/80" />
                </div>
                <p className="text-caption font-bold uppercase tracking-[0.16em] text-text-muted">0{(index % 9) + 1}</p>
                <h2 className="mt-2 text-h3 text-text">{w.label}</h2>
                <p className="mt-2 text-body-sm text-text-muted">{w.heroHighlight}</p>
                <span className="mt-5 inline-flex font-body text-sm font-bold text-brand-violet group-hover:underline">
                  Open workflow →
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </>
  );
}
