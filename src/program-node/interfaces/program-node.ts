import type { minimal } from "@domtree/flavors";
import type { ContentConstructor } from "../../dom/streaming/tree-constructor";
import type { AbstractReactive } from "../../reactive/core";
import { HasMetadata, ReactiveMetadata } from "../../reactive/metadata";
import type { RenderedContent } from "./rendered-content";

export type OutputBuilder<In, Out> = (input: AbstractReactive<In>) => Out;

export abstract class RenderedProgramNode<Container> extends HasMetadata {
  abstract initialize(inside: Container): void;
  abstract poll(inside: Container): void;
}

// export type RenderedProgramNode = RenderedContent | RenderedAttribute;

export abstract class AbstractProgramNode<
  Cursor,
  Container
> extends HasMetadata {
  isConstant(): boolean {
    return this.metadata.isConstant();
  }

  isDynamic(): boolean {
    return this.metadata.isDynamic();
  }

  abstract get metadata(): ReactiveMetadata;
  abstract render(cursor: Cursor): RenderedProgramNode<Container>;
}

export type ProgramNode<
  Cursor = unknown,
  Container = unknown
> = AbstractProgramNode<Cursor, Container>;

export class Rendered<R extends RenderedContent> extends HasMetadata {
  static of<R extends RenderedContent>(content: R): Rendered<R> {
    return new Rendered(content);
  }

  private constructor(readonly content: R) {
    super();
  }

  get metadata(): ReactiveMetadata {
    return this.content.metadata;
  }
}

export abstract class ContentProgramNode extends AbstractProgramNode<
  ContentConstructor,
  minimal.ParentNode
> {
  /**
   * This function returns `null` if the rendered HTML is constant, and
   * therefore does not need to be updated.
   */
  abstract render(buffer: ContentConstructor): RenderedContent;
}
