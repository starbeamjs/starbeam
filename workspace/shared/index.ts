export { FATAL_EXIT_CODE, OK_EXIT_CODE } from "./src/constants.js";
export { type ErrorReporter, fatal } from "./src/fatal.js";
export { terminalWidth } from "./src/format.js";
export { DisplayStruct } from "./src/inspect.js";
export type {
  AsString,
  ErrResult,
  Into,
  IntoPresentArray,
  IntoResult,
  IntoUnion,
  IntoUnionInstance,
  OkRecord,
  OkResult,
  TakeFn,
  UnionClass,
  UnionInstance,
} from "./src/type-magic.js";
export type { AnyUnionClass } from "./src/type-magic.js";
export { PresentArray, Result, Union } from "./src/type-magic.js";

export type ChangeType = "create" | "remove" | "update";
export type ChangeResult = ChangeType | false;
