export type {
  InsertIntoArrayOptions,
  UniqueInsertOption,
} from "./src/edits/array/insert.js";
export { JsonModification } from "./src/edits/edits.js";
export type { InsertIntoObjectOptions } from "./src/edits/object/insert.js";
export type { JsonValueNode } from "./src/representation/node.js";
export {
  getArrayAt,
  getObjectAt,
  getPosition,
  getRange,
  getValueAt as getValue,
} from "./src/representation/nodes/abstract.js";
export type { JsonArrayNode } from "./src/representation/nodes/array.js";
export type { JsonObjectNode } from "./src/representation/nodes/object.js";
export type { JsonPrimitiveNode } from "./src/representation/nodes/primitive.js";
export {
  type ModifiableSourceRoot,
  SourceCursor,
  SourceRange,
  SourceRoot,
} from "./src/representation/source.js";
export { stringify } from "./src/stringify.js";
export * as jsonc from "jsonc-parser";
