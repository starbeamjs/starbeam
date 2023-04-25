import "./src/debug/warnings.js";

export {
  type ReactApp,
  Starbeam,
  useStarbeamApp,
} from "./src/context-provider.js";
export * from "./src/element.js";
export * from "./src/ref.js";
export { setupCell, useSetup } from "./src/use-reactive.js";
export { setupResource, useResource } from "./src/use-resource.js";
export { setupService, useService } from "./src/use-service.js";
export { setupComponent } from "./src/use-setup.js";
export { useStarbeam } from "./src/use-starbeam.js";
export { useDeps, useProp } from "./src/utils.js";
export type { Lifecycle } from "./src/v2/lifecycle.js";
export { setup, setupReactive, useReactive } from "./src/v2/setup.js";
