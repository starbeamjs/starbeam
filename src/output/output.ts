import { DomImplementation, DomTypes } from "../dom/implementation";
import { Reactive } from "../reactive/interface";

export interface BuildMetadata {
  readonly isStatic: boolean;
}

export type OutputBuilder<In, Out> = (input: Reactive<In>) => Out;

export interface Output<T extends DomTypes, N extends T[keyof T]> {
  readonly metadata: BuildMetadata;

  render(dom: DomImplementation<T>): Rendered<T, N>;
}

export interface RenderMetadata {
  isConstant: boolean;
}

export interface Rendered<T extends DomTypes, N extends T[keyof T]> {
  readonly metadata: RenderMetadata;
  readonly node: N;

  poll(dom: DomImplementation<T>): void;
}
