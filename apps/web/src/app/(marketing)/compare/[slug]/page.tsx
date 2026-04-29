import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompareDetail } from "@/components/marketing/compare-detail";
import { COMPARE_SLUGS, type CompareSlug, compareMetadata } from "@/lib/compare-pages";

type Props = { params: Promise<{ slug: string }> };

function isCompare(s: string): s is CompareSlug {
  return (COMPARE_SLUGS as readonly string[]).includes(s);
}

export function generateStaticParams() {
  return COMPARE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isCompare(slug)) return { title: "Not found" };
  return compareMetadata(slug);
}

export default async function CompareSlugPage({ params }: Props) {
  const { slug } = await params;
  if (!isCompare(slug)) notFound();
  return <CompareDetail slug={slug} />;
}
