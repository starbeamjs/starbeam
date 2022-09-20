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
            typescript(pkg, { target: "es2022" }),
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
    if (id.startsWith(".") || id.startsWith("/") || id.startsWith("#")) {
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
function tsconfig(pkg, updates) {
    return {
        jsx: "preserve",
        strict: true,
        declaration: true,
        declarationMap: true,
        emitDeclarationOnly: true,
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
        sourceMap: true,
        sourceRoot: pkg.root,
        inlineSourceMap: true,
        inlineSources: true,
        types: ["vite/client"],
        ...updates,
    };
}
function typescript(pkg, config) {
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
