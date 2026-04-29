import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // Fork workers occasionally hang or hit timeouts on Windows under parallel load;
    // threads pool is more reliable for local CI and dev machines.
    pool: "threads",
    maxConcurrency: 4,
  },
});
