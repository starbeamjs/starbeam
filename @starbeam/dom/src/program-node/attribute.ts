import type * as minimal from "@domtree/minimal";
import type { Reactive, ReactiveMetadata } from "@starbeam/core";
import {
  AbstractProgramNode,
  RenderedProgramNode,
} from "../../../core/program-node/program-node.js";
import { DOM } from "../dom/streaming/compatible-dom.js";
import { LazyDOM } from "../dom/streaming/token.js";
import {
  ElementHeadConstructor,
  TOKEN,
} from "../dom/streaming/tree-constructor.js";
import type { BuildAttribute } from "./element.js";

export class AttributeProgramNode extends AbstractProgramNode<
  ElementHeadConstructor,
  minimal.ParentNode
> {
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

  render(buffer: ElementHeadConstructor): RenderedAttribute {
    let value = this.#attribute.value;
    // let value = this.#attribute.value.current;
    let attr = buffer.attr(this.#attribute.name, value.current, TOKEN);
    return RenderedAttribute.create(
      LazyDOM.create(buffer.environment, attr),
      value
    );
  }
}

export class RenderedAttribute extends RenderedProgramNode<minimal.ParentNode> {
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
