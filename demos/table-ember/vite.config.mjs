import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { babel } from "@rollup/plugin-babel";
import { Preprocessor } from "content-tag";
import { defineConfig } from "vite";

// Standalone GTS rendering pipeline (NOT the full `ember()` app plugin).
//
// `ember()` from `@embroider/vite` assumes an Ember *app*: its `resolver()`
// loads an app config from `process.cwd()`, rewrites index.html, and (in this
// monorepo) walks up to the sibling test app. None of that fits a plain
// `renderComponent` mount, so we wire the pieces directly:
//
//   content-tag           — `.gts` <template> -> standard JS (gtsPlugin below)
//   babel.config.js       — ember-template-compilation, decorator-transforms,
//                           debug-macros, @embroider/macros
//   emberSourceModules()  — maps the `@ember/*` and `@glimmer/*` virtual
//                           modules to ember-source's own dist copies so every
//                           consumer shares one set of Glimmer instances.
//                           (Duplicate `@glimmer/*` copies break tag bridging.)
//
// This mirrors NullVoxPopuli's repl-sdk, which renders standalone GJS/GTS
// components through `@ember/renderer`.

const require = createRequire(import.meta.url);
const emberSourcePackages = dirname(
  require.resolve("ember-source/package.json"),
);
const emberSourceDist = resolve(emberSourcePackages, "dist/packages");

const preprocessor = new Preprocessor();
const GTS_EXTENSIONS = [".js", ".ts", ".gjs", ".gts"];

// `@glimmer/component` is its own published package (a direct dependency); all
// the other `@glimmer/*` and `@ember/*` specifiers live inside ember-source's
// dist and must resolve there so they are the exact instances ember-source uses
// internally. Only `@glimmer/component` is excluded.
const EMBER_VIRTUAL = /^(@ember|@glimmer)\/(.+)$/u;
const GLIMMER_COMPONENT = /^@glimmer\/component(\/|$)/u;

/**
 * Convert `.gjs`/`.gts` `<template>` syntax into standard JS before babel.
 *
 * @returns {import("vite").Plugin}
 */
function gtsPlugin() {
  return {
    name: "table-ember-content-tag",
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

/**
 * Resolve bare `@ember/*` / `@glimmer/*` imports to ember-source's dist.
 *
 * @returns {import("vite").Plugin}
 */
function emberSourceModules() {
  return {
    name: "table-ember-source-modules",
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

      // ember-source ships some specifiers as `<name>/index.js` directories
      // and others (e.g. `@glimmer/tracking/primitives/cache`) as a flat
      // `<name>.js` file. Prefer the directory entry, fall back to the file.
      const candidates = [resolve(base, "index.js"), `${base}.js`];

      return candidates.find((candidate) => existsSync(candidate)) ?? null;
    },
  };
}

export default defineConfig({
  plugins: [
    gtsPlugin(),
    emberSourceModules(),
    babel({
      babelHelpers: "runtime",
      extensions: GTS_EXTENSIONS,
    }),
  ],
  optimizeDeps: {
    // content-tag ships a wasm binary the dep optimizer cannot prebundle.
    exclude: ["content-tag"],
  },
});
