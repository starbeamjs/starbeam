import { defineConfig } from "rollup";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import glob from "fast-glob";
import { readFileSync } from "fs";
import ts from "rollup-plugin-ts";
import postcss from "rollup-plugin-postcss";

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
        file: resolve(pkg.root, "dist", "index.js"),
        format: "esm",
        sourcemap: true,
      },
    ],
    external: (id) => !(id.startsWith(".") || id.startsWith("/")),
    plugins: [
      postcss(),
      ts({
        transpiler: "swc",
        transpileOnly: true,
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
