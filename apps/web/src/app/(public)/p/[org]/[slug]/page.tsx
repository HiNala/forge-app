import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PDraftPreview } from "@/components/public/p-draft-preview";
import { getPublicPageApiUrl } from "@/lib/api-url";
import { injectDeckParentSearchParams } from "@/lib/deck-parent-query";
import { PUBLIC_IFRAME_SANDBOX, withPublicSrcDocSecurity } from "@/lib/public-page-html";

export const dynamic = "force-dynamic";

type PublicPayload = {
  html: string;
  title: string;
  slug: string;
  organization_slug: string;
};

async function fetchPublicPage(org: string, slug: string): Promise<PublicPayload | null> {
  const res = await fetch(getPublicPageApiUrl(org, slug), {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return (await res.json()) as PublicPayload;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ org: string; slug: string }>;
}): Promise<Metadata> {
  const { org, slug } = await params;
  const data = await fetchPublicPage(org, slug);
  if (!data) return { title: "Page" };
  return { title: data.title };
}

export default async function PublicPublishedPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; slug: string }>;
  searchParams: Promise<{
    preview?: string;
    token?: string;
    mode?: string;
    notes?: string;
    presenter?: string;
  }>;
}) {
  const { org, slug } = await params;
  const sp = await searchParams;
  if (sp.preview === "true") {
    return <PDraftPreview orgSlug={org} pageSlug={slug} />;
  }

  const data = await fetchPublicPage(org, slug);
  if (!data) notFound();

  const html = withPublicSrcDocSecurity(
    injectDeckParentSearchParams(data.html, {
      mode: sp.mode,
      notes: sp.notes,
      presenter: sp.presenter,
    }),
  );

  return (
    <iframe
      title={data.title}
      className="h-screen w-full border-0 bg-white"
      srcDoc={html}
      sandbox={PUBLIC_IFRAME_SANDBOX}
    />
  );
}
