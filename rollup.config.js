import glob from "fast-glob";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { defineConfig } from "rollup";
import postcss from "rollup-plugin-postcss";
import ts from "rollup-plugin-ts";
import { fileURLToPath } from "url";

const dir = fileURLToPath(import.meta.url);
const root = dirname(resolve(dir));

const packages = glob
  .sync([
    resolve(root, "packages/*/package.json"),
    resolve(root, "framework/*/*/package.json"),
  ])
  .map((path) => [path, JSON.parse(readFileSync(path, "utf8"))])
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
        // file: resolve(pkg.root, "dist", "index.js"),
        dir: resolve(pkg.root, "dist"),
        format: "es",
        sourcemap: true,
      },
      {
        file: resolve(pkg.root, "dist", "index.cjs"),
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
    external: (id) => !(id.startsWith(".") || id.startsWith("/")),
    plugins: [
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
            },
          },
        },
        tsconfig: resolve(root, "tsconfig.package.json"),
      }),
    ],
  })
);
