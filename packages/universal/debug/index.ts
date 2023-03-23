import "./src/setup.js";

import { descriptionFrom } from "./src/stack.js";

export { Description, REUSE_ID } from "./src/description/impl.js";
export {
  DisplayStruct,
  type DisplayStructOptions,
} from "./src/inspect/display-struct.js";
export {
  DEBUG,
  DEBUG_NAME,
  INSPECT,
  type Inspect,
  inspect,
  inspector,
} from "./src/inspect/inspect-support.js";
export { logged } from "./src/logged.js";
export { LOGGER, type Logger, LogLevel } from "./src/logger.js";
export {
  Block,
  Fragment,
  Message,
  Style,
  Styled,
  Styles,
} from "./src/message.js";
export { describeModule, type DisplayParts } from "./src/module.js";
export {
  callerStack,
  Desc,
  descriptionFrom,
  entryPoint,
  entryPointFn,
  entryPoints,
  idFrom,
  isErrorWithStack,
  Stack,
} from "./src/stack.js";
export { debugTag, logTag } from "./src/tag.js";
export {
  type CellConsumeOperation,
  type CellUpdateOperation,
  type DebugFilter,
  type DebugListener,
  type DebugOperation,
  DebugTimeline,
  type Flush,
  type FrameConsumeOperation,
  type MutationLog,
} from "./src/timeline.js";
export { Tree } from "./src/tree.js";
export type {
  ApiDetails,
  DescriptionArgs,
  DescriptionDetails,
  DescriptionParts,
  DescriptionType,
  DetailDescription,
  DetailsPart,
  MemberDescription,
} from "@starbeam/interfaces";

export const defaultDescription = descriptionFrom({
  id: NaN,
  type: "erased",
  api: "anonymous",
});
