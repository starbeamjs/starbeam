import { defineConfig } from "vitest/config";

const BUNDLED_EXTERNAL_PACKAGES = [
  "stacktracey",
  "as-table",
  "printable-characters",
  "get-source",
  "data-uri-to-buffer",
  "source-map",
];

const EXTERNAL_PACKAGES = ["react", "react-dom"];

export default defineConfig({
  optimizeDeps: {
    include: ["stacktracey"],
  },

  esbuild: {},
  build: {
    lib: {
      entry: "./packages/bundle/src/vanilla.ts",
      formats: ["es", "cjs"],
      fileName: (format) =>
        format === "cjs" ? "starbeam.cjs" : "starbeam.mjs",
    },
    minify: false,
    target: "esnext",

    rollupOptions: {
      input: {
        "starbeam.js": "./packages/bundle/src/vanilla.ts",
        "starbeam-react.js": "./packages/bundle/src/react.ts",
      },
      external: (id, from) => {
        if (id.startsWith(".") || id.startsWith("/")) {
          return false;
        } else if (id.startsWith("@starbeam")) {
          return false;
        } else if (BUNDLED_EXTERNAL_PACKAGES.includes(id)) {
          return false;
        } else if (EXTERNAL_PACKAGES.includes(id)) {
          return true;
        } else {
          console.warn(`Unexpected external package: ${id}`, { from });
          return true;
        }
      },

      output: [
        {
          dir: "./dist",
          entryFileNames: "[name].[format]",
          chunkFileNames: "[name].shared.[format]",
          format: "es",
        },
        {
          dir: "./dist",
          entryFileNames: "[name].[format]",
          chunkFileNames: "[name].shared.[format]",
          format: "cjs",
        },
      ],
    },
  },
  test: {
    include: ["**/*.spec.ts"],
    exclude: ["**/node_modules/**"],
    // threads: false,
    // allowOnly: true,
  },
});
