import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { sync as glob } from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { defineConfig } from "rollup";
import ts from "rollup-plugin-ts";
import {
  ImportsNotUsedAsValues,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  type CompilerOptions,
} from "typescript";
import { fileURLToPath } from "url";
import postcss from "rollup-plugin-postcss";

import importMetaPlugin from "./.build/import-meta.js";

const dir = fileURLToPath(import.meta.url);
const root = dirname(resolve(dir));

interface PackageJSON {
  main: string;
  private: boolean;
  name: string;
}

const packages = glob([
  resolve(root, "packages/*/package.json"),
  resolve(root, "framework/*/*/package.json"),
])
  .map((path): [string, PackageJSON] => [
    path,
    JSON.parse(readFileSync(path, "utf8")),
  ])
  .filter(([, pkg]) => pkg.main && pkg.private !== true)
  .map(([path, pkg]) => {
    const root = dirname(path);
    return { name: pkg.name, main: resolve(root, pkg.main), root };
  });

export default defineConfig(
  packages.flatMap((pkg) =>
    defineConfig([
      defineConfig({
        ...files(pkg.root, pkg.main, "esm"),
        input: pkg.main,
        external,
        plugins: [
          nodeResolve(),
          commonjs(),
          importMetaPlugin,
          postcss(),
          typescript("es2022"),
        ],
      }),
      defineConfig({
        ...files(pkg.root, pkg.main, "cjs"),
        external,
        plugins: [
          commonjs(),
          nodeResolve(),
          importMetaPlugin,
          postcss(),
          typescript("es2019", {
            target: ScriptTarget.ES2021,
            module: ModuleKind.CommonJS,
            moduleResolution: ModuleResolutionKind.NodeJs,
          }),
        ],
      }),
    ])
  )
);

function external(id: string) {
  if (id.startsWith("@swc") || id === "tslib") {
    return false;
  }

  if (id.startsWith(".") || id.startsWith("/")) {
    return false;
  }

  if (
    id === "stacktracey" ||
    id === "get-source" ||
    id === "as-table" ||
    id === "printable-characters"
  ) {
    return false;
  }

  return true;
}

/**
 * @param {Partial<import("typescript").CompilerOptions>} [updates]
 * @returns {import("typescript").CompilerOptions}
 */
function tsconfig(updates: CompilerOptions): CompilerOptions {
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

function typescript(target: string, config?: Partial<CompilerOptions>) {
  return ts({
    transpiler: "swc",
    swcConfig: {
      jsc: {
        target,
        keepClassNames: true,
        externalHelpers: false,
        parser: {
          syntax: "typescript",
          tsx: true,
          decorators: true,
        },
      },
    },
    tsconfig: tsconfig(config ?? {}),
  });
}

function files(
  root: string,
  input: string,
  format: "esm" | "cjs"
): {
  input: string;
  output: {
    file: string;
    format: "esm" | "cjs";
    sourcemap: true;
    exports?: "named";
  };
} {
  const ext = format === "esm" ? "js" : "cjs";
  return {
    input,
    output: {
      file: resolve(root, "dist", `index.${ext}`),
      format,
      sourcemap: true,
      exports: format === "cjs" ? "named" : undefined,
    },
  };
}
