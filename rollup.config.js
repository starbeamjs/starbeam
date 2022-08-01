/// <reference types="node" />
import { sync as glob } from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { defineConfig } from "rollup";
import { default as postcss } from "rollup-plugin-postcss";
import ts from "rollup-plugin-ts";
import {
  ImportsNotUsedAsValues,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
} from "typescript";
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

export default defineConfig(
  packages.flatMap((pkg) =>
    defineConfig([
      {
        input: pkg.main,
        output: [
          {
            file: resolve(pkg.root, "dist", `index.js`),
            format: "esm",
            sourcemap: true,
          },
        ],
        external,
        plugins: [
          importMetaPlugin,
          postcss(),
          ts({
            transpiler: "swc",
            swcConfig: {
              jsc: {
                target: "es2022",
                keepClassNames: true,
                externalHelpers: false,
                parser: {
                  syntax: "typescript",
                  tsx: true,
                  decorators: true,
                },
              },
            },
            tsconfig: tsconfig(),
          }),
        ],
      },
      {
        input: pkg.main,
        output: [
          {
            file: resolve(pkg.root, "dist", `index.cjs`),
            format: "cjs",
            sourcemap: true,
            exports: "named",
          },
        ],
        external,
        plugins: [
          importMetaPlugin,
          postcss(),
          ts({
            transpiler: "swc",
            swcConfig: {
              jsc: {
                target: "es2019",
                keepClassNames: true,
                externalHelpers: false,
                parser: {
                  syntax: "typescript",
                  tsx: true,
                  decorators: true,
                },
              },
            },
            tsconfig: tsconfig({
              target: ScriptTarget.ES2021,
              module: ModuleKind.CommonJS,
              moduleResolution: ModuleResolutionKind.NodeJs,
            }),
          }),
        ],
      },
    ])
  )
);

/**
 * @param {string} id
 */
function external(id) {
  if (id.startsWith("@swc") || id === "tslib") {
    return false;
  }

  if (id.startsWith(".") || id.startsWith("/")) {
    return false;
  }

  return true;
}

/**
 * @param {Partial<import("typescript").CompilerOptions>} [updates]
 * @returns {import("typescript").CompilerOptions}
 */
function tsconfig(updates) {
  return {
    jsx: JsxEmit.Preserve,
    target: ScriptTarget.ESNext,
    strict: true,
    declaration: true,
    declarationMap: true,
    useDefineForClassFields: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    module: ModuleKind.NodeNext,
    moduleResolution: ModuleResolutionKind.NodeNext,
    experimentalDecorators: true,
    emitDecoratorMetadata: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitReturns: true,
    noImplicitAny: true,
    importsNotUsedAsValues: ImportsNotUsedAsValues.Error,
    isolatedModules: true,
    preserveValueImports: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    inlineSourceMap: true,
    inlineSources: true,
    types: ["vite/client"],
    ...updates,
  };
}
