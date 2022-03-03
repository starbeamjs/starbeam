import type { Reactive } from "@starbeam/reactive";
import {
  REACTIVE,
  type ReactiveInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export interface RenderedProgramNode<Container> extends ReactiveProtocol {
  initialize(inside: Container): void;
  poll(inside: Container): void;
}

// export type RenderedProgramNode = RenderedContent | RenderedAttribute;

export abstract class AbstractProgramNode<Cursor, Container>
  implements ReactiveProtocol
{
  abstract [REACTIVE]: ReactiveInternals;
  abstract render(cursor: Cursor): RenderedProgramNode<Container>;
}

export type ProgramNode<
  Cursor = unknown,
  Container = unknown
> = AbstractProgramNode<Cursor, Container>;
