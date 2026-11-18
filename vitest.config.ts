import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
    },
  },
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/web/**/*.test.{ts,tsx}"],
    // Bound concurrent DOM work as the collection interaction suite grows.
    maxWorkers: 2,
    testTimeout: 20_000,
    restoreMocks: true,
  },
});
