import type { Metadata } from "next";
import Link from "next/link";
import { TemplateCard } from "@/components/marketing/template-card";
import { Container } from "@/components/ui/container";
import { SITE_URL, TEMPLATE_CARDS } from "@/lib/marketing-content";

export const metadata: Metadata = {
  title: "Examples",
  description:
    "Hand-picked template previews — booking, RSVP, menus, proposals, and more built with Forge.",
  alternates: { canonical: "/examples" },
  openGraph: {
    title: "Examples · Forge",
    description: "See what Forge generates for real use cases.",
    url: `${SITE_URL}/examples`,
    type: "website",
  },
};

export default function ExamplesPage() {
  return (
    <Container max="xl" className="py-12 sm:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-text sm:text-5xl">
        Examples
      </h1>
      <p className="mt-4 max-w-[65ch] text-lg text-text-muted">
        Curated starters — open any card for a static preview. Live template API hooks land with the
        templates mission.
      </p>
      <ul className="mt-12 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_CARDS.map((item) => (
          <li key={item.slug}>
            <TemplateCard
              href={`/examples/${item.slug}`}
              name={item.name}
              tag={item.tag}
              description={item.description}
            />
          </li>
        ))}
      </ul>
      <p className="mt-12 text-center">
        <Link
          href="/signup?source=examples"
          className="inline-flex min-h-11 items-center font-medium text-accent underline-offset-4 hover:underline"
        >
          Start free →
        </Link>
      </p>
    </Container>
  );
}
