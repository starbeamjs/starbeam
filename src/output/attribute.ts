// import { AttrCursor, DomType } from "../index";
import type * as minimal from "@domtree/minimal";
import type { ElementHeadBuffer } from "..";
import type { DomImplementation } from "../dom/implementation";
import { Reactive } from "../reactive/core";
import type { BuildAttribute } from "./element";
import type { BuildMetadata } from "./program-node";

export class AttributeProgramNode {
  static create(attribute: BuildAttribute): AttributeProgramNode {
    return new AttributeProgramNode(attribute, {
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

  render(buffer: ElementHeadBuffer): RenderedAttributeNode {
    let value = this.#attribute.value.current;

    let attribute = buffer.attr(this.#attribute.name, value);
    return new RenderedAttributeNode(attribute, this.#attribute.value);
  }
}

export class RenderedAttributeNode {
  #attribute: minimal.Attr;
  #value: Reactive<string | null>;

  constructor(attribute: minimal.Attr, value: Reactive<string | null>) {
    this.#attribute = attribute;
    this.#value = value;
  }

  poll(): void {
    let value = this.#value.current;

    if (value === null) {
      dom.removeAttribute(this.#attribute);
    } else {
      dom.updateAttribute(this.#attribute, value);
    }
  }
}
