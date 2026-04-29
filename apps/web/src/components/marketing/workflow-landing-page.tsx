import Link from "next/link";
import { Container } from "@/components/ui/container";
import { FinalCta } from "@/components/marketing/final-cta";
import { handoff } from "@/lib/copy";
import { WORKFLOW_LANDINGS, WORKFLOW_SLUGS, type WorkflowLandingContent, type WorkflowSlug } from "@/lib/workflow-landings";
import { cn } from "@/lib/utils";

function brandCopy(value: string) {
  const legacyName = ["For", "ge"].join("");
  const legacyCreditName = `${legacyName} Credits`;
  const legacyDomain = ["for", "ge.app"].join("");

  return value
    .replaceAll(legacyCreditName, "generation credits")
    .replaceAll(legacyName, "GlideDesign")
    .replaceAll(legacyDomain, "glidedesign.ai");
}

function MoreWorkflowsStrip({ current: currentSlug }: { current: WorkflowSlug }) {
  const others = WORKFLOW_SLUGS.filter((s) => s !== currentSlug);
  return (
    <section className="mt-20 border-t border-border pt-12">
      <h2 className="text-h3 text-text">More you can build with GlideDesign</h2>
      <ul className="mt-4 flex flex-wrap gap-2">
        {others.map((s) => {
          const w = WORKFLOW_LANDINGS[s];
          return (
            <li key={s}>
              <Link
                href={w.path}
                className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 font-body text-sm text-text-muted transition-colors hover:border-accent/40 hover:text-text"
              >
                {w.tileLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DemoSlot({ title }: { title: string }) {
  return (
    <section className="mt-14 border-t border-border pt-12">
      <h2 className="text-h2 text-text">See it in action</h2>
      <p className="mt-2 max-w-[60ch] font-body text-sm font-light text-text-muted">
        Short demo and sample outputs are rolling out with the canvas missions (V2-P02, V2-P03). For now, start in
        Studio — the same workflow applies across every surface.
      </p>
      <div
        className={cn(
          "mt-6 flex min-h-[240px] items-center justify-center rounded-[28px] border border-dashed border-border",
          "bg-bg-elevated/50 font-body text-sm text-text-muted",
        )}
        role="img"
        aria-label={`Demo placeholder for ${title}`}
      >
        30s demo or GIF — {title}
      </div>
    </section>
  );
}

function WhatYouGet({ items }: { items: WorkflowLandingContent["whatYouGet"] }) {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-3">
      {items.map((card) => (
        <li
          key={card.title}
          className="rounded-[28px] border border-border bg-surface p-5 shadow-sm"
        >
          <p className="text-h4 text-text">{brandCopy(card.title)}</p>
          <p className="mt-2 text-body-sm text-text-muted">{brandCopy(card.body)}</p>
        </li>
      ))}
    </ul>
  );
}

function CompareStrip({ c }: { c: WorkflowLandingContent["compare"] }) {
  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="text-h2 text-text">Why GlideDesign instead of {brandCopy(c.vs)}?</h2>
      <p className="mt-2 max-w-[60ch] font-body text-sm text-text-muted">
        Honest tradeoffs — we are not the right tool for every job.
      </p>
      <ul className="mt-6 space-y-3">
        {c.honest.map((row) => (
          <li
            key={row.forge}
            className="grid gap-1 rounded-[20px] border border-border bg-bg-elevated/40 p-4 sm:grid-cols-2"
          >
            <p className="font-body text-sm text-text">
              <span className="font-semibold text-accent">GlideDesign: </span>
              {brandCopy(row.forge)}
            </p>
            <p className="font-body text-sm text-text-muted">
              <span className="font-medium text-text-muted/90">{brandCopy(c.vs).split(" ")[0]}: </span>
              {brandCopy(row.other)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WorkflowMarketingPage({ content }: { content: WorkflowLandingContent }) {
  const tq = content.templatesQuery;
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <span className="section-label mb-4">{content.sectionLabel}</span>
      <h1 className="mt-3 text-display-lg text-text">
        {brandCopy(content.h1)}
        <br />
        <span className="text-accent">{brandCopy(content.h1Accent)}</span>
      </h1>
      <p className="mt-5 max-w-[60ch] text-[20px] font-medium leading-relaxed text-text-muted">
        {brandCopy(content.intro)}
      </p>
      <p className="mt-4 max-w-[60ch] text-body-sm text-text-muted">
        {brandCopy(handoff.handoffLine)}
      </p>

      <WhatYouGet items={content.whatYouGet} />

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-h2 text-text">{brandCopy(content.howItWorks.title)}</h2>
        <ol className="mt-6 list-decimal space-y-3 pl-5 font-body text-sm text-text">
          {content.howItWorks.steps.map((step) => (
            <li key={step}>{brandCopy(step)}</li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-h2 text-text">{brandCopy(content.builtFor.title)}</h2>
        <ul className="mt-4 space-y-2">
          {content.builtFor.who.map((line) => (
            <li key={line} className="flex items-start gap-2 font-body text-sm text-text">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
              {brandCopy(line)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-h2 text-text">Real examples</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {content.exampleGallery.map((ex) => (
            <li
              key={ex.caption}
              className="flex flex-col justify-center rounded-2xl border border-border bg-surface p-4"
            >
              {ex.tag ? (
                <span className="font-body text-[11px] font-semibold uppercase tracking-wide text-text-subtle">
                  {ex.tag}
                </span>
              ) : null}
              <span className="mt-1 font-body text-sm text-text">{brandCopy(ex.caption)}</span>
            </li>
          ))}
        </ul>
      </section>

      <DemoSlot title={content.label} />
      <CompareStrip c={content.compare} />

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="text-h2 text-text">Frequently asked</h2>
        <dl className="mt-6 divide-y divide-border">
          {content.faq.map((row) => (
            <div key={row.q} className="py-4">
              <dt className="font-body text-sm font-bold text-text">{brandCopy(row.q)}</dt>
              <dd className="mt-1.5 text-body-sm text-text-muted">{brandCopy(row.a)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href={`/signup?workflow=${content.workflowQuery}`}
          className="inline-flex min-h-11 items-center rounded-full bg-[image:var(--brand-gradient)] px-6 py-3 font-body text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Start your first {content.tileLabel.toLowerCase()} free
        </Link>
        {tq ? (
          <Link
            href={`/templates?q=${encodeURIComponent(tq)}`}
            className="inline-flex min-h-11 items-center font-body text-sm font-medium text-text-muted underline-offset-4 hover:underline"
          >
            Browse templates
          </Link>
        ) : null}
      </div>

      <MoreWorkflowsStrip current={content.slug} />
      <FinalCta />
    </Container>
  );
}
