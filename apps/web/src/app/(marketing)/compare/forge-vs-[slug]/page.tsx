import { redirect } from "next/navigation";
import { COMPARE_SLUGS, type CompareSlug } from "@/lib/compare-pages";

type Props = { params: Promise<{ slug: string }> };

function isCompare(s: string): s is CompareSlug {
  return (COMPARE_SLUGS as readonly string[]).includes(s);
}

export default async function LegacyCompareRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/compare/${isCompare(slug) ? slug : ""}`);
}
