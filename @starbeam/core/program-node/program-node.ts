import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
import type { ExtendsReactive } from "../reactive/base.js";

export type OutputBuilder<In, Out> = (input: ExtendsReactive<In>) => Out;

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
