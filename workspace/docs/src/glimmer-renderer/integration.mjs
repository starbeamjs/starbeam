// Local Astro integration that teaches Astro how to render Glimmer (`.gts`)
// islands and how to compile `.gts` sources through Vite.
//
// Two responsibilities:
//
//   1. `addRenderer` registers a renderer named `gts` so that a `.gts` island
//      with `client:only="gts"` resolves to it by extension. The
//      `serverEntrypoint`'s `check` returns false so SSR never claims the
//      island; Astro 5 still requires the entrypoint to be present.
//
//   2. `updateConfig({ vite })` injects the same standalone GTS pipeline the
//      `@starbeam-demos/table-ember` package uses (content-tag + babel +
//      ember-source virtual-module resolution), scoped via `include` to the
//      Ember shell and its docs wrapper so it never touches other framework
//      islands.
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { babel } from "@rollup/plugin-babel";
import { Preprocessor } from "content-tag";

const require = createRequire(import.meta.url);
const emberSourcePackages = dirname(
  require.resolve("ember-source/package.json"),
);
const emberSourceDist = resolve(emberSourcePackages, "dist/packages");
const babelConfigPath = fileURLToPath(
  new URL("babel.config.mjs", import.meta.url),
);

const preprocessor = new Preprocessor();
const GTS_EXTENSIONS = [".gjs", ".gts"];
const EMBER_VIRTUAL = /^(@ember|@glimmer)\/(.+)$/u;
const GLIMMER_COMPONENT = /^@glimmer\/component(\/|$)/u;

/** @returns {import('vite').Plugin} */
function gtsPlugin() {
  return {
    name: "starbeam-glimmer-content-tag",
    enforce: "pre",
    transform(code, id) {
      if (!/\.g[jt]s$/u.test(id)) {
        return null;
      }

      const result = preprocessor.process(code, { filename: id });

      return { code: result.code, map: result.map };
    },
  };
}

/** @returns {import('vite').Plugin} */
function emberSourceModules() {
  return {
    name: "starbeam-glimmer-source-modules",
    enforce: "pre",
    resolveId(source) {
      if (GLIMMER_COMPONENT.test(source)) {
        return null;
      }

      const match = EMBER_VIRTUAL.exec(source);

      if (!match) {
        return null;
      }

      const scope = match[1];
      const rest = match[2];

      if (scope === undefined || rest === undefined) {
        return null;
      }

      const base = resolve(emberSourceDist, scope, rest);
      const candidates = [resolve(base, "index.js"), `${base}.js`];

      return candidates.find((candidate) => existsSync(candidate)) ?? null;
    },
  };
}

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
              gtsPlugin(),
              emberSourceModules(),
              babel({
                babelHelpers: "runtime",
                extensions: [...GTS_EXTENSIONS, ".js"],
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
