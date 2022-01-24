import type { ReactiveParameter } from "../reactive/parameter";
import type { ContentProgramNode } from "./interfaces/program-node";
import type { RenderedContent } from "./interfaces/rendered-content";

/**
 * It is important that the definition of `Component` remains a simple function
 * that takes an arg (and possible things like splattributes and effects) and
 * returns a ContentProgramNode.
 */
export type Component<
  P extends ReactiveParameter = ReactiveParameter,
  R extends RenderedContent = RenderedContent
> = (arg: P) => ContentProgramNode<R>;
