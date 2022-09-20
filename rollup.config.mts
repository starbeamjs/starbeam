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

interface Package {
  name: string;
  root: string;
  main: string;
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
  packages.flatMap((pkg: Package) =>
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
          typescript(pkg, { target: "es2022" as Setting<"target"> }),
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
          typescript(pkg, {
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
  if (id === "tslib") {
    return false;
  }

  if (id.startsWith(".") || id.startsWith("/") || id.startsWith("#")) {
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

  console.warn("unhandled external", id);

  return true;
}

function tsconfig(pkg: Package, updates: CompilerOptions): CompilerOptions {
  return {
    jsx: "preserve" as unknown as CompilerOptions["jsx"],
    strict: true,
    declaration: true,
    declarationMap: true,
    emitDeclarationOnly: true,
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
    sourceMap: true,
    sourceRoot: pkg.root,
    inlineSourceMap: true,
    inlineSources: true,
    types: ["vite/client"],
    ...updates,
  };
}

function typescript(pkg: Package, config?: Partial<CompilerOptions>) {
  const ts = tsconfig(pkg, config ?? {});
  return rollupTS({
    transpiler: "babel",
    transpileOnly: true,
    babelConfig: {
      presets: [["@babel/preset-typescript", { allowDeclareFields: true }]],
    },

    tsconfig: ts,
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
