export { isParentNode } from "../dom/src/verify.js";
export { assert, assertCondition } from "./src/assert.js";
export {
  DisplayStruct,
  type DisplayStructOptions,
} from "./src/inspect/display-struct.js";
export {
  debug,
  DEBUG,
  DEBUG_NAME,
  INSPECT,
  type Inspect,
} from "./src/inspect/inspect-support.js";
export { DebugFinalizer, DebugObjectLifetime } from "./src/lifetime.js";
export { tree, TreeContent, TreeRecord } from "./src/tree.js";
export {
  LocalName,
  QualifiedName,
  Wrapper,
  type OpaqueAlias,
  type OpaqueMetadata,
  type OpaqueValue,
} from "./src/wrapper.js";
