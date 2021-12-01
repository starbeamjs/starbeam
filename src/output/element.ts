import { DomImplementation, DomTypes } from "../dom/implementation";
import { BuildMetadata, Output, Rendered, RenderMetadata } from "./output";

export class ReactiveElementNode<T extends DomTypes>
  implements Output<T, T["text"]>
{
  get metadata(): BuildMetadata {
    throw Error("unimplemented");
  }

  render(_dom: DomImplementation<T>): RenderedElementNode<T> {
    throw Error("unimplemented");
  }
}

export class RenderedElementNode<T extends DomTypes>
  implements Rendered<T, T["element"]>
{
  // readonly #reactive: Reactive<string>;
  readonly #node: T["element"];

  constructor(node: T["element"]) {
    this.#node = node;
  }

  get metadata(): RenderMetadata {
    throw Error("unimplemented");
  }

  get node(): T["element"] {
    return this.#node;
  }

  poll(_dom: DomImplementation<T>): void {
    throw new Error("Method not implemented.");
  }
}

export function ELEMENT<T extends DomTypes>(): ReactiveElementNode<T> {
  throw Error("unimplemented");
}
