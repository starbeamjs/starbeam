import { EXTERNAL, INLINE } from "../../constants.js";

/**
 * @typedef {import("../../package.js").PackageInfo} PackageInfo
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
 * 2. Absolute imports: If the import starts with `/`, then it is an inline
 *    import. This is because absolute imports are usually relative imports
 *    previously resolved by the build process. In general, you should not use
 *    absolute imports in your source code when using this plugin (and probably
 *    in general).
 * 3. Import map imports: If the import starts with `#`, then it is an inline
 *    import. Since import-map imports typically resolve to relative imports,
 *    the current behavior is to inline them.
 * 4. If the `starbeam:external` key in `package.json` specifies a rule for a
 *    dependency, use it.
 *
 * It would probably be more correct to attempt to resolve import map imports
 * and then apply the rules above to the resolved imports. Please file an issue
 * describing your situation if you need this.
 *
 * ## Manifest Rules (`starbeam:external` keys)
 *
 * The `starbeam:external` key is either an array of patterns or a rules object.
 *
 * ### Rules Object
 *
 * Each key in the object is the name of a package listed in the `dependencies`
 * or `optionalDependencies` field, and the value is either "inline" or
 * "external".
 *
 * The default behavior is to externalize all dependencies, so you don't need to
 * specify "external" in a rules object except for documentation.
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
 *   "starbeam:external": {
 *     "lodash": "inline"
 *   }
 * }
 * ```
 *
 * In this example, the `react` dependency is externalized, and the `lodash`
 * dependency is inlined.
 *
 * ### Pattern Array
 *
 * You can use a pattern array to specify the externalization rules for multiple
 * packages at once.
 *
 * Example:
 *
 * ```json
 * {
 *   "dependencies": {
 *     "react": "^18.2.0",
 *     "lodash.map": "^4.6.0",
 *     "lodash.merge": "^4.6.0"
 *   },
 *
 *   "starbeam:external": [
 *     ["startsWith", {
 *       "lodash.": "inline"
 *     }]
 *   ]
 * }
 * ```
 *
 * There are currently two pattern operators:
 *
 * - `startsWith`: Matches a package name that starts with the specified string.
 * - `scope`: Matches a package name that has the specified npm scope
 *   (`@`-prefixed). The pattern `["scope", "current"]` matches packages with
 *   the same npm scope as the current package.
 *
 * ## Matching Order for Custom Rules
 *
 * Custom rules are matched in the order they are listed in the
 * `starbeam:external` key.
 *
 * Earlier rules in the rule array take precedence over later rules. Earlier
 * rules in an rules object take precedence over later rules int he same rule
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
export default function externals(pkg) {
  const isExternal = external(pkg);

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
export function external(pkg) {
  /**
   * @param {string} id
   * @returns {boolean}
   */
  return (id) => {
    // Inline helper libraries.
    if (id === "tslib" || id === "@swc/helper") {
      return INLINE;
    }

    // Inline relative modules.
    if (id.startsWith(".")) {
      return INLINE;
    }

    // Resolve custom rules.
    for (const option of pkg.starbeam.external) {
      const isExternal = resolveIsExternal(option, id);
      if (isExternal !== undefined) return isExternal;
    }

    // Allow custom rules to override the default behavior
    // of `#` and `/` dependencies.
    if (id.startsWith("#") || id.startsWith("/")) {
      return INLINE;
    }

    // eslint-disable-next-line no-console
    console.warn("unhandled external", id);

    return true;
  };
}

/**
 * @param {import("#/package.js").ExternalOption} option
 * @param {string} id
 * @returns {import("#/types.js").RollupExternal | undefined}
 */
function resolveIsExternal(option, id) {
  return findExternalFn(option)(id);

  /**
   * @param {import("../../package.js").ExternalOption} option
   * @returns {(id: string) => import("#/types.js").RollupExternal | undefined}
   */
  function findExternalFn(option) {
    if (Array.isArray(option)) {
      const [operator, rules] = option;

      return (id) => fromConfig(operatorFn(operator, rules)(id));
    } else {
      return (id) => {
        return fromConfig(option[id]);
      };
    }
  }

  /**
   *
   * @param {import("#/manifest.js").ExternalOperator} operator
   * @param {import("#/package.js").SimpleExternal} rules
   * @returns {(id: string) => import("#/package.js").ExternalConfig | undefined}
   */
  function operatorFn(operator, rules) {
    return (id) => {
      const entry = Object.entries(rules).find(([key]) =>
        findOperatorFn(operator)(id, key),
      );
      return entry?.[1];
    };
  }

  /**
   * @param {import("#/package.js").ExternalConfig | undefined} config
   * @returns {import("#/types.js").RollupExternal | undefined}
   */
  function fromConfig(config) {
    switch (config) {
      case "external":
        return EXTERNAL;
      case "inline":
        return INLINE;
      case undefined:
        return undefined;
    }
  }

  /**
   * @param {import("#/manifest.js").ExternalOperator} operator
   * @returns {(id: string, key: string) => boolean}
   */
  function findOperatorFn(operator) {
    switch (operator) {
      case "startsWith":
        return (id, key) => id.startsWith(key);
      case "scope":
        return (id, key) => id.startsWith(`@${key}/`);
    }
  }
}
