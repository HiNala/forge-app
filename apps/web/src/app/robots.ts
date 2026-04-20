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
        "/p/",
        "/dashboard",
        "/onboarding",
        "/studio",
        "/pages/",
        "/analytics/",
        "/templates/",
        "/settings/",
        "/admin",
        "/admin/",
        "/automations",
        "/notifications",
        "/submissions",
        "/oauth",
        "/signin",
        "/signup",
        "/dev/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
