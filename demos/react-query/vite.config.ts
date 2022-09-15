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
    jsx: "automatic",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      plugins: [],
    },
  },
  build: {
    rollupOptions: {
      plugins: [],
    },
  },
});
