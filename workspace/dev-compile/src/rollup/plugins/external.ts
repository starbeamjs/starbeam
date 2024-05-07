/* eslint-disable no-console */
import { join } from "node:path";

import type {
  ExternalConfig,
  NormalizedExternalOperator,
  NormalizedExternalOption,
  PackageInfo,
  RollupExternal,
} from "@starbeam-dev/core";

import { EXTERNAL, INLINE } from "../../constants.js";
import type { RollupPlugin } from "../utils.js";

/**
 * @typedef {import("#core").PackageInfo} PackageInfo
 */

/**
 * A plugin that applies the default starbeam-dev externals rules to the builds
 * for the specified package.
 *
 * When an import is "external", it is left as-is in the built package. When an
 * import is "inline", it is combined with the built package's main file and
 * further optimized.
 *
 * In general, it's better to inline an import if any of the following are true:
 *
 * 1. It is only used by this package.
 * 2. Its exports are easy to optimize by a minifier in production builds (e.g.
 *    exports that are simple functions that have no behavior or simply return
 *    its argument). Functions that use `import.meta.env.DEV` guards around
 *    behavior that would be tricky to optimize are still good candidates for
 *    inlining.
 * 3. More generally, when inlining the import in production mode is likely to
 *    save more bytes than the bytes lost due to duplication.
 *
 * ## Rules
 *
 * 1. Relative imports: If the import starts with a `.`, then it is an inline
 *    import.
 * 2. Custom rules: If the `starbeam:inline` key in `package.json` specifies a
 *    rule for a dependency, use it. You can use custom rules to override any of
 *    the default rules below.
 * 3. [TODO] Custom workspace rules: If the `starbeam:inline` key in the
 *    `package.json` for the workspace root specifies a rule for a dependency,
 *    use it.
 * 4. Helper libraries: If the import is one of the well-known helper libraries,
 *    then it is an inline import.
 * 5. Absolute imports: If the import starts with `/`, then it is an inline
 *    import. This is because absolute imports are usually relative imports
 *    previously resolved by the build process. In general, you should not use
 *    absolute imports in your source code when using this plugin (and probably
 *    in general).
 * 6. Import map imports: If the import starts with `#`, then it is an inline
 *    import. Since import-map imports typically resolve to relative imports,
 *    the current behavior is to inline them.
 * 7. If the `starbeam:external` key in `package.json` specifies a rule for a
 *    dependency, use it.
 *
 * It would probably be more correct to attempt to resolve import map imports
 * and then apply the rules above to the resolved imports. Please file an issue
 * describing your situation if you need this.
 *
 * ## Well-Known Helper Libraries
 *
 * - `@babel/runtime/*`
 * - `tslib`
 * - `@swc/core`
 *
 * ## Manifest Rules (`starbeam:external` keys)
 *
 * The `starbeam:inline` key is either an array of rules or a rules object.
 *
 * ### Rule Pattern
 *
 * A rule pattern is a string, one of the following:
 *
 * - The name of a package listed in the `dependencies` or
 *   `optionalDependencies` field  of the `package.json` file
 * - A pattern that ends in a `*` (e.g. `@starbeam/*`) and matches the name of
 *   at least one package listed in the `dependencies` or
 *   `optionalDependencies`. The `*` matches one or more characters that are
 *   valid as part of an npm package name.
 * - The special pattern `(helpers)`. This matches all of the well-known helper
 *   libraries.
 *
 * ### Rules Array
 *
 * The easiest way to specify inlining rules is by specifying an array of
 * patterns.
 *
 * Example:
 *
 * ```json
 * {
 *   "dependencies": {
 *     "react": "^18.2.0",
 *     "lodash": "^4.17.21"
 *   },
 *
 *   "starbeam:inline": ["lodash"]
 * }
 * ```
 *
 * Any patterns in the array will be configured to be inlined. These patterns
 * supersede the default behavior.
 *
 * ### Rules Object
 *
 * Each key in the object is a rule pattern, and the value is either "inline" or
 * "external".
 *
 * Example:
 *
 * ```json
 * {
 *   "dependencies": {
 *     "react": "^18.2.0",
 *     "lodash": "^4.17.21"
 *   },
 *
 *   "starbeam:inline": {
 *     "loadash": "inline"
 *   }
 * }
 * ```
 *
 * In this example, the `react` dependency is externalized, and the `lodash`
 * dependency is inlined.
 *
 * The default behavior is to externalize all dependencies, so you don't need to
 * specify "external" in a rules object unless you want to supersede a later
 * rule.
 *
 * Example:
 *
 * ```json
 * {
 *   "dependencies": {
 *     "react": "^18.2.0",
 *     "lodash.map": "^4.17.21",
 *     "lodash.merge": "^4.17.21"
 *     "lodash.flat-map": "^4.17.21"
 *   },
 *
 *   "starbeam:inline": {
 *     "lodash.merge": "external",
 *     "lodash.*": "inline"
 *   }
 * }
 * ```
 *
 * In this example, `react` and `lodash.merge` are externalized, and
 * `lodash.map` and `lodash.flat-map` are inlined.
 *
 * ### Rule Objects in a Rules Array
 *
 * When you have a lot of inline rules and only a handful of externals
 * overrides, it's nice to be able to avoid repeating `: "inline"` over and over
 * again.
 *
 * In this situation, you can include rule objects in a rules array.
 *
 * Example:
 *
 * Instead of this:
 *
 * ```json
 * "starbeam:inline": {
 *   "lodash.merge": "external",
 *   "lodash.*": "inline"
 * }
 * ```
 *
 * You can do this:
 *
 * ```json
 * "starbeam:inline": [
 *   { "lodash.merge": "external" },
 *   "lodash.*"
 * ]
 * ```
 *
 * ## Matching Order for Custom Rules
 *
 * Custom rules are matched in the order they are listed in the
 * `starbeam:external` key.
 *
 * Earlier rules in the rule array take precedence over later rules. Earlier
 * rules in an rules object take precedence over later rules in the same rule
 * object.
 *
 * ## Development and Peer Dependencies
 *
 * Since development dependencies are not intended to be used at runtime, they
 * should never be imported from runtime code, and therefore should never be
 * included in the build.
 *
 * Since peer dependencies are intended to be supplied by a dependent package
 * (i.e. the package including the package you are building), they are always
 * external and should not be listed in the `starbeam:external` key.
 *
 * @param {PackageInfo} pkg
 * @returns {import("rollup").Plugin}
 */
export default function externals(pkg: PackageInfo, mode: 'development' | 'production' | undefined): RollupPlugin {
  const isExternal = external(pkg, mode);

  return {
    name: "starbeam:externals",

    resolveId(id) {
      if (isExternal(id)) {
        return { id, external: true };
      }
    },
  };
}

/**
 * @param {PackageInfo} pkg
 * @returns
 */
function external(pkg: PackageInfo, mode: 'development' | 'production' | undefined) {
  /**
   * @param {string} id
   * @returns {boolean}
   */
  return (id: string): boolean => {
    // Inline relative modules.
    if (id.startsWith(".")) {
      return INLINE;
    }

    if (mode === 'production') {
      if (id.startsWith('@starbeam/debug') || id.startsWith('@starbeam/verify')) {
        return INLINE;
      }
    }

    // Resolve custom rules. These rules include the default behavior of
    // well-known helper libraries.
    for (const rule of pkg.starbeam.inline) {
      const isExternal = resolveIsExternal(rule, id);
      if (isExternal !== undefined) return isExternal;
    }

    // Allow custom rules to override the default behavior
    // of `#` and `/` dependencies.
    if (id.startsWith("#") || id.startsWith("/")) {
      return INLINE;
    }

    const strictExternals = pkg.starbeam.strict.externals;
    if (strictExternals !== "allow") {
      const message = [
        `The external dependency ${id} is included in your compiled output. This means that your compiled output will contain a runtime import of that package.`,
        `This is the default behavior of starbeam-dev, but you did not specify an inline rule for ${id}, and there is no built-in rule that applies to ${id}.`,
      ];

      if (strictExternals === "error") {
        const error = [
          `Unexpected external dependency: ${id}.`,
          ...message,
          `This is an error because you are in strict externals mode (${strictExternals}), as specified in "starbeam:strict" in your package.json at:\n  ${join(
            pkg.root,
            "package.json",
          )})`,
        ].join("\n\n");
        throw Error(error);
      } else {
        console.warn(
          [
            ...message,
            `This message appears because you are in strict externals mode (${strictExternals}), as specified in "starbeam:strict" in your package.json at:\n  ${join(
              pkg.root,
              "package.json",
            )})`,
          ].join("\n"),
        );
      }
    }

    return true;
  };
}

function resolveIsExternal(
  option: NormalizedExternalOption,
  id: string,
): RollupExternal | undefined {
  return findExternalFn(option)(id);

  /**
   * @param {import("#core").NormalizedExternalOption} option
   * @returns {(id: string) => import("#core").RollupExternal | undefined}
   */
  function findExternalFn([operator, name, config]: NormalizedExternalOption): (
    id: string,
  ) => RollupExternal | undefined {
    const find = operatorFn(operator);
    return (id) => (find(id, name) ? fromConfig(config) : undefined);
  }

  /**
   * @param {import("#core").ExternalConfig | undefined} config
   * @returns {import("#core").RollupExternal | undefined}
   */
  function fromConfig(
    config: ExternalConfig | undefined,
  ): RollupExternal | undefined {
    switch (config) {
      case "external":
        return EXTERNAL;
      case "inline":
        return INLINE;
      case undefined:
        return undefined;
    }
  }

  function operatorFn(
    operator: NormalizedExternalOperator,
  ): (id: string, key: string) => boolean {
    switch (operator) {
      case "startsWith":
        return (id, key) => id.startsWith(key);
      case "is":
        return (id, key) => id === key;
    }
  }
}
