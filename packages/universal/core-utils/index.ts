export {
  firstNItems,
  getFirst,
  getLast,
  getLastIndex,
  ifPresentArray,
  isArray,
  isEmptyArray,
  isPresentArray,
  isSingleItemArray,
  mapArray,
  mapIfPresent,
  mapPresentArray,
  type MutablePresentArray,
  nullifyEmptyArray,
  type PresentArray,
  type ReadonlyPresentArray,
  removeItem,
  removeItemAt,
  withoutFirst,
  withoutLast,
  zipArrays,
} from "./src/array.js";
export { type UnknownFn } from "./src/function.js";
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
export { iterableHasItems, reverse } from "./src/iterable.js";
export type {
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from "./src/json.js";
export { isJSONObject, stringifyJSON } from "./src/json.js";
export {
  dataGetter,
  def,
  defineObject,
  defMethod,
  getter,
  isObject,
  method,
  objectHasKeys,
  readonly,
} from "./src/object.js";
export { type Matcher, Overload, type TypedOverload } from "./src/overload.js";
export { isEmptyMatch, matchPattern, Pattern } from "./src/regexp.js";
export {
  asIntIndex,
  isPresentString,
  stringify,
  TO_STRING,
} from "./src/string.js";
export { isPresent } from "./src/value.js";
