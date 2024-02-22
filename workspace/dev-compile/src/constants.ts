import type { RollupExternal } from "@starbeam-dev/core";
import typescriptLibrary from "typescript";

/**
 * The package should be inlined into the output. In this situation, the `external` function should
 * return `false`. This is the default behavior.
 */
export const INLINE = false satisfies RollupExternal;

/**
 * The package should be treated as an external dependency. In this situation, the `external` function
 * should return `true`. This is unusual and should be used when:
 *
 * - The package is a "helper library" (such as tslib) that we don't want to make a real dependency
 *   of the published package.
 * - (for now) The package doesn't have good support for ESM (i.e. `type: module` in package.json)
 *   but rollup will handle it for us.
 */
export const EXTERNAL = true satisfies RollupExternal;

export const {
  ImportsNotUsedAsValues,
  JsxEmit,
  ModuleKind,
  ModuleResolutionKind,
  ScriptTarget,
  ModuleDetectionKind,
} = typescriptLibrary;
