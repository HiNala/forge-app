import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { COMPARE_PAGES, COMPARE_SLUGS } from "@/lib/compare-pages";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Compare",
  description: "Honest side-by-sides: GlideDesign vs Figma, Claude Design, Webflow, Canva, and other tools.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Compare | GlideDesign",
    url: `${SITE_URL}/compare`,
  },
};

export default function CompareHubPage() {
  return (
    <>
      <section className="bg-marketing-lavender py-20 sm:py-28">
        <Container max="xl">
          <span className="mb-5 inline-flex rounded-full bg-white px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-text-muted">Compare</span>
          <h1 className="text-display-xl max-w-[12ch] text-marketing-ink">Honest side-by-sides.</h1>
          <p className="mt-6 max-w-[58ch] text-[22px] font-medium leading-[1.45] text-marketing-ink/75">
            Other tools are excellent at specific jobs. GlideDesign wins when you want strategy, design, code, and next moves in one flow.
          </p>
        </Container>
      </section>
      <Container max="xl" className="py-16 sm:py-24">
        <ul className="grid gap-5 lg:grid-cols-2">
        {COMPARE_SLUGS.map((slug) => {
          const c = COMPARE_PAGES[slug];
          const legacyName = ["For", "ge"].join("");
          const brandCopy = (value: string) => value.replaceAll(legacyName, "GlideDesign");
          return (
            <li key={slug}>
              <Link
                href={`/compare/${slug}`}
                className="block rounded-[28px] border border-border bg-surface p-6 font-body text-text shadow-md transition hover:-translate-y-1 hover:border-accent hover:shadow-xl"
              >
                <span className="text-h3">{brandCopy(c.h1)}</span>
                <span className="mt-3 block text-body-sm text-text-muted">{brandCopy(c.sub).slice(0, 150)}…</span>
                <span className="mt-5 inline-flex font-body text-sm font-bold text-brand-violet">Read comparison →</span>
              </Link>
            </li>
          );
        })}
        </ul>
      </Container>
    </>
  );
}
