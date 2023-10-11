import { getTsconfig } from "get-tsconfig";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

/**
 * @typedef {import("../package.js").PackageInfo} PackageInfo
 * @typedef {import("@swc/core").Config} SwcConfig
 * @typedef {import("typescript").CompilerOptions} CompilerOptions
 * @typedef {import("@swc/core").TransformConfig} TransformConfig
 * @typedef {import("@swc/core").JsMinifyOptions} JsMinifyOptions
 * @typedef {import("./ts.js").CompilerOptionsJson} CompilerOptionsJson
 */

/** @type {typeof import("rollup-plugin-ts").default} */
/* 
  eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- 
  using `require` avoids opting in to the ESM code-path, which is annoyingly
  using experimental node and creating a bunch of visual noise. 
*/
const rollupTS = require("rollup-plugin-ts");

/**
 * @param {"development" | "production" | undefined} mode
 */
export const typescript = (mode) => {
  /**
   * @param {PackageInfo} pkg
   * @param {CompilerOptionsJson} [config]
   * @returns {import("rollup").Plugin}
   */
  return (pkg, config) => {
    /**
     * @type {import("./ts.js").CompilerOptionsJson}
     */
    const compilerOptions = {
      ...getTsconfig(pkg.root)?.config.compilerOptions,
      ...config,
    };

    /** @type {Partial<TransformConfig>} */
    const transform = {};

    /** @type {Partial<JsMinifyOptions>} */
    const minify = {
      mangle: {
        toplevel: true,
      },
      module: true,
      compress: {
        module: true,
        unsafe_math: true,
        unsafe_symbols: mode === "production",

        hoist_funs: true,
        dead_code: true,
        defaults: true,
        unused: true,
      },
    };

    /** @type {Partial<SwcConfig>} */
    const swcConfig = {
      jsc: { transform, minify },
    };

    const jsx = pkg.starbeam.jsx;
    const source = pkg.starbeam.source;
    const hasJSX = source === "jsx" || source === "tsx";

    if (hasJSX) {
      const importSource = jsx ?? "react";
      transform.react = { runtime: "automatic", importSource };

      compilerOptions.jsx = "react-jsx";
      compilerOptions.jsxImportSource = importSource;
    }

    return rollupTS({
      transpiler: "swc",
      transpileOnly: true,

      swcConfig,

      tsconfig: compilerOptions,
    });
  };
};
