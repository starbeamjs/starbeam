import type * as minimal from "@domtree/minimal";
import { DOM } from "../dom/streaming/compatible-dom";
import { LazyDOM } from "../dom/streaming/token";
import {
  ElementHeadConstructor,
  TOKEN,
} from "../dom/streaming/tree-constructor";
import type { Reactive } from "../reactive/core";
import type { ReactiveMetadata } from "../reactive/metadata";
import type { BuildAttribute } from "./element";
import { ProgramNode } from "./interfaces/program-node";

export class AttributeProgramNode extends ProgramNode {
  static create(attribute: BuildAttribute): AttributeProgramNode {
    return new AttributeProgramNode(attribute);
  }

  #attribute: BuildAttribute;

  private constructor(attribute: BuildAttribute) {
    super();
    this.#attribute = attribute;
  }

  get metadata(): ReactiveMetadata {
    return this.#attribute.value.metadata;
  }

  render(buffer: ElementHeadConstructor): RenderedAttribute | null {
    let value = this.#attribute.value;
    // let value = this.#attribute.value.current;
    let attr = buffer.attr(this.#attribute.name, value.current, TOKEN);
    return RenderedAttribute.create(
      LazyDOM.of(buffer.environment, attr),
      value
    );
  }
}

export class RenderedAttribute extends ProgramNode {
  static create(
    attribute: LazyDOM<minimal.Attr>,
    value: Reactive<string | null>
  ) {
    return new RenderedAttribute(attribute, value);
  }

  readonly #attribute: LazyDOM<minimal.Attr>;
  readonly #value: Reactive<string | null>;

  private constructor(
    attribute: LazyDOM<minimal.Attr>,
    value: Reactive<string | null>
  ) {
    super();
    this.#attribute = attribute;
    this.#value = value;
  }

  get metadata(): ReactiveMetadata {
    return this.#value.metadata;
  }

  initialize(inside: minimal.ParentNode): void {
    this.#attribute.get(inside);
  }

  poll(inside: minimal.ParentNode): void {
    DOM.updateAttr(this.#attribute.get(inside), this.#value.current);
  }
}
