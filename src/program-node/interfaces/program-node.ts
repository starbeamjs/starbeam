import type { ContentConstructor } from "../../dom/streaming/tree-constructor";
import type { Reactive } from "../../reactive/core";
import { PROGRAM_NODE_BRAND } from "../../reactive/internal";
import { HasMetadata, ReactiveMetadata } from "../../reactive/metadata";
import { isObject } from "../../utils";
import type { RenderedAttribute } from "../attribute";
import type { RenderedContent } from "./rendered-content";

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export type RenderedProgramNode = RenderedContent | RenderedAttribute;

export abstract class ProgramNode extends HasMetadata {
  static is(value: unknown): value is ProgramNode {
    return isObject(value) && PROGRAM_NODE_BRAND.is(value);
  }

  isConstant(): boolean {
    return this.metadata.isConstant();
  }

  isDynamic(): boolean {
    return this.metadata.isDynamic();
  }

  abstract get metadata(): ReactiveMetadata;
}

export class Rendered<R extends RenderedContent> extends HasMetadata {
  static of<R extends RenderedContent>(content: R): Rendered<R> {
    return new Rendered(content);
  }

  private constructor(readonly content: R) {
    super();
  }
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
