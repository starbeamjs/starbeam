import { descriptionFrom } from "./src/stack.js";

export { ifDebug, isDebug, isProd } from "./src/conditional.js";
export { Description, REUSE_ID } from "./src/description/reactive-value.js";
export {
  type DisplayStructOptions,
  DisplayStruct,
} from "./src/inspect/display-struct.js";
export {
  type Inspect,
  DEBUG,
  DEBUG_NAME,
  INSPECT,
  inspect,
  inspector,
} from "./src/inspect/inspect-support.js";
export { type Logger, LOGGER, LogLevel } from "./src/logger.js";
export {
  Block,
  Fragment,
  Message,
  Style,
  Styled,
  Styles,
} from "./src/message.js";
export { type DisplayParts, describeModule } from "./src/module.js";
export {
  callerStack,
  descriptionFrom,
  idFrom,
  entryPoint,
  isErrorWithStack,
  Stack,
} from "./src/stack.js";
export {
  type CellConsumeOperation,
  type CellUpdateOperation,
  type DebugFilter,
  type DebugListener,
  type DebugOperation,
  type Flush,
  type FrameConsumeOperation,
  type MutationLog,
  DebugTimeline,
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
