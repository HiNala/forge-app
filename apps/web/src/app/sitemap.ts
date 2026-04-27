import type { MetadataRoute } from "next";
import { COMPARE_SLUGS } from "@/lib/compare-pages";
import { EXAMPLES_SLUGS, SITE_URL } from "@/lib/marketing-content";
import { WORKFLOW_SLUGS } from "@/lib/workflow-landings";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/?$/, "");
  const last = new Date();
  const paths = [
    "",
    "/pricing",
    "/examples",
    "/signin",
    "/signup",
    "/terms",
    "/privacy",
    "/handoff",
    "/press",
    "/blog/introducing-forge",
  ] as const;
  const out: MetadataRoute.Sitemap = paths.map((p) => ({
    url: p === "" ? `${base}/` : `${base}${p}`,
    lastModified: last,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : 0.8,
  }));
  for (const slug of EXAMPLES_SLUGS) {
    out.push({
      url: `${base}/examples/${slug}`,
      lastModified: last,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  for (const slug of WORKFLOW_SLUGS) {
    out.push({
      url: `${base}/workflows/${slug}`,
      lastModified: last,
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }
  for (const slug of COMPARE_SLUGS) {
    out.push({
      url: `${base}/compare/forge-vs-${slug}`,
      lastModified: last,
      changeFrequency: "monthly",
      priority: 0.65,
    });
  }
  return out;
}
