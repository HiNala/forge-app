import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { getPublicTemplateBySlug } from "@/lib/public-templates";
import { SITE_URL } from "@/lib/marketing-content";

/** Avoid Next 16 prerender workStore invariant with remote template fetch + large HTML. */
export const dynamic = "force-dynamic";

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
      <nav className="mb-4 flex items-center gap-1.5 font-body text-xs" aria-label="Breadcrumb">
        <Link href="/examples" className="text-text-muted underline-offset-4 hover:text-text hover:underline transition-colors">
          Examples
        </Link>
        <span className="text-border-strong">/</span>
        <span className="text-text-subtle capitalize">{t.category ?? "Template"}</span>
      </nav>

      <div className="max-w-[48ch]">
        <span className="section-label mb-3">{t.category ?? "Template"}</span>
        <h1 className="mt-2 font-display text-[clamp(36px,5vw,64px)] font-bold leading-[0.95] tracking-tight text-text">
          {t.name}
        </h1>
        {t.description ? (
          <p className="mt-4 font-body text-base font-light leading-relaxed text-text-muted">{t.description}</p>
        ) : null}
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center gap-2 border-b border-border bg-bg-elevated px-3 py-2">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2 rounded-full bg-red-400/70" />
            <span className="size-2 rounded-full bg-amber-400/70" />
            <span className="size-2 rounded-full bg-emerald-400/70" />
          </span>
          <span className="font-body text-[11px] text-text-subtle">Preview</span>
        </div>
        <iframe
          title={`Preview: ${t.name}`}
          className="min-h-[560px] w-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin"
          srcDoc={t.html}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link
          href={`/signup?template=${encodeURIComponent(t.id)}`}
          className="inline-flex min-h-11 items-center rounded-xl bg-text px-6 py-3 font-body text-sm font-semibold text-bg transition-opacity hover:opacity-80"
        >
          Use this template →
        </Link>
        <Link
          href="/examples"
          className="inline-flex min-h-11 items-center font-body text-sm font-medium text-text-muted underline-offset-4 hover:underline"
        >
          Browse all examples
        </Link>
      </div>
    </Container>
  );
}
