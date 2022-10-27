// @ts-check

import { dirname, resolve } from "node:path";
import { defineConfig } from "rollup";
import * as vite from "vite";
import rollupTS from "rollup-plugin-ts";
import importMeta from "./import-meta.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import typescriptLibrary from "typescript";
import inline from "./inline.js";
import { VitePluginFonts } from "vite-plugin-fonts";
import { lintTypescript } from "./eslint.js";

const { default: commonjs } = await import("@rollup/plugin-commonjs");
const { default: nodeResolve } = await import("@rollup/plugin-node-resolve");
const { default: postcss } = await import("rollup-plugin-postcss");

const {
  ImportsNotUsedAsValues,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
} = typescriptLibrary;

/** @typedef {import("typescript").CompilerOptions} CompilerOptions */
/** @typedef {import("./config.js").ExternalOption} ExternalOption */
/** @typedef {import("./config.js").PackageInfo} PackageInfo */
/** @typedef {import("./config.js").PackageJSON} PackageJSON */
/** @typedef {import("./config.js").PackageJsonInline} PackageJsonInline */
/** @typedef {import("rollup").Plugin} RollupPlugin */
/** @typedef {import("rollup").RollupOptions} RollupOptions */
/**
 * @typedef {import("./config.js").ESLintExport} ESLintExport
 * @typedef {import("./config.js").ViteExport} ViteExport
 * @typedef {import("./config.js").StarbeamKey} StarbeamKey
 * @typedef {import("./config.js").JsonValue} JsonValue
 * @typedef {import("./config.js").JsonObject} JsonObject
 * @typedef {import("./config.js").JsonArray} JsonArray
 * @typedef {import("./config.js").PackageJSON} PackageJson
 */

/**
 * The package should be inlined into the output. In this situation, the `external` function should
 * return `false`. This is the default behavior.
 */
const INLINE = false;

/**
 * The package should be treated as an external dependency. In this situation, the `external` function
 * should return `true`. This is unusual and should be used when:
 *
 * - The package is a "helper library" (such as tslib) that we don't want to make a real dependency
 *   of the published package.
 * - (for now) The package doesn't have good support for ESM (i.e. `type: module` in package.json)
 *   but rollup will handle it for us.
 */
const EXTERNAL = true;

/**
 * @param {CompilerOptions} updates
 * @returns {CompilerOptions}
 */
export function tsconfig(updates) {
  return {
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
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitReturns: true,
    noImplicitAny: true,
    importsNotUsedAsValues: ImportsNotUsedAsValues.Error,
    isolatedModules: true,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    ...updates,
  };
}

/**
 * @param {PackageInfo} pkg
 * @param {Partial<CompilerOptions>} [config]
 * @returns {RollupPlugin}
 */
export function typescript(pkg, config) {
  const typeScriptConfig = { ...config };

  /** @type {[string, object][]} */
  const presets = [["@babel/preset-typescript", { allowDeclareFields: true }]];

  if (pkg.starbeam.jsx) {
    presets.push([
      "@babel/preset-react",
      { runtime: "automatic", importSource: pkg.starbeam.jsx },
    ]);

    typeScriptConfig.jsx = JsxEmit.ReactJSX;
    typeScriptConfig.jsxImportSource = pkg.starbeam.jsx;
  }

  const ts = tsconfig(typeScriptConfig);

  return rollupTS({
    transpiler: "babel",
    transpileOnly: true,
    babelConfig: { presets },

    tsconfig: ts,
  });
}

/**
 * @type {ExternalOption[]}
 */
const DEFAULT_EXTERNAL_OPTIONS = [
  ["startsWith", { "@babel/runtime/": "inline" }],
  ["startsWith", { "@domtree/": "inline" }],
  ["startsWith", { "@starbeam/": "external" }],
];

/**
 * @implements {PackageInfo}
 */
export class Package {
  /**
   * @param {ImportMeta} meta
   * @returns {string}
   */
  static root(meta) {
    const dir = fileURLToPath(meta.url);
    return dirname(resolve(dir));
  }

  /**
   * @param {ImportMeta | string} meta
   * @returns {Package | undefined}
   */
  static at(meta) {
    const root = typeof meta === "string" ? meta : Package.root(meta);

    /** @type {PackageJSON} */
    const json = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8")
    );

    /** @type {ExternalOption[]} */
    const starbeamExternal = [...DEFAULT_EXTERNAL_OPTIONS];

    if (json["starbeam:inline"]) {
      starbeamExternal.push(...json["starbeam:inline"].map(mapExternal));
    }

    if (json.starbeam?.inline) {
      starbeamExternal.push(...json.starbeam.inline.map(mapExternal));
    }

    const type = getStarbeam(json, "type", (value) => {
      if (typeof value !== "string") {
        throw new Error(`Invalid starbeam:type: ${value}`);
      }
      return value;
    });

    /** @type {string | undefined} */
    let jsx;

    if (json["starbeam:jsx"]) {
      jsx = json["starbeam:jsx"];
    } else if (json.starbeam?.jsx) {
      jsx = json.starbeam.jsx;
    }

    if (json.main) {
      return new Package({
        name: json.name,
        main: resolve(root, json.main),
        root,
        starbeam: {
          external: starbeamExternal,
          jsx,
          type,
        },
      });
    } else if (
      json["starbeam:type"] === "draft" ||
      json.starbeam?.type === "draft"
    ) {
      // do nothing
    } else {
      console.warn(`No main entry point found for ${json.name} (in ${root})`);
    }
  }

  /**
   * @param {ImportMeta | string} meta
   * @returns {import("./config.js").RollupExport}
   */
  static config(meta) {
    const pkg = Package.at(meta);

    if (pkg) {
      return pkg.config();
    } else {
      return [];
    }
  }

  /**
   * @param {ImportMeta | string} meta
   * @returns {ViteExport}
   */
  static viteConfig(meta) {
    const pkg = Package.at(meta);

    if (pkg) return pkg.#viteConfig();

    throw Error(
      `No package found at ${
        typeof meta === "string" ? meta : Package.root(meta)
      }`
    );
  }

  /**
   * @param {ImportMeta | string} meta
   * @returns {ESLintExport}
   */
  static eslintConfig(meta) {
    const pkg = Package.at(meta);

    if (pkg) return pkg.#eslintConfig();

    throw Error(
      `No package found at ${
        typeof meta === "string" ? meta : Package.root(meta)
      }`
    );
  }

  /** @readonly @type {PackageInfo} */
  #package;

  /***
   * @param {PackageInfo} pkg
   */
  constructor(pkg) {
    this.#package = pkg;
  }

  /**
   * @returns {string}
   */
  get name() {
    return this.#package.name;
  }

  /**
   * @returns {string}
   */
  get root() {
    return this.#package.root;
  }

  /**
   * @returns {string}
   */
  get main() {
    return this.#package.main;
  }

  /**
   * @returns {PackageInfo["starbeam"]}
   */
  get starbeam() {
    return this.#package.starbeam;
  }

  /**
   * @returns {import("rollup").RollupOptions[] | import("rollup").RollupOptions}
   */
  config() {
    return [this.esm(), this.cjs()];
  }

  /**
   * @returns {import("./config.js").ViteExport}
   */
  #viteConfig() {
    return viteConfig({
      plugins: [
        VitePluginFonts({
          google: {
            families: ["Roboto:wght@300;400;500;700"],
            display: "swap",
            preconnect: true,
          },
        }),
      ],
      esbuild: this.#esbuild(),
      optimizeDeps: {
        esbuildOptions: {
          define: {
            global: "globalThis",
          },
        },
      },
      build: {},
    });
  }

  /**
   * @returns {ESLintExport}
   */
  #eslintConfig() {
    const pkg = this.#package;

    if (pkg.starbeam.type === "library") {
      const tsconfig = resolve(pkg.root, "tsconfig.json");

      return [
        ...lintTypescript(pkg.root, tsconfig, {
          files: [
            resolve(pkg.root, "index.ts"),
            resolve(pkg.root, "src/**/*.ts"),
          ],
          tight: true,
        }),
        // ...lintTypescript(pkg.root, tsconfig, {
        //   files: [resolve(pkg.root, "tests/**/*.ts")],
        //   ignores: [resolve(pkg.root, "tests/node_modules/**")],
        // }),
      ];
    }

    throw Error("unimplemented");
  }

  /**
   * @returns {import("vite").ESBuildOptions | false}
   */
  #esbuild() {
    const pkg = this.#package;
    const jsx = pkg.starbeam.jsx;

    if (jsx) {
      if (jsx === "automatic") {
        return {
          jsx: "automatic",
        };
      } else {
        return {
          jsx: "automatic",
          jsxImportSource: pkg.starbeam.jsx,
        };
      }
    } else {
      return false;
    }
  }

  /**
   * @returns {RollupOptions}
   */
  esm() {
    const pkg = this.#package;

    return defineConfig({
      ...this.#shared("esm"),
      input: pkg.main,
      external: this.#external,
      plugins: [
        inline(),
        commonjs(),
        nodeResolve(),
        importMeta,
        postcss(),
        typescript(this.#package, {
          target: ScriptTarget.ES2022,
        }),
      ],
    });
  }

  /**
   * @returns {import("rollup").RollupOptions}
   */
  cjs() {
    return defineConfig({
      ...this.#shared("cjs"),
      external: this.#external,
      plugins: [
        inline(),
        commonjs(),
        nodeResolve(),
        importMeta,
        postcss(),
        typescript(this.#package, {
          target: ScriptTarget.ES2021,
          module: ModuleKind.CommonJS,
          moduleResolution: ModuleResolutionKind.NodeJs,
        }),
      ],
    });
  }

  /**
   * @return {(id: string) => boolean}
   */
  get #external() {
    /**
     * @param {string} id
     * @returns {boolean}
     */
    return (id) => {
      if (id === "tslib") {
        return INLINE;
      }

      if (id.startsWith(".") || id.startsWith("/") || id.startsWith("#")) {
        return INLINE;
      }

      for (const option of this.#package.starbeam.external) {
        if (Array.isArray(option)) {
          const [type, value] = option;
          const entries = Object.entries(value);

          if (type === "startsWith") {
            const entry = entries.find(([key]) => id.startsWith(key));
            return entry ? entry[1] === "external" : EXTERNAL;
          }
        } else {
          const entries = Object.entries(option);
          const entry = entries.find(([key]) => id === key);
          return entry ? entry[1] === "external" : EXTERNAL;
        }
      }

      console.warn("unhandled external", id);

      return true;
    };
  }

  /**
   * @param {"esm" | "cjs"} format
   * @returns {import("rollup").RollupOptions}
   */
  #shared(format) {
    const { root, main } = this.#package;

    const ext = format === "esm" ? "js" : "cjs";
    return {
      input: resolve(root, main),
      output: {
        file: resolve(root, "dist", `index.${ext}`),
        format,
        sourcemap: true,
        exports: format === "cjs" ? "named" : "none",
      },
      onwarn: (warning, warn) => {
        switch (warning.code) {
          case "CIRCULAR_DEPENDENCY":
          case "EMPTY_BUNDLE":
            return;
          default:
            warn(warning);
        }
      },
    };
  }
}

/**
 * @param {PackageJsonInline} inline
 * @returns {ExternalOption}
 */
function mapExternal(inline) {
  if (typeof inline === "string") {
    return { [inline]: "inline" };
  } else {
    return [inline[0], { [inline[1]]: "inline" }];
  }
}

/**
 * @type {<K extends "jsx">(name: K, value: keyof CompilerOptions["jsx"]) => CompilerOptions[K]}
 */
const setting = (_name, value) => /** @type {any} */ (value);

/**
 * @param {import("./config.js").ViteExport} config
 */
function viteConfig(config) {
  return config;
}

/**
 * @template {JsonValue} T
 * @param {PackageJSON} packageJSON
 * @param {StarbeamKey} path
 * @param {(value: JsonValue) => T} [map]
 * @returns {T}
 */
function getStarbeam(
  packageJSON,
  path,
  map = (value) => /** @type {T} */ (value)
) {
  const inline = packageJSON[`starbeam:${path}`];

  if (inline) {
    return map(inline);
  }

  const starbeam = packageJSON["starbeam"];

  if (starbeam && typeof starbeam === "object" && !Array.isArray(starbeam)) {
    const value = starbeam[path];

    if (value) {
      return map(value);
    }
  }

  throw Error(`missing starbeam:${path}`);
}
