import "./src/debug/warnings.js";

export { type ReactApp, Starbeam, useStarbeamApp } from "./src/app.js";
export type { Lifecycle } from "./src/hooks/lifecycle.js";
export {
  setup,
  setupReactive,
  setupResource,
  setupService,
} from "./src/hooks/setup.js";
export { useReactive, useResource, useService } from "./src/hooks/use.js";
export * from "./src/modifiers/element.js";
export * from "./src/modifiers/ref.js";
export { useDeps, useProp } from "./src/utils.js";
