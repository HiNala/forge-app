import path from "node:path";
import { fileURLToPath } from "node:url";
import bundleAnalyzer from "@next/bundle-analyzer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "1",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  /** Monorepo root (forge-app) so Turbopack does not pick a parent lockfile. */
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default withAnalyzer(nextConfig);
