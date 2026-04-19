import Link from "next/link";
import { TemplateCard } from "@/components/marketing/template-card";
import { Container } from "@/components/ui/container";
import { TEMPLATE_CARDS } from "@/lib/marketing-content";

export function GallerySection() {
  return (
    <section className="border-t border-border py-16 sm:py-20">
      <Container max="xl">
        <div className="mx-auto max-w-[65ch] text-center">
          <h2 className="font-display text-3xl font-semibold text-text sm:text-4xl">
            What you can build
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            Six starters — each opens a live-style preview you can trace in Examples.
          </p>
        </div>
        <ul className="mt-12 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATE_CARDS.map((t) => (
            <li key={t.slug}>
              <TemplateCard
                href={`/examples/${t.slug}`}
                name={t.name}
                tag={t.tag}
                description={t.description}
              />
            </li>
          ))}
        </ul>
        <p className="mt-10 text-center">
          <Link
            href="/examples"
            className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline"
          >
            See all templates →
          </Link>
        </p>
      </Container>
    </section>
  );
}
