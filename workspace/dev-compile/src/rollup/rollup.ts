import { execSync } from 'node:child_process';
import { join, resolve } from "node:path";

import terser from '@rollup/plugin-terser';
import { Package, type PackageInfo, rootAt } from "@starbeam-dev/core";
import type { RollupOptions } from "rollup";
import copy from 'rollup-plugin-copy'

import externals from "./plugins/external.js";
import importMeta from "./plugins/import-meta.js";
import typescript from "./plugins/typescript.js";
import type { RollupPlugin } from "./utils.js";

const MODES = ["development", "production", undefined] as const;

interface CompileOptions {
  /**
   * Copy the changelog from the root of the monorepo.
   * true by default
   */
  copyRootChangelog?: boolean;
}

export function compile(here: ImportMeta | string, options?: CompileOptions): RollupOptions[] {
  const pkg = Package.at(here);

  if (pkg === undefined) {
    throw new Error(`Package not found at ${rootAt(here)}`);
  }

  return compilePackage(pkg, options || {});
}

function copyRootChangelog(pkg: PackageInfo): RollupPlugin {
  const monorepoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8', cwd: pkg.root }).trim();
  const rootChangelog = join(monorepoRoot, 'CHANGELOG.md');

  // this plugin does not provide types
  const includeChangelog = copy({
    targets: [
      {
        src: rootChangelog,
        dest: '.',
      }
    ],
  });

  return includeChangelog;

}

/**
 * @param {import("@starbeam-dev/core").PackageInfo} pkg
 * @param {CompileOptions} options
 * @returns {import("rollup").RollupOptions[]}
 */
function compilePackage(pkg: PackageInfo, options: CompileOptions): RollupOptions[] {
  return MODES.flatMap((mode) => {
    const PLUGINS: RollupPlugin[] = [];

    if (mode) {
      PLUGINS.push(importMeta(mode));
    }

    const deps = Object.keys(pkg.dependencies);

    const entries = entryPoints(pkg, mode).map((options) => ({
      ...options,
      external: deps,
      plugins: [
        ...PLUGINS,
        externals(pkg),
        typescript(mode)(pkg, {
          target: "esnext",
          module: "esnext",
          moduleDetection: "force",
          moduleResolution: "bundler",
          verbatimModuleSyntax: true,
        }),
        ...(mode === 'production' ? [
          terser({
            // remove all comments
            format: {
              comments: false
            },
            // prevent any compression
            compress: false
          }),
        ] : [])
      ],
    }));

    /**
      * We only need to do this once, so we'll push it on the first entrypoint's rollup config
      */
    if (options.copyRootChangelog ?? true) {
      const copyPlugin = copyRootChangelog(pkg);
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      entries[0]?.plugins.push(copyPlugin);
    }

    return entries;
  });
}

function entryPoints(
  pkg: PackageInfo,
  mode: "development" | "production" | undefined,
): import("rollup").RollupOptions[] {
  const {
    root,
    starbeam: { entry },
  } = pkg;

  function entryPoint([exportName, ts]: [string, string]): RollupOptions {
    return {
      input: resolve(root, ts),
      treeshake: true,
      output: {
        file: filename({ root, name: exportName, mode, ext: "js" }),
        format: "esm",
        sourcemap: true,
        hoistTransitiveImports: false,
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

  if (entry === undefined) {
    // eslint-disable-next-line no-console
    console.warn("No entry point found for package", pkg.name);
    return [];
  } else {
    return Object.entries(entry).map(entryPoint);
  }
}

function filename({
  root,
  name,
  mode,
  ext,
}: {
  root: string;
  name: string;
  mode: "development" | "production" | undefined;
  ext: "js" | "cjs";
}): string {
  if (mode) {
    return resolve(root, "dist", `${name}.${mode}.${ext}`);
  } else {
    return resolve(root, "dist", `${name}.${ext}`);
  }
}
