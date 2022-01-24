import type { ContentConstructor } from "../../dom/streaming/tree-constructor";
import type { Reactive } from "../../reactive/core";
import { PROGRAM_NODE_BRAND } from "../../reactive/internal";
import type { ReactiveMetadata } from "../../reactive/metadata";
import { isObject } from "../../utils";
import type { RenderedAttribute } from "../attribute";
import type { RenderedContent } from "./rendered-content";

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export type RenderedProgramNode = RenderedContent | RenderedAttribute;

export abstract class ProgramNode {
  static is(value: unknown): value is ProgramNode {
    return isObject(value) && PROGRAM_NODE_BRAND.is(value);
  }

  isConstant(): boolean {
    return this.metadata.isConstant();
  }

  isDynamic(): boolean {
    return this.metadata.isDynamic();
  }
}

export interface ProgramNode {
  readonly metadata: ReactiveMetadata;
}

export abstract class AbstractContentProgramNode<
  R extends RenderedContent
> extends ProgramNode {
  /**
   * This function returns `null` if the rendered HTML is constant, and
   * therefore does not need to be updated.
   */
  abstract render(buffer: ContentConstructor): R;
}

export type ContentProgramNode<R extends RenderedContent = RenderedContent> =
  AbstractContentProgramNode<R>;

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
