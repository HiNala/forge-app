import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getPublicTemplateBySlug, listPublicTemplateSlugs } from "@/lib/api";
import { SITE_URL } from "@/lib/marketing-content";

export const revalidate = 3600;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const slugs = await listPublicTemplateSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const t = await getPublicTemplateBySlug(slug);
    const title = `${t.name} · Example`;
    const desc =
      t.description ?? `Preview the ${t.name} template — built with Forge.`;
    return {
      title,
      description: desc,
      alternates: { canonical: `/examples/${slug}` },
      openGraph: {
        title,
        description: desc,
        url: `${SITE_URL}/examples/${slug}`,
        type: "website",
        images: t.preview_image_url ? [{ url: t.preview_image_url }] : undefined,
      },
    };
  } catch {
    return { title: "Example" };
  }
}

export default async function ExampleDetailPage({ params }: Props) {
  const { slug } = await params;
  let t: Awaited<ReturnType<typeof getPublicTemplateBySlug>>;
  try {
    t = await getPublicTemplateBySlug(slug);
  } catch {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t.name,
    description: t.description ?? undefined,
    url: `${SITE_URL}/examples/${slug}`,
  };

  return (
    <Container max="xl" className="py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{t.category}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
          {t.name}
        </h1>
        {t.description ? (
          <p className="max-w-[65ch] text-lg text-text-muted">{t.description}</p>
        ) : null}
      </div>
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <iframe
          title={`Preview: ${t.name}`}
          className="min-h-[560px] w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
          srcDoc={t.html}
        />
      </div>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href={`/signup?template=${encodeURIComponent(t.id)}`}
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 text-sm font-medium text-white shadow-sm hover:bg-accent/90"
        >
          Sign up and use this template
        </Link>
        <Link
          href="/templates"
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          Browse all templates →
        </Link>
      </div>
    </Container>
  );
}
