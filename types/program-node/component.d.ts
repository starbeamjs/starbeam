import type { ReactiveParameter } from "../reactive/parameter.js";
import type { ContentProgramNode } from "./interfaces/program-node.js";
/**
 * It is important that the definition of `Component` remains a simple function
 * that takes an arg (and possible things like splattributes and effects) and
 * returns a ContentProgramNode.
 */
export declare type Component<P extends ReactiveParameter = ReactiveParameter> = (arg: P) => ContentProgramNode;
