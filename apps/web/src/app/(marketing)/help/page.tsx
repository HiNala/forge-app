import type { Metadata } from "next";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Help",
  description: "GlideDesign help, docs, and launch guidance.",
};

const docs = [
  "Start from a template",
  "Create a product brief",
  "Edit a region",
  "Publish a mini-app",
  "Use custom domains",
  "Export code, decks, and PDFs",
];

export default function HelpPage() {
  return (
    <Container max="xl" className="grid gap-10 py-16 sm:py-24 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-[28px] border border-border bg-surface p-5 shadow-sm">
        <p className="text-caption font-bold uppercase tracking-[0.16em] text-text-muted">Docs</p>
        <nav className="mt-4 space-y-1">
          {docs.map((doc) => (
            <a key={doc} href={`#${doc.toLowerCase().replaceAll(" ", "-")}`} className="block rounded-full px-3 py-2 font-body text-sm font-semibold text-text-muted hover:bg-accent-tint hover:text-accent">
              {doc}
            </a>
          ))}
        </nav>
      </aside>
      <main>
        <h1 className="text-display-lg text-text">Help that gets you shipping.</h1>
        <p className="mt-5 max-w-2xl text-body text-text-muted">Short, practical guides for turning prompts into strategy, screens, code, and published product surfaces.</p>
        <div className="mt-10 space-y-5">
          {docs.map((doc) => (
            <section id={doc.toLowerCase().replaceAll(" ", "-")} key={doc} className="scroll-mt-24 rounded-[28px] border border-border bg-surface p-6 shadow-sm">
              <h2 className="text-h3 text-text">{doc}</h2>
              <p className="mt-3 text-body-sm text-text-muted">This guide is being expanded for launch. The GlideDesign workflow is simple: describe the outcome, review the plan, refine the surface, and ship.</p>
            </section>
          ))}
        </div>
      </main>
    </Container>
  );
}
