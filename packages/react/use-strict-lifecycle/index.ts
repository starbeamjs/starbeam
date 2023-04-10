export { isRestrictedRead as isRendering } from "./src/react.js";
export {
  beginReadonly as maskRendering,
  setupFunction,
  endReadonly as unmaskRendering,
  unsafeTrackedElsewhere,
} from "./src/react.js";
export type { RegisterLifecycleHandlers } from "./src/resource.js";
export { useLifecycle } from "./src/resource.js";
export {
  type Ref,
  useUpdatingRef,
  useUpdatingVariable,
} from "./src/updating-ref.js";
