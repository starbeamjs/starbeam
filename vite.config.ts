import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/tests/**/*.spec.ts",
      "framework/*/*/tests/**/*.spec.ts",
    ],
    exclude: ["packages/*/tests/node_modules/**"],
    threads: false,
    allowOnly: true,
  },

  define: {
    "import.meta.vitest": false,
  },

  plugins: [],
});
