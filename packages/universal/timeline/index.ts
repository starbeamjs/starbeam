// FIXME: Move the core of this to @starbeam/shared
export {
  type ComponentContext,
  CONTEXT,
  type Context,
} from "./src/context/context.js";
export {
  type CleanupTarget,
  LIFETIME,
  type Lifetime,
  type OnCleanup,
} from "./src/lifetime/api.js";
export type { Unsubscribe } from "./src/lifetime/object-lifetime.js";
export { TIMELINE } from "./src/timeline/api.js";
export {
  ActiveFrame,
  Frame,
  type FrameValidation,
} from "./src/timeline/frame.js";
export {
  Reactive,
  Tag as ReactiveInternals,
  Tagged as Tagged,
} from "./src/timeline/protocol.js";
export {
  type NotifyReady,
  Subscriptions,
} from "./src/timeline/subscriptions.js";
export { INSPECT } from "./src/timeline/timestamp.js";
export { max, getNow as now, zero } from "./src/timeline/timestamp.js";
export { diff } from "./src/timeline/utils.js";
export { TAG } from "@starbeam/shared";

import type * as interfaces from "@starbeam/interfaces";

import * as timestamp from "./src/timeline/timestamp.js";

export const Timestamp = timestamp.Timestamp;
export type Timestamp = interfaces.Timestamp;
