import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import {
  EXAMPLES_SLUGS,
  SITE_URL,
  TEMPLATE_CARDS,
  type ExampleSlug,
} from "@/lib/marketing-content";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return EXAMPLES_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!EXAMPLES_SLUGS.includes(slug as ExampleSlug)) {
    return { title: "Example" };
  }
  const card = TEMPLATE_CARDS.find((c) => c.slug === slug);
  return {
    title: card ? `${card.name} · Example` : "Example",
    description: card?.description,
    openGraph: {
      title: card ? `${card.name} · Forge` : "Example",
      url: `${SITE_URL}/examples/${slug}`,
    },
  };
}

export default async function ExampleDetailPage({ params }: Props) {
  const { slug } = await params;
  if (!EXAMPLES_SLUGS.includes(slug as ExampleSlug)) notFound();
  const card = TEMPLATE_CARDS.find((c) => c.slug === slug)!;
  const previewSrc = `/examples/previews/${slug}.html`;

  return (
    <Container max="xl" className="py-12 sm:py-16">
      <p className="text-sm text-text-muted">
        <Link href="/examples" className="text-accent hover:underline">
          ← Examples
        </Link>
      </p>
      <h1 className="mt-4 max-w-[65ch] font-display text-3xl font-semibold text-text">
        {card.name}
      </h1>
      <p className="mt-3 max-w-[65ch] text-text-muted">{card.description}</p>
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-md">
        <div className="flex items-center gap-2 border-b border-border bg-bg-elevated px-3 py-2">
          <span className="inline-flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          </span>
          <span className="ml-2 flex-1 truncate rounded-md bg-bg px-2 py-1 text-center text-xs text-text-subtle">
            forge.app / preview / {slug}
          </span>
        </div>
        <div className="bg-bg p-2">
          <iframe
            title={`Preview: ${card.name}`}
            className="h-[min(480px,70vh)] w-full rounded-md border border-border bg-white"
            src={previewSrc}
            loading="lazy"
          />
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={`/signup?source=example_${slug}`}
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-medium text-white shadow-sm hover:brightness-105"
        >
          Start with this pattern
        </Link>
        <Link
          href="/pricing"
          className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Compare plans
        </Link>
      </div>
    </Container>
  );
}
