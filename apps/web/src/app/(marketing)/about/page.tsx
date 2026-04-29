import type { Metadata } from "next";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "About",
  description: "Why GlideDesign exists and what we believe about AI product design.",
};

export default function AboutPage() {
  return (
    <>
      <section className="bg-marketing-coral py-20 sm:py-28">
        <Container max="xl">
          <h1 className="text-display-xl max-w-[10ch] text-marketing-ink">Design should move at the speed of thought.</h1>
          <p className="mt-6 max-w-3xl text-[22px] font-medium leading-[1.45] text-marketing-ink/75">
            GlideDesign exists because product teams should not have to choose between a blank design canvas and a generic chat sandbox. We believe AI design should understand the product, produce real surfaces, and give the next useful action.
          </p>
        </Container>
      </section>
      <Container max="xl" className="py-16 sm:py-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {["Craft over gimmicks", "Outcomes over tools", "Joy with discipline"].map((value) => (
            <article key={value} className="rounded-[32px] border border-border bg-surface p-6 shadow-md">
              <div className="mb-8 size-20 rounded-[24px] bg-[image:var(--brand-gradient)]" />
              <h2 className="text-h3 text-text">{value}</h2>
              <p className="mt-3 text-body-sm text-text-muted">Bold, colorful, and serious about the details that make software feel inevitable.</p>
            </article>
          ))}
        </div>
      </Container>
    </>
  );
}
