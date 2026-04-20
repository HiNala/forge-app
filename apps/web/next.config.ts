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
};

export default withBundleAnalyzer(nextConfig);
