import * as path from "node:path";
import { searchForWorkspaceRoot } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@starbeam/verify": pkg("verify"),
    },
  },

  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },

  test: {
    include: ["packages/*/tests/**/*.spec.ts"],
  },

  define: {
    "import.meta.vitest": false,
  },
});

function pkg(name: string) {
  return path.resolve(process.cwd(), "packages", name, "index.ts");
}
