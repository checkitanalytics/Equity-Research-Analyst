import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "tests/unit/**/*.{test,spec}.ts",
      "client/src/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["dist", "node_modules", "tests/e2e"],
  },
});
