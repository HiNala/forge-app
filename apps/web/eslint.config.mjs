import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  {
    files: ["src/components/studio/studio-workspace.tsx"],
    rules: {
      // Syncs chat draft / origin with external store — valid; rule is overly strict here.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: [
      "src/app/(app)/settings/brand/page.tsx",
      "src/app/(app)/settings/profile/page.tsx",
    ],
    rules: {
      // Logos/avatars use arbitrary HTTPS URLs (MinIO, S3, Clerk); `next/image` remotePatterns cannot enumerate every tenant bucket.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright artifacts (generated JS — not project source)
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
