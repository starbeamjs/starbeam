import { setupDebug } from "@starbeam/debug";

if (import.meta.env.DEV) {
  await setupDebug();
}

/** @internal Compatibility export for existing debug integrations. */
export { DEBUG_RENDERER } from "./src/debug-renderer.js";
export { FormulaList } from "./src/reactive-core/higher-level/formula-list.js";
export { Freshness } from "./src/reactive-core/higher-level/freshness.js";
export {
  type Variant,
  type VariantEntry,
  Variants,
  type VariantType,
} from "./src/reactive-core/variants.js";
export type { Reactive } from "@starbeam/interfaces";
export {
  CachedFormula,
  Cell,
  type Equality,
  Formula,
  type FormulaFn,
  Marker,
  read,
  Static,
} from "@starbeam/reactive";
/** @internal Compatibility export for existing debug integrations. */
export { DEBUG } from "@starbeam/reactive";
export {
  type IntoResourceBlueprint,
  Resource,
  type ResourceBlueprint,
  ResourceList,
} from "@starbeam/resource";
/** @internal Compatibility export for existing low-level integrations. */
export { CONTEXT, RUNTIME, TAG } from "@starbeam/runtime";
