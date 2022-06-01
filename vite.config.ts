import * as path from "node:path";
import { searchForWorkspaceRoot } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: packages(
    "@starbeam/debug",
    "@starbeam/now",
    "@starbeam/timeline",
    "@stabeam/utils",
    "@starbeam/verify"
  ),

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
    exclude: ["tests/**", "@starbeam/**", "packages/*/tests/node_modules/**"],
    outputTruncateLength: 1000,
    threads: false,
  },

  define: {
    "import.meta.vitest": false,
  },
});

function packages(...list: string[]) {
  const packages = Object.fromEntries(
    list.map((name) => [`@starbeam/${name}`, pkg(name)])
  );

  return {
    alias: packages,
    dedupe: Object.keys(packages),
  };
}

function pkg(name: string) {
  return path.resolve(process.cwd(), "packages", name, "index.ts");
}
