import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /** Required for `apps/web/Dockerfile` (standalone Node server). */
  output: "standalone",
  /** Playwright and tooling hit 127.0.0.1 while the dev server may report localhost. */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  /** Common shorthand for the signed-in shell; primary routes are `/dashboard`, `/studio`, etc. */
  async redirects() {
    return [{ source: "/app", destination: "/dashboard", permanent: false }];
  },
  /** Baseline security headers (HSTS only when NODE_ENV=production). */
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];
    if (isProd) {
      base.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers: base }];
  },
};

export default withBundleAnalyzer(nextConfig);
