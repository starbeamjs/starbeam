export { COORDINATION, TAG, UNINITIALIZED } from "./src/constants.js";
export { getID } from "./src/id.js";
export {
  createFinalizationScope,
  finalize,
  linkToFinalizationScope,
  onFinalize,
} from "./src/lifetimes.js";
export { bump, now } from "./src/now.js";
export { consume, start } from "./src/stack.js";
export { testing } from "./src/testing.js";
