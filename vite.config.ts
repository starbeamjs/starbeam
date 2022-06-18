import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: {
    disabled: true,
  },

  esbuild: {},
  build: {
    lib: {
      entry: "./packages/bundle/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) =>
        format === "cjs" ? "starbeam.cjs" : "starbeam.mjs",
    },
    minify: false,
    target: "esnext",
    rollupOptions: {
      input: {
        "starbeam.js": "./packages/bundle/index.ts",
      },
      // output: [
      //   {
      //     dir: "./dist",
      //     entryFileNames: "[name].mjs",
      //     format: "esm",
      //   },
      //   {
      //     dir: "./dist",
      //     entryFileNames: "[name].cjs",
      //     format: "cjs",
      //   },
      // ],
    },
  },
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
