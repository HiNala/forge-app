import type { MetadataRoute } from "next";
import { EXAMPLES_SLUGS, SITE_URL } from "@/lib/marketing-content";

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
  return out;
}
