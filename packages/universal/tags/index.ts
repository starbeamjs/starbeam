export {
  createCellTag,
  createDelegateTag,
  createFormulaTag,
  createStaticTag,
  getTargets,
} from "./src/tag.js";
export {
  getDependencies,
  getDescription,
  getTag,
  getTags,
  lastUpdated,
} from "./src/tagged.js";
export {
  debug as debugTimestamp,
  getNow,
  max,
  NOW,
  type Now,
  Timestamp,
  zero,
} from "./src/timestamp.js";
export type {
  CellTag,
  DelegateTag,
  FormulaTag,
  StaticTag,
} from "@starbeam/interfaces";
