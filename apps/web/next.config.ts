import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Playwright and tooling hit 127.0.0.1 while the dev server may report localhost. */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
