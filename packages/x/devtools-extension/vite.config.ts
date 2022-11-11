import { crx } from "@crxjs/vite-plugin";
import { dirname } from "dirfilename";
import { resolve } from "path";
import { defineConfig } from "vite";

import manifest from "./manifest.json";

const root = dirname(import.meta.url);

export default defineConfig({
  base: "/",
  resolve: {
    alias: {
      "@": resolve(root, "src"),
      "@assets": resolve(root, "assets"),
    },
  },
  build: {
    minify: false,
    rollupOptions: {
      input: {
        "debug.js": resolve(root, "src/coordination/debug.ts"),
        pane: resolve(root, "src/panes/main/index.html"),
      },
    },
  },

  // @ts-expect-error
  plugins: [crx({ manifest })],
});
