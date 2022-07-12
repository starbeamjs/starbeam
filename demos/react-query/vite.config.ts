import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { VitePluginFonts } from "vite-plugin-fonts";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    VitePluginFonts({
      google: {
        families: ["Roboto:wght@300;400;500;700"],
        display: "swap",
        preconnect: true,
      },
    }),
  ],
  esbuild: {
    jsxFactory: "_jsx",
    jsxFragment: "_jsxFragment",
    jsxInject: `import { createElement as _jsx, Fragment as _jsxFragment } from 'react'`,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
        }),
      ],
    },
  },
  build: {
    rollupOptions: {
      plugins: [],
    },
  },
});
