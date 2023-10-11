/**
 * @type {import("./package.js").ExternalOption[]}
 */
import typescriptLibrary from "typescript";

/**
 * @type {import("./package.js").ExternalOption[]}
 */
export const DEFAULT_EXTERNAL_OPTIONS = [
  ["startsWith", { "@babel/runtime/": "inline" }],
  ["startsWith", { "@domtree/": "inline" }],
  ["startsWith", { "@starbeam/": "external" }],
];

/**
 * The package should be inlined into the output. In this situation, the `external` function should
 * return `false`. This is the default behavior.
 *
 * @satisfies {import("./types.js").RollupExternal}
 */
export const INLINE = false;

/**
 * The package should be treated as an external dependency. In this situation, the `external` function
 * should return `true`. This is unusual and should be used when:
 *
 * - The package is a "helper library" (such as tslib) that we don't want to make a real dependency
 *   of the published package.
 * - (for now) The package doesn't have good support for ESM (i.e. `type: module` in package.json)
 *   but rollup will handle it for us.
 *
 * @satisfies {import("./types.js").RollupExternal}
 */
export const EXTERNAL = true;

export const {
  ImportsNotUsedAsValues,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  ModuleDetectionKind,
} = typescriptLibrary;
