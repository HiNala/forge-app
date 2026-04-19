import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  /** Monorepo root (forge-app) so Turbopack does not pick a parent lockfile. */
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
