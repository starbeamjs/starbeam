export {
  Action as Name,
  Frame,
  FrameWithAction as NamedFrame,
  FrameWithoutAction as AnonymousFrame,
  KnownFrame,
  Location,
  UnknownFrame,
} from "./src/frame.js";
export {
  debug,
  INSPECT,
  type Inspect as NodeInspect,
} from "../debug/src/inspect/inspect-support.js";
export { isErrorWithStack, ParsedStack, Stack } from "./src/stack.js";
