// Contract vocabulary for framework adapter authors.
export type {
  Scheduler as ComponentScheduler,
  Handler,
  Lifecycle,
  ReactiveBlueprint,
  RendererManager,
  SetupBlueprint,
  UseReactive,
} from "./src/renderer.js";

// Shared manager helpers and handler utility.
export {
  managerCreateLifecycle,
  managerSetupReactive,
  managerSetupResource,
  managerSetupService,
  runHandlers,
} from "./src/renderer.js";

// Resource conversion and element-backed resource setup.
export type {
  ElementResourceBlueprint,
  ElementResourceInstance,
  IntoResourceBlueprint,
} from "./src/resource.js";
export { intoResourceBlueprint, setupElementResource } from "./src/resource.js";
