import { DomImplementation, DomTypes } from "../dom/implementation";
import { Reactive } from "../reactive/core";
import { BuildMetadata, Output, Rendered, RenderMetadata } from "./output";

export class ReactiveTextNode<T extends DomTypes>
  implements Output<T, T["text"]>
{
  readonly #reactive: Reactive<string>;

  constructor(reactive: Reactive<string>) {
    this.#reactive = reactive;
  }

  get metadata(): BuildMetadata {
    return {
      isStatic: this.#reactive.metadata.isStatic,
    };
  }

  render(dom: DomImplementation<T>): RenderedTextNode<T> {
    let text = dom.createTextNode(this.#reactive.current);
    return new RenderedTextNode(this.#reactive, text);
  }
}

export class RenderedTextNode<T extends DomTypes>
  implements Rendered<T, T["text"]>
{
  readonly #reactive: Reactive<string>;
  readonly #node: T["text"];

  constructor(reactive: Reactive<string>, node: T["text"]) {
    this.#reactive = reactive;
    this.#node = node;
  }

  get metadata(): RenderMetadata {
    return {
      isConstant: this.#reactive.metadata.isStatic,
      isStable: {
        firstNode: true,
        lastNode: true
      }
    };
  }

  get node(): T["text"] {
    return this.#node;
  }

  poll(dom: DomImplementation<T>): void {
    dom.updateTextNode(this.#node, this.#reactive.current);
  }
}

export function TEXT<T extends DomTypes>(
  input: Reactive<string>
): ReactiveTextNode<T> {
  return new ReactiveTextNode(input);
}
