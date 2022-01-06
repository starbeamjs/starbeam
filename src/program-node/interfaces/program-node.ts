import type { ContentConstructor } from "../../dom/streaming/tree-constructor";
import type { Reactive } from "../../reactive/core";
import { PROGRAM_NODE_BRAND } from "../../reactive/internal";
import { isObject } from "../../utils";
import type { AttributeProgramNode, RenderedAttribute } from "../attribute";
import type { RenderedContent } from "./rendered-content";

export interface BuildMetadata {
  readonly isStatic: boolean;
}

export const STATIC_BUILD_METADATA = {
  isStatic: true,
};

export const DYNAMIC_BUILD_METADATA = {
  isStatic: false,
};

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export type RenderedProgramNode = RenderedContent | RenderedAttribute;

export interface AbstractContentProgramNode<R extends RenderedContent> {
  readonly metadata: BuildMetadata;

  /**
   * This function returns `null` if the rendered HTML is constant, and
   * therefore does not need to be updated.
   */
  render(buffer: ContentConstructor): R | null;
}

export type ProgramNode<N extends RenderedProgramNode = RenderedProgramNode> =
  N extends RenderedAttribute
    ? AttributeProgramNode
    : N extends RenderedContent
    ? AbstractContentProgramNode<N>
    : never;

export type ContentProgramNode<N extends RenderedContent = RenderedContent> =
  AbstractContentProgramNode<N>;

export interface HasStaticMetadata {
  metadata: {
    isStatic: true;
  };
}

export interface HasDynamicMetadata {
  metadata: {
    isStatic: false;
  };
}

export type StaticProgramNode = ProgramNode & HasStaticMetadata;
export type DynamicProgramNode = ProgramNode & HasStaticMetadata;

export const ProgramNode = {
  is(value: unknown): value is ProgramNode {
    return isObject(value) && PROGRAM_NODE_BRAND.is(value);
  },

  isStatic(this: void, node: ProgramNode): node is StaticProgramNode {
    return node.metadata.isStatic;
  },

  isDynamic(this: void, node: ProgramNode): node is DynamicProgramNode {
    return !ProgramNode.isStatic(node);
  },
} as const;

export interface RenderedProgramNodeMetadata {
  readonly isConstant: boolean;
}
