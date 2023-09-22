export { COORDINATION, TAG, UNINITIALIZED } from "./src/constants.js";
export { getID } from "./src/id.js";
export {
  finalize,
  isFinalized,
  linkToFinalizationScope,
  mountFinalizationScope,
  onFinalize,
  pushFinalizationScope,
} from "./src/lifetimes.js";
export { bump, now } from "./src/now.js";
export { consume, start } from "./src/stack.js";
export { testing } from "./src/testing.js";
