import type * as minimal from "@domtree/minimal";
import { COMPATIBLE_DOM } from "../dom/streaming/compatible-dom";
import {
  ElementHeadConstructor,
  TOKEN,
} from "../dom/streaming/tree-constructor";
import { Reactive } from "../reactive/core";
import type { BuildAttribute } from "./element";
import { Dehydrated } from "./hydrator/hydrate-node";
import type {
  BuildMetadata,
  RenderedProgramNodeMetadata,
} from "./program-node";

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

  render(buffer: ElementHeadConstructor): Dehydrated<RenderedAttribute> | null {
    let value = this.#attribute.value.current;

    return Dehydrated.attribute(
      buffer.attr(this.#attribute.name, value, TOKEN),
      (attr) => RenderedAttribute.create(attr, this.#attribute.value)
    );
  }
}

export class RenderedAttribute {
  static create(attribute: minimal.Attr, value: Reactive<string | null>) {
    return new RenderedAttribute(attribute, value, {
      isConstant: Reactive.isStatic(value),
    });
  }

  #attribute: minimal.Attr;
  #value: Reactive<string | null>;

  #metadata: RenderedProgramNodeMetadata;

  private constructor(
    attribute: minimal.Attr,
    value: Reactive<string | null>,
    metadata: RenderedProgramNodeMetadata
  ) {
    this.#attribute = attribute;
    this.#value = value;
    this.#metadata = metadata;
  }

  get metadata(): RenderedProgramNodeMetadata {
    return this.#metadata;
  }

  poll(): void {
    let value = this.#value.current;
    COMPATIBLE_DOM.updateAttr(this.#attribute, value);
  }
}
