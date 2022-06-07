import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: {
    disabled: true,
  },
  esbuild: {},
  test: {
    include: [
      "packages/*/tests/**/*.spec.ts",
      // "packages/*/tests/**/*.spec.ts",
      // "framework/*/*/tests/**/*.spec.ts",
    ],
    exclude: ["packages/*/tests/node_modules/**"],
    threads: false,
    allowOnly: true,
  },
});
