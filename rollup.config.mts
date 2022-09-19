import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import glob from "fast-glob";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "rollup";
import postcss from "rollup-plugin-postcss";
import rollupTS from "rollup-plugin-ts";

import importMetaPlugin from "./.build/import-meta.js";

// importing from typescript using a static import massively slows down eslint for some reason.
type CompilerOptions = import("typescript").CompilerOptions;

const dir = fileURLToPath(import.meta.url);
const root = dirname(resolve(dir));

interface PackageJSON {
  main: string;
  private: boolean;
  name: string;
}

const packages = glob
  .sync([
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
            target: "ES2021" as Setting<"target">,
            module: "commonjs" as Setting<"module">,
            moduleResolution: "node" as Setting<"moduleResolution">,
          }),
        ],
      }),
    ])
  )
);

type Setting<T extends keyof CompilerOptions> = CompilerOptions[T] & string;

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
    id === "printable-characters" ||
    id === "chalk"
  ) {
    return false;
  }

  return true;
}

function tsconfig(updates: CompilerOptions): CompilerOptions {
  return {
    jsx: "preserve" as unknown as CompilerOptions["jsx"],
    target: "esnext" as unknown as CompilerOptions["target"],
    strict: true,
    declaration: true,
    declarationMap: true,
    useDefineForClassFields: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    module: "NodeNext" as unknown as CompilerOptions["module"],
    moduleResolution:
      "NodeNext" as unknown as CompilerOptions["moduleResolution"],
    experimentalDecorators: true,
    emitDecoratorMetadata: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitReturns: true,
    noImplicitAny: true,
    importsNotUsedAsValues:
      "error" as unknown as CompilerOptions["importsNotUsedAsValues"],
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
  return rollupTS({
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
