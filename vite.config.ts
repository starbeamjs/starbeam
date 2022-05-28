import * as path from "node:path";
import { searchForWorkspaceRoot } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@starbeam/debug": pkg("debug"),
      "@starbeam/now": pkg("now"),
      "@starbeam/timeline": pkg("timeline"),
      "@starbeam/verify": pkg("verify"),
    },
    dedupe: ['@starbeam/debug', '@starbeam/now', '@starbeam/timeline', '@starbeam/verify'],
  },

  esbuild: {
    sourcemap: true,
    sourcesContent: true,
  },

  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },

  test: {
    include: ["packages/*/tests/**/*.spec.ts"],
    outputTruncateLength: 1000,
    threads: false
  },

  define: {
    "import.meta.vitest": false,
  },
});

function pkg(name: string) {
  return path.resolve(process.cwd(), "packages", name, "index.ts");
}
