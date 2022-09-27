// @ts-check

import { Package } from "@starbeam-workspace/build-support";
import glob from "fast-glob";
import { dirname, resolve } from "node:path";
// import { readFileSync } from "node:fs";
// import { dirname, resolve } from "node:path";
// import { fileURLToPath } from "node:url";
// import { defineConfig } from "rollup";
// import postcss from "rollup-plugin-postcss";
// import rollupTS from "rollup-plugin-ts";
// import commonjs from "@rollup/plugin-commonjs";
// import { nodeResolve } from "@rollup/plugin-node-resolve";

const root = Package.root(import.meta);

export default glob
  .sync([
    resolve(root, "packages/*/package.json"),
    resolve(root, "framework/*/*/package.json"),
  ])
  .flatMap((path) => {
    console.log(path);
    return Package.config(dirname(path));
  });

/** @typedef {import("rollup").RollupOptions} RollupOptions */
/**
 * importing from typescript using a static import massively slows down eslint for some reason.
 * @typedef {import("typescript").CompilerOptions} CompilerOptions
 */

// import importMetaPlugin from "./.build/import-meta.js";

// const dir = fileURLToPath(import.meta.url);
// const root = dirname(resolve(dir));

// interface PackageJSON {
//   main: string;
//   private: boolean;
//   name: string;
// }

// interface Package {
//   name: string;
//   root: string;
//   main: string;
// }

// const packages = glob
//   .sync([
//     resolve(root, "packages/*/package.json"),
//     resolve(root, "framework/*/*/package.json"),
//   ])
//   .map((path): [string, PackageJSON] => [
//     path,
//     JSON.parse(readFileSync(path, "utf8")),
//   ])
//   .filter(([, pkg]) => pkg.main && pkg.private !== true)
//   .map(([path, pkg]) => {
//     const root = dirname(path);
//     return { name: pkg.name, main: resolve(root, pkg.main), root };
//   });

// export default defineConfig(
//   packages.flatMap((pkg: Package) =>
//     defineConfig([
//       defineConfig({
//         ...shared(pkg.root, pkg.main, "esm"),
//         input: pkg.main,
//         external,
//         plugins: [
//           commonjs(),
//           nodeResolve(),
//           importMetaPlugin,
//           postcss(),
//           typescript({ target: "es2022" as Setting<"target"> }),
//         ],
//       }),
//       defineConfig({
//         ...shared(pkg.root, pkg.main, "cjs"),
//         external,
//         plugins: [
//           commonjs(),
//           nodeResolve(),
//           importMetaPlugin,
//           postcss(),
//           typescript({
//             target: "ES2021" as Setting<"target">,
//             module: "commonjs" as Setting<"module">,
//             moduleResolution: "node" as Setting<"moduleResolution">,
//           }),
//         ],
//       }),
//     ])
//   )
// );

// type Setting<T extends keyof CompilerOptions> = CompilerOptions[T] & string;

// const INLINE = false;
// const EXTERNAL = true;

// function external(id: string) {
//   if (id === "tslib") {
//     return INLINE;
//   }

//   if (id.startsWith(".") || id.startsWith("/") || id.startsWith("#")) {
//     return INLINE;
//   }

//   if (
//     id === "stacktracey" ||
//     id === "get-source" ||
//     id === "as-table" ||
//     id === "printable-characters" ||
//     id === "chalk" ||
//     id.startsWith("@babel/runtime/") ||
//     id.startsWith("@domtree/")
//   ) {
//     return INLINE;
//   }

//   if (
//     id.startsWith("@starbeam/") ||
//     id === "react" ||
//     id === "source-map" ||
//     id === "data-uri-to-buffer"
//   ) {
//     return EXTERNAL;
//   }

//   console.warn("unhandled external", id);

//   return true;
// }

// function tsconfig(updates: CompilerOptions): CompilerOptions {
//   return {
//     jsx: "preserve" as Setting<"jsx">,
//     strict: true,
//     declaration: true,
//     declarationMap: true,
//     useDefineForClassFields: true,
//     allowSyntheticDefaultImports: true,
//     esModuleInterop: true,
//     resolveJsonModule: true,
//     module: "NodeNext" as unknown as CompilerOptions["module"],
//     moduleResolution: "NodeNext" as Setting<"moduleResolution">,
//     experimentalDecorators: true,
//     noUnusedLocals: false,
//     noUnusedParameters: false,
//     noImplicitReturns: true,
//     noImplicitAny: true,
//     importsNotUsedAsValues: "error" as Setting<"importsNotUsedAsValues">,
//     isolatedModules: true,
//     skipLibCheck: true,
//     skipDefaultLibCheck: true,
//     ...updates,
//   };
// }

// function typescript(config?: Partial<CompilerOptions>) {
//   const ts = tsconfig(config ?? {});
//   return rollupTS({
//     transpiler: "babel",
//     transpileOnly: true,
//     babelConfig: {
//       presets: [["@babel/preset-typescript", { allowDeclareFields: true }]],
//     },

//     tsconfig: ts,
//   });
// }

// function shared(
//   root: string,
//   main: string,
//   format: "esm" | "cjs"
// ): RollupOptions {
//   const ext = format === "esm" ? "js" : "cjs";
//   return {
//     input: resolve(root, main),
//     output: {
//       file: resolve(root, "dist", `index.${ext}`),
//       format,
//       sourcemap: true,
//       exports: format === "cjs" ? "named" : undefined,
//     },
//     onwarn: (warning, warn) => {
//       if (warning.code === "EMPTY_BUNDLE") return;

//       // if (warning.code === "CIRCULAR_DEPENDENCY") {
//       //   console.log(inspect(warning, { depth: Infinity }));
//       // }

//       warn(warning);
//     },
//   };
// }
