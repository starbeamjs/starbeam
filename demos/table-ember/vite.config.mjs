import { ember, extensions } from "@embroider/vite";
import { babel } from "@rollup/plugin-babel";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    ember(),
    babel({
      babelHelpers: "runtime",
      extensions,
    }),
  ],
});
