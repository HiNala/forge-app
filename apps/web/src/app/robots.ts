import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/marketing-content";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/?$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app/",
        "/api/",
        "/admin/",
        "/dashboard",
        "/onboarding",
        "/studio",
        "/pages/",
        "/analytics/",
        "/settings/",
        "/dev/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
