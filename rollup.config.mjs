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
const dir = fileURLToPath(import.meta.url);
const root = dirname(resolve(dir));
const packages = glob
    .sync([
    resolve(root, "packages/*/package.json"),
    resolve(root, "framework/*/*/package.json"),
])
    .map((path) => [
    path,
    JSON.parse(readFileSync(path, "utf8")),
])
    .filter(([, pkg]) => pkg.main && pkg.private !== true)
    .map(([path, pkg]) => {
    const root = dirname(path);
    return { name: pkg.name, main: resolve(root, pkg.main), root };
});
export default defineConfig(packages.flatMap((pkg) => defineConfig([
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
                target: "ES2021",
                module: "commonjs",
                moduleResolution: "node",
            }),
        ],
    }),
])));
function external(id) {
    if (id.startsWith("@swc") || id === "tslib") {
        return false;
    }
    if (id.startsWith(".") || id.startsWith("/")) {
        return false;
    }
    if (id === "stacktracey" ||
        id === "get-source" ||
        id === "as-table" ||
        id === "printable-characters" ||
        id === "chalk") {
        return false;
    }
    return true;
}
function tsconfig(updates) {
    return {
        jsx: "preserve",
        target: "esnext",
        strict: true,
        declaration: true,
        declarationMap: true,
        useDefineForClassFields: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        module: "NodeNext",
        moduleResolution: "NodeNext",
        experimentalDecorators: true,
        emitDecoratorMetadata: false,
        noUnusedLocals: false,
        noUnusedParameters: false,
        noImplicitReturns: true,
        noImplicitAny: true,
        importsNotUsedAsValues: "error",
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
function typescript(target, config) {
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
function files(root, input, format) {
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
