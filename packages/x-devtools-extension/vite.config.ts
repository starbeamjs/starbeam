import { defineConfig } from "vite";
import mpa from "vite-plugin-mpa";

export default defineConfig({
  plugins: [mpa()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
});
