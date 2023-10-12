import { resolve } from "node:path";

import { Package, rootAt } from "@starbeam-dev/core";

import externals from "./plugins/external.js";
import importMeta from "./plugins/import-meta.js";
import typescript from "./plugins/typescript.js";

const MODES = /** @type const */ (["development", "production", undefined]);

/**
 * @param {ImportMeta | string} here
 * @returns {import("rollup").RollupOptions[]}
 */
export function compile(here) {
  const pkg = Package.at(here);

  if (pkg === undefined) {
    throw new Error(`Package not found at ${rootAt(here)}`);
  }

  return compilePackage(pkg);
}

/**
 * @param {import("@starbeam-dev/core").PackageInfo} pkg
 * @returns {import("rollup").RollupOptions[]}
 */
function compilePackage(pkg) {
  return MODES.flatMap((mode) => {
    /** @type {import("rollup").Plugin[]} */
    const PLUGINS = [];

    if (mode) {
      PLUGINS.push(importMeta(mode));
    }

    return entryPoints(pkg, mode).map((options) => ({
      ...options,
      plugins: [
        ...PLUGINS,
        externals(pkg),
        typescript(mode)(pkg, {
          target: "es2022",
          module: "esnext",
          moduleDetection: "force",
          moduleResolution: "bundler",
          verbatimModuleSyntax: true,
        }),
      ],
    }));
  });
}

/**
 * @param {import("@starbeam-dev/core").PackageInfo} pkg
 * @param {"development" | "production" | undefined} mode
 * @returns {import("rollup").RollupOptions[]}
 */
function entryPoints(pkg, mode) {
  const {
    root,
    starbeam: { entry },
  } = pkg;

  /**
   * @param {[string, string]} entry
   * @returns {import("rollup").RollupOptions}
   */
  function entryPoint([exportName, ts]) {
    return {
      input: resolve(root, ts),
      output: {
        file: filename({ root, name: exportName, mode, ext: "js" }),
        format: "esm",
        sourcemap: true,
        exports: "auto",
      },
      onwarn: (warning, warn) => {
        switch (warning.code) {
          case "CIRCULAR_DEPENDENCY":
          case "EMPTY_BUNDLE":
            return;
          default:
            warn(warning);
        }
      },
    };
  }

  return Object.entries(entry).map(entryPoint);
}

/**
 *
 * @param {object} options
 * @param {string} options.root
 * @param {string} options.name
 * @param {"development" | "production" | undefined} options.mode
 * @param {"js" | "cjs"} options.ext
 * @returns {string}
 */
function filename({ root, name, mode, ext }) {
  if (mode) {
    return resolve(root, "dist", `${name}.${mode}.${ext}`);
  } else {
    return resolve(root, "dist", `${name}.${ext}`);
  }
}
