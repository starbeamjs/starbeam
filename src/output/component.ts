import type { BuildMetadata } from ".";
import type { UpdatingContentCursor } from "../dom/cursor/updating";
import type { DomImplementation } from "../dom/implementation";
import type { AnyNode, DomTypes } from "../dom/types";
import { ReactiveParameter } from "../reactive/parameter";
import type {
  AnyOutput,
  AbstractProgramNode,
  Rendered,
  RenderMetadata,
} from "./program-node";

export type Component<
  P extends ReactiveParameter,
  T extends DomTypes,
  N extends T[keyof T]
> = (arg: P) => AbstractProgramNode<T, N>;

export type ComponentNodeType<
  T extends DomTypes,
  C extends (arg: any) => AnyOutput<any>
> = C extends (arg: any) => AbstractProgramNode<T, infer N> ? N : never;

export type AnyComponent<T extends DomTypes> = Component<
  ReactiveParameter,
  T,
  T[keyof T]
>;

export class ComponentInvocation<T extends DomTypes, N extends AnyNode<T>>
  implements AbstractProgramNode<T, N>
{
  static invoke<
    P extends ReactiveParameter,
    T extends DomTypes,
    N extends AnyNode<T>
  >(component: Component<P, T, N>, parameter: P): ComponentInvocation<T, N> {
    let isStatic = ReactiveParameter.isStatic(parameter);

    return new ComponentInvocation(component(parameter), {
      isStatic,
    }) as ComponentInvocation<T, any>;
  }

  declare readonly NODE: N;
  readonly metadata: BuildMetadata;
  readonly #output: AbstractProgramNode<T, N>;

  private constructor(
    output: AbstractProgramNode<T, N>,
    metadata: BuildMetadata
  ) {
    this.#output = output;
    this.metadata = metadata;
  }

  render(
    dom: DomImplementation<T>,
    cursor: UpdatingContentCursor<T>
  ): RenderedComponent<T, N> {
    return RenderedComponent.of<T, N>(this.#output.render(dom, cursor));
  }
}

export type AnyComponentInvocation<T extends DomTypes> = ComponentInvocation<
  T,
  AnyNode<T>
>;

export class RenderedComponent<T extends DomTypes, N extends AnyNode<T>>
  implements Rendered<T, N>
{
  static of<T extends DomTypes, N extends AnyNode<T>>(
    rendered: Rendered<T, N>
  ): RenderedComponent<T, N> {
    return new RenderedComponent(rendered);
  }

  declare readonly NODE: N;
  readonly #rendered: Rendered<T, N>;

  constructor(rendered: Rendered<T, N>) {
    this.#rendered = rendered;
  }

  get cursor(): UpdatingContentCursor<T> {
    return this.#rendered.cursor;
  }

  get metadata(): RenderMetadata {
    return this.#rendered.metadata;
  }

  move(_dom: DomImplementation<T>, _cursor: UpdatingContentCursor<T>): void {
    throw new Error("Method not implemented.");
  }

  poll(dom: DomImplementation<T>): void {
    this.#rendered.poll(dom);
  }
}

export type AnyRenderedComponent<T extends DomTypes> = RenderedComponent<
  T,
  AnyNode<T>
>;
