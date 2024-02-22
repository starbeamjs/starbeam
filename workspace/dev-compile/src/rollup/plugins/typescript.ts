import { createRequire } from "node:module";

import type { PackageInfo } from "@starbeam-dev/core";
import type { JscConfig, ReactConfig, TransformConfig } from "@swc/core";
import { getTsconfig } from "get-tsconfig";

import type { CompilerOptionsJson } from "../ts.js";
import type { RollupPlugin } from "../utils.js";

const require = createRequire(import.meta.url);

const rollupTS =
  require("rollup-plugin-ts") as typeof import("rollup-plugin-ts").default;

/**
 * Build a library with TypeScript in the specified mode.
 *
 * This plugin uses swc (via `@swc/core`) to efficiently compile TypeScript to
 * JavaScript.
 *
 * ## Assumptions
 *
 * You are using at least TypeScript 5.0.
 *
 * You are using the (large) subset of TypeScript that can be compiled by
 * evaluating a single module and stripping out type-specific features. You are
 * not using features of TypeScript that require multi-module analysis to
 * determine how to compile a single module.
 *
 * - You should not use `const` enums, but if you do, they will be converted
 *   into normal enums.
 * - All import paths that refer to non-existent JavaScript modules (type-only
 *   modules) are imported using `import type`.
 * - All imports that do not refer to a JavaScript value are imported as part of
 *   an `import type` statement or are annotated with `type` (i.e. `import {
 *   map, type MapFn } from "map"`).
 *
 * ## Recommendations
 *
 * To ensure that your code satisfies these assumptions, we recommend the
 * following tsconfig options:
 *
 * <dl>
 *   <dt>`verbatimModuleSyntax`: true</dt>
 *   <dd>
 *     You will get a TypeScript error if one of your imports is only
 *     used as a type but does not include the `type` specifier.
 *   </dd>
 * </dl>
 *
 * We also recommend the use of `@typescript-eslint/consistent-type-imports` and
 * `@typescript-eslint/no-import-type-side-effects`. These auto-fixable lints
 * will error if you don't use `import type` on an import statement that is
 * never used as a value. These lints will also ensure that any named imports
 * that are only used as types are annotated with `type`.
 *
 * If you're using vscode, you can enable "source.fixAll" in
 * `editor.codeActionOnSave` and imports will automatically be updated if you
 * need to add or remove `import type`.
 *
 * ## Type Checking
 *
 * > **TL;DR** This plugin does **not** typecheck your code. It is intended to
 * > be run after verifying your code using tools such as `tsc` and `eslint` and
 * > after successfully running your tests.
 *
 * Now for the longer version...
 *
 * **Compiling** a library is a separate step from **verifying** the library.
 *
 * Conversationally, people refer to the process of verifying and compiling a
 * library as "the build" (i.e. "failing the build").
 *
 * This is largely an artifact of workflows in other languages, such as Java,
 * C++ and Rust. In these languages, the *compiler* performs a large amount of
 * verification before compilation can begin.
 *
 * Even in those environments, many projects perform additional verification
 * steps (such as linting and testing) before creating and publishing the
 * compilation artifacts.
 *
 * But in **our** environment, virtually the entire verification step can be
 * performed before the compilation step.
 *
 * > Adding to the confusion, the tool that you use to *verify* your TypeScript
 * > code is called `tsc`. Even more confusingly, `tsc` is intended to be a
 * > good-enough reference compiler for TypeScript code. In practice, though, it
 * > makes more sense to use `tsc` as part of a comprehensive *verification*
 * > strategy and to use other tools (such as `esbuild` or `swc`) to compile
 * > your TypeScript code.
 *
 * ## Verify Separately
 *
 * This plugin is intended to be used as part of a build process that runs the
 * verification step first, and only invokes the compilation step once the
 * verification step has completed.
 *
 * These same verification steps should run in your CI pipeline.
 *
 * During development, we recommend that you use the same verification tools in
 * your editor, which can help developers avoid submitting pull requests that
 * will fail verification.
 */
export default function typescript(
  mode: "development" | "production" | undefined,
) {
  return (pkg: PackageInfo, config: CompilerOptionsJson): RollupPlugin => {
    const { config: tsconfig } = getTsconfig(pkg.root) ?? {};
    const compilerOptions = tsconfig?.compilerOptions ?? {};

    const transform: Partial<TransformConfig> = {
      treatConstEnumAsEnum: true,
    };

    const minify = {
      format: {
        comments: mode === 'production',
      },
      mangle: {
        toplevel: true,
        properties: {
          builtins: false,
        },
      },
      module: true,
      compress: {
        module: true,
        passes: 4,
        unsafe_math: true,
        unsafe_symbols: mode === "production",
        hoist_funs: true,
        conditionals: true,
        drop_debugger: true,
        evaluate: true,
        reduce_vars: true,
        side_effects: true,
        dead_code: true,
        defaults: true,
        unused: true,
      },
    } as const;

    let jscConfig: Partial<JscConfig> = { transform };

    if (mode === "production") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (jscConfig as any).minify = minify;
    }

    const fragmentFactory = compilerOptions.jsxFragmentFactory;
    const jsxFactory = compilerOptions.jsxFactory;

    /**
    * TODO: move react specific build code to react packages' rollup
    */
    if (fragmentFactory && jsxFactory)
      jscConfig = withReact(jscConfig, {
        pragma: jsxFactory,
        pragmaFrag: fragmentFactory,
      });

    const importSource = compilerOptions.jsxImportSource;

    if (importSource)
      jscConfig = withReact(jscConfig, { runtime: "automatic", importSource });

    return rollupTS({
      transpiler: "swc",
      transpileOnly: true,

      swcConfig: {
        jsc: jscConfig,
      },

      tsconfig: {
        ...compilerOptions,
        ...config,
      },
    });
  };
}

function withReact(jsc: JscConfig, react: ReactConfig): JscConfig {
  jsc.transform ??= {};
  jsc.transform.react = { ...jsc.transform.react, ...react };
  return jsc;
}
