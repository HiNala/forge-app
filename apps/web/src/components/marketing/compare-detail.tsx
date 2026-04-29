import Link from "next/link";
import { Container } from "@/components/ui/container";
import { COMPARE_PAGES, type CompareSlug } from "@/lib/compare-pages";
import { getWorkflowLanding } from "@/lib/workflow-landings";

export function CompareDetail({ slug }: { slug: CompareSlug }) {
  const c = COMPARE_PAGES[slug];
  const wf = c.workflowLink.replace("/workflows/", "");
  const wfLabel = getWorkflowLanding(wf)?.label ?? "workflow";

  return (
    <Container max="xl" className="py-16 sm:py-24">
      <span className="section-label mb-4">Compare</span>
      <h1 className="mt-2 max-w-[12ch] text-display-lg text-text">{c.h1}</h1>
      <p className="mt-5 max-w-[60ch] text-[20px] font-medium leading-relaxed text-text-muted">
        {c.sub}
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="rounded-[32px] border border-border bg-surface p-6 shadow-md">
          <h2 className="text-h3 text-text">Where they excel</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-text-muted">
            {c.theyWin.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[32px] border border-brand-violet/30 bg-accent-tint p-6 shadow-md">
          <h2 className="text-h3 text-text">Where GlideDesign excels</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-sm text-text-muted">
            {c.weWin.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 space-y-4 rounded-[32px] border border-border bg-bg-elevated/40 p-6">
        <p className="font-body text-sm text-text">
          <span className="font-semibold">Choose them if: </span>
          {c.bestForThem}
        </p>
        <p className="font-body text-sm text-text">
          <span className="font-semibold">Choose GlideDesign if: </span>
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
          className="inline-flex min-h-11 items-center rounded-full bg-[image:var(--brand-gradient)] px-6 py-3 font-body text-sm font-semibold text-white"
        >
          Get started for free
        </Link>
      </div>
    </Container>
  );
}
