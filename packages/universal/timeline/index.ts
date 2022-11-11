// FIXME: Move the core of this to @starbeam/shared
export {
  type ComponentContext,
  type Context,
  CONTEXT,
} from "./src/context/context.js";
export {
  type CleanupTarget,
  type Lifetime,
  type OnCleanup,
  LIFETIME,
} from "./src/lifetime/api.js";
export type { Unsubscribe } from "./src/lifetime/object-lifetime.js";
export { TIMELINE } from "./src/timeline/api.js";
export {
  type FrameValidation,
  ActiveFrame,
  Frame,
} from "./src/timeline/frame.js";
export {
  Reactive,
  ReactiveCore,
  ReactiveInternals,
  ReactiveProtocol,
} from "./src/timeline/protocol.js";
export { Subscription, Subscriptions } from "./src/timeline/subscriptions.js";
export { INSPECT } from "./src/timeline/timestamp.js";
export { max, getNow as now, zero } from "./src/timeline/timestamp.js";
export { diff } from "./src/timeline/utils.js";
export { REACTIVE } from "@starbeam/shared";

import type * as interfaces from "@starbeam/interfaces";

import * as timestamp from "./src/timeline/timestamp.js";

export const Timestamp = timestamp.Timestamp;
export type Timestamp = interfaces.Timestamp;
