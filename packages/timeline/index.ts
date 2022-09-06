export {
  type CleanupTarget,
  type Lifetime,
  type OnCleanup,
  LIFETIME,
} from "./src/lifetime/api.js";
export type { Unsubscribe } from "./src/lifetime/object-lifetime.js";
export { TIMELINE } from "./src/timeline/api.js";
export { type FrameValidation, Frame } from "./src/timeline/frame.js";
export {
  Reactive,
  ReactiveInternals,
  ReactiveProtocol,
} from "./src/timeline/protocol.js";
export { Subscription, Subscriptions } from "./src/timeline/subscriptions.js";
export { INSPECT } from "./src/timeline/timestamp.js";
export { max, now, zero } from "./src/timeline/timestamp.js";
export { diff } from "./src/timeline/utils.js";
export { isDebug } from "@starbeam/debug";
export { REACTIVE } from "@starbeam/peer";

import type * as interfaces from "@starbeam/interfaces";

import * as timestamp from "./src/timeline/timestamp.js";

export const Timestamp = timestamp.Timestamp;
export type Timestamp = interfaces.Timestamp;
