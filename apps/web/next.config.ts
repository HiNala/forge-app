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
  /** Security headers - applied to all routes */
  async headers() {
    const csp =
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' blob: data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https://api.stripe.com; " +
      "frame-src https://js.stripe.com; " +
      "frame-ancestors 'none';";
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // CSP in report-only for now; tighten after testing
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
