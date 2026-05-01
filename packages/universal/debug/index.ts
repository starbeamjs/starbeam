import { setupDebug } from "./src/setup.js";

await setupDebug();

export { default as DEBUG } from "./src/debug.js";
export { setupDebug } from "./src/setup.js";
export { debugReactive, logReactive } from "./src/tag.js";
export { Tree } from "./src/tree.js";
