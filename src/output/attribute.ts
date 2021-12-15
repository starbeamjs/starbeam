// import { AttrCursor, DomType } from "../index";
import type { AttrCursor } from "../dom/cursor";
import type { DomImplementation } from "../dom/implementation";
import type { DomTypes } from "../dom/types";
import { Reactive } from "../reactive/core";
import type { BuildAttribute } from "./element";
import type { BuildMetadata } from "./output";

export class ReactiveAttributeNode<T extends DomTypes> {
  static create<T extends DomTypes>(
    attribute: BuildAttribute
  ): ReactiveAttributeNode<T> {
    return new ReactiveAttributeNode(attribute, {
      isStatic: Reactive.isStatic(attribute.value),
    });
  }

  #attribute: BuildAttribute;

  private constructor(
    attribute: BuildAttribute,
    readonly metadata: BuildMetadata
  ) {
    this.#attribute = attribute;
  }

  render(
    _dom: DomImplementation<T>,
    cursor: AttrCursor<T>
  ): RenderedAttributeNode<T> {
    let value = this.#attribute.value.current;

    let attribute = cursor.initialize(this.#attribute.name, value);
    return new RenderedAttributeNode(attribute, this.#attribute.value);
  }
}

export class RenderedAttributeNode<T extends DomTypes> {
  #attribute: T["attribute"];
  #value: Reactive<string | null>;

  constructor(attribute: T["attribute"], value: Reactive<string | null>) {
    this.#attribute = attribute;
    this.#value = value;
  }

  poll(dom: DomImplementation<T>): void {
    let value = this.#value.current;

    if (value === null) {
      dom.removeAttribute(this.#attribute);
    } else {
      dom.updateAttribute(this.#attribute, value);
    }
  }
}
