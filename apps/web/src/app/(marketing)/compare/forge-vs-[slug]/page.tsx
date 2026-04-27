import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { FinalCta } from "@/components/marketing/final-cta";
import {
  COMPARE_PAGES,
  COMPARE_SLUGS,
  type CompareSlug,
  compareMetadata,
} from "@/lib/compare-pages";
import { getWorkflowLanding } from "@/lib/workflow-landings";

type Props = { params: Promise<{ slug: string }> };

function isCompare(s: string): s is CompareSlug {
  return (COMPARE_SLUGS as readonly string[]).includes(s);
}

export function generateStaticParams() {
  return COMPARE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isCompare(slug)) return { title: "Not found" };
  return compareMetadata(slug);
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  if (!isCompare(slug)) notFound();
  const c = COMPARE_PAGES[slug];
  const wf = c.workflowLink.replace("/workflows/", "");
  const wfLabel = getWorkflowLanding(wf)?.label ?? "workflow";
  return (
    <Container max="lg" className="py-16 sm:py-24">
      <span className="section-label mb-4">Compare</span>
      <h1 className="mt-2 font-display text-[clamp(36px,5vw,56px)] font-bold leading-[0.95] tracking-tight text-text">
        {c.h1}
      </h1>
      <p className="mt-5 max-w-[60ch] font-body text-lg font-light leading-relaxed text-text-muted">
        {c.sub}
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-bold text-text">Where they are stronger</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-text-muted">
            {c.theyWin.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-display text-lg font-bold text-text">Where Forge fits</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-text-muted">
            {c.weWin.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 space-y-4 rounded-2xl border border-border bg-bg-elevated/40 p-6">
        <p className="font-body text-sm text-text">
          <span className="font-semibold">Choose them if: </span>
          {c.bestForThem}
        </p>
        <p className="font-body text-sm text-text">
          <span className="font-semibold">Choose Forge if: </span>
          {c.bestForUs}
        </p>
      </div>

      <p className="mt-8 font-body text-sm text-text-muted">
        Related workflow:{" "}
        <Link href={c.workflowLink} className="font-medium text-accent underline-offset-4 hover:underline">
          {wfLabel}
        </Link>
      </p>

      <div className="mt-8">
        <Link
          href="/signup?source=compare"
          className="inline-flex min-h-11 items-center rounded-xl bg-text px-6 py-3 font-body text-sm font-semibold text-bg"
        >
          Start free
        </Link>
      </div>
      <FinalCta />
    </Container>
  );
}
