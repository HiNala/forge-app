import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { SITE_URL } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Templates",
  description: "Start from colorful GlideDesign templates for websites, mobile apps, decks, forms, proposals, and more.",
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "Templates · GlideDesign",
    description: "Pick a template. Ship something today.",
    url: `${SITE_URL}/templates`,
    type: "website",
  },
};

const filters = ["All", "Websites", "Mobile apps", "Pitch decks", "Forms", "Proposals", "Internal tools", "Launches"] as const;

const templates = Array.from({ length: 32 }, (_, index) => {
  const categories = ["Website", "Mobile app", "Pitch deck", "Form", "Proposal", "Workflow"];
  const styles = ["Bold", "Soft", "Editorial", "Neon", "Minimal", "Playful"];
  return {
    name: `${styles[index % styles.length]} ${categories[index % categories.length]}`,
    creator: ["Maya Chen", "Jon Bell", "Priya Shah", "Noah Kim", "Iris Zhao", "Sam Rivera"][index % 6],
    category: categories[index % categories.length],
    color: [
      "bg-marketing-lime",
      "bg-marketing-sky",
      "bg-marketing-coral",
      "bg-marketing-lavender",
      "bg-marketing-mustard",
      "bg-marketing-mint",
    ][index % 6],
  };
});

export default function TemplatesPage() {
  return (
    <>
      <section className="bg-marketing-ink py-20 text-white sm:py-28">
        <Container max="xl">
          <p className="mb-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-caption font-semibold uppercase tracking-[0.18em] text-white/70">
            GlideDesign templates
          </p>
          <h1 className="text-display-xl max-w-[12ch]">Pick a template. Ship something today.</h1>
          <p className="mt-6 max-w-2xl text-[22px] font-medium leading-[1.45] text-white/70">
            Colorful starting points with the strategy, screens, and export shape already wired.
          </p>
        </Container>
      </section>

      <section className="bg-bg py-12 sm:py-16">
        <Container max="xl">
          <div className="mb-10 flex flex-wrap gap-3">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className="rounded-full border border-border bg-surface px-4 py-2 font-body text-sm font-semibold text-text transition hover:bg-accent-tint hover:text-accent"
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template, index) => (
              <Link
                key={`${template.name}-${index}`}
                href={`/signup?template=${index + 1}`}
                className="group overflow-hidden rounded-[32px] border border-border bg-surface shadow-md transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className={`${template.color} aspect-[4/3] p-5`}>
                  <div className="h-full rounded-[24px] bg-white/80 p-4 shadow-xl">
                    <div className="h-4 w-28 rounded-full bg-marketing-ink/15" />
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="h-28 rounded-[18px] bg-marketing-ink/10" />
                      <div className="h-28 rounded-[18px] bg-brand-violet/15" />
                    </div>
                    <div className="mt-4 h-12 rounded-[18px] bg-brand-coral/15" />
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-caption font-semibold uppercase tracking-[0.16em] text-text-muted">{template.category}</p>
                  <h2 className="mt-2 text-h3 text-text">{template.name}</h2>
                  <p className="mt-2 text-body-sm text-text-muted">by {template.creator}</p>
                  <span className="mt-5 inline-flex rounded-full bg-[image:var(--brand-gradient)] px-4 py-2 font-body text-sm font-bold text-white opacity-0 transition group-hover:opacity-100">
                    Use this template →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
