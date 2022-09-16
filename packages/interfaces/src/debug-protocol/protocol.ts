import type { ChildNode } from "./tree.js";

export const DEBUG = Symbol.for("starbeam.protocol:debug");

export interface DebugProtocol {
  [DEBUG]: ChildNode;
}
