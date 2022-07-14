/// <reference types="node" />
import { sync as glob } from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { defineConfig } from "rollup";
import postcss from "rollup-plugin-postcss";
import ts from "rollup-plugin-ts";
import { fileURLToPath } from "url";

import importMetaPlugin from "./.build/import-meta.js";

const dir = fileURLToPath(import.meta.url);
const root = dirname(resolve(dir));

/** @typedef {{main: string; private: boolean; name: string}} PackageJSON */

const packages = glob([
  resolve(root, "packages/*/package.json"),
  resolve(root, "framework/*/*/package.json"),
])
  .map(
    (path) =>
      /** @type {[string, PackageJSON]} */ ([
        path,
        /** @type {PackageJSON} */ (JSON.parse(readFileSync(path, "utf8"))),
      ])
  )
  .filter(([, pkg]) => pkg.main && pkg.private !== true)
  .map(([path, pkg]) => {
    const root = dirname(path);
    return { name: pkg.name, main: resolve(root, pkg.main), root };
  });

export default packages.map((pkg) =>
  defineConfig({
    input: pkg.main,
    output: [
      {
        file: resolve(pkg.root, "dist", `index.js`),
        format: "esm",
        sourcemap: true,
      },
      {
        file: resolve(pkg.root, "dist", `index.cjs`),
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
    external: (id) => !(id.startsWith(".") || id.startsWith("/")),
    plugins: [
      importMetaPlugin,
      postcss(),
      ts({
        transpiler: "swc",
        swcConfig: {
          jsc: {
            target: "es2022",
            keepClassNames: true,
            parser: {
              syntax: "typescript",
              tsx: true,
              decorators: true,
            },
          },
        },
        tsconfig: resolve(root, "tsconfig.package.json"),
      }),
    ],
  })
);
