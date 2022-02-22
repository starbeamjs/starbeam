import type { ContentProgramNode } from "./content.js";

/**
 * It is important that the definition of `Component` remains a simple function
 * that takes an arg (and possible things like splattributes and effects) and
 * returns a ContentProgramNode.
 */
export type Component<P = unknown> = (arg: P) => ContentProgramNode;
