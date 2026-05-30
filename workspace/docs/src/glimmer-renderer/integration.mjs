// Local Astro integration that teaches Astro how to render Glimmer (`.gts`)
// islands and how to compile Ember/GTS sources through Vite.
//
// Two responsibilities:
//
//   1. `addRenderer` registers a renderer named `gts` so that a `.gts` island
//      with `client:only="gts"` resolves to it by extension. The
//      `serverEntrypoint`'s `check` returns false so SSR never claims the
//      island; Astro 5 still requires the entrypoint to be present.
//
//   2. `updateConfig({ vite })` injects Embroider's Vite plugin plus the
//      same Babel pass the standalone Ember demo uses, scoped via `include`
//      to the Ember shell, its docs wrapper, and ember-source dist files that
//      still contain `@embroider/macros` calls.
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ember, extensions } from "@embroider/vite";
import { babel } from "@rollup/plugin-babel";

const require = createRequire(import.meta.url);
const emberSourcePackages = dirname(
  require.resolve("ember-source/package.json"),
);
const emberSourceDist = resolve(emberSourcePackages, "dist/packages");
const babelConfigPath = fileURLToPath(
  new URL("babel.config.mjs", import.meta.url),
);

/** @returns {import('astro').AstroIntegration} */
export default function starbeamGlimmer() {
  return {
    name: "@starbeam/astro-glimmer",
    hooks: {
      "astro:config:setup": ({ addRenderer, updateConfig }) => {
        addRenderer({
          // Named `gts` so Astro's `client:only` resolution matches it by file
          // extension: a `.gts` island with `client:only="gts"` resolves here.
          // Astro hardcodes its `clientOnlyValues` set (react/preact/vue/
          // svelte/solid-js), so a descriptive name like
          // `@starbeam/astro-glimmer` never matches and Astro throws
          // `NoClientOnlyHint` at build.
          name: "gts",
          clientEntrypoint: fileURLToPath(
            new URL("client.js", import.meta.url),
          ),
          // Astro requires a server entrypoint even for client-only
          // renderers; this one's `check` always returns false so nothing
          // server-renders. See server.js.
          serverEntrypoint: fileURLToPath(
            new URL("server.js", import.meta.url),
          ),
        });

        updateConfig({
          vite: {
            optimizeDeps: {
              // content-tag ships a wasm binary the dep optimizer cannot
              // prebundle.
              exclude: ["content-tag"],
            },
            plugins: [
              ember(),
              babel({
                babelHelpers: "runtime",
                extensions,
                configFile: babelConfigPath,
                include: [
                  "**/demos/table-ember/src/**/*.{gjs,gts}",
                  "**/components/EmberInventoryDemo.gts",
                  // ember-source ships its `@ember/*` / `@glimmer/*` dist as
                  // plain `.js` that still contains `@embroider/macros` calls
                  // (e.g. `isDevelopingApp()`); babel must run over it so those
                  // macros are compiled out before the island hydrates.
                  `${emberSourceDist}/**/*.js`,
                ],
              }),
            ],
          },
        });
      },
    },
  };
}
