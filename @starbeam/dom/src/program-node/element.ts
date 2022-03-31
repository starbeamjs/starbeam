import type * as minimal from "@domtree/minimal";
import { NonemptyList } from "@starbeam/core";
import { CompositeInternals, Reactive, Static } from "@starbeam/reactive";
import { REACTIVE, ReactiveInternals } from "@starbeam/timeline";
import type { ElementBody } from "../dom/buffer/body.js";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import type { Dehydrated, LazyDOM } from "../dom/streaming/token.js";
import {
  ElementBodyConstructor,
  ElementHeadConstructor,
  TreeConstructor,
} from "../dom/streaming/tree-constructor.js";
import { AttributeProgramNode, RenderedAttribute } from "./attribute.js";
import { ContentProgramNode } from "./content.js";
import { TextProgramNode } from "./data.js";
import { FragmentProgramNode, RenderedFragmentNode } from "./fragment.js";
import { RenderedContent } from "./interfaces/rendered-content.js";

export class ElementProgramNode extends ContentProgramNode {
  static create(
    tagName: Reactive<string>,
    buildAttributes: readonly BuildAttribute[],
    content: readonly ContentProgramNode[]
  ): ElementProgramNode {
    let attributes = buildAttributes.map(AttributeProgramNode.create);

    const composite = CompositeInternals(
      [...attributes, ...content],
      `ElementProgramNode`
    );

    // A static element may still need to be moved
    return new ElementProgramNode(
      tagName,
      attributes,
      FragmentProgramNode.of(NonemptyList.verified(content)),
      composite
    );
  }

  readonly #tagName: Reactive<string>;
  readonly #attributes: readonly AttributeProgramNode[];
  readonly #children: FragmentProgramNode;
  readonly #composite: ReactiveInternals;

  private constructor(
    tagName: Reactive<string>,
    attributes: readonly AttributeProgramNode[],
    children: FragmentProgramNode,
    composite: ReactiveInternals
  ) {
    super();
    this.#tagName = tagName;
    this.#attributes = attributes;
    this.#children = children;
    this.#composite = composite;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#composite;
  }

  render(buffer: TreeConstructor): RenderedElementNode {
    return buffer.element(
      this.#tagName.current,
      (head) =>
        DehydratedElementBuilder.create(this.#tagName, head, this.#composite)
          .attrs(this.#attributes)
          .body(this.#children),
      (token, builder) => builder.finalize(token)
    );
  }
}

export interface FinalizedElement {
  readonly attributes: readonly RenderedAttribute[];
  readonly content: RenderedFragmentNode | null;
}

class DehydratedElementBuilder {
  static create(
    tag: Reactive<string>,
    head: ElementHeadConstructor,
    composite: ReactiveInternals
  ): DehydratedElementBuilder {
    return new DehydratedElementBuilder(tag, head, composite, [], null);
  }

  readonly #tag: Reactive<string>;
  readonly #head: ElementHeadConstructor;
  readonly #composite: ReactiveInternals;
  readonly #attributes: RenderedAttribute[];
  #content: RenderedFragmentNode | null;

  private constructor(
    tag: Reactive<string>,
    head: ElementHeadConstructor,
    composite: ReactiveInternals,
    attributes: RenderedAttribute[],
    content: RenderedFragmentNode | null
  ) {
    this.#tag = tag;
    this.#head = head;
    this.#composite = composite;
    this.#attributes = attributes;
    this.#content = content;
  }

  attrs(nodes: readonly AttributeProgramNode[]): this {
    for (let node of nodes) {
      let attribute = node.render(this.#head);

      if (attribute) {
        this.#attributes.push(attribute);
      }
    }

    return this;
  }

  empty(type: ElementBody = "normal"): this {
    this.#head.empty(type);
    return this;
  }

  body(children: FragmentProgramNode): this {
    let body = this.#head.body();

    this.#content = children.render(body);

    ElementBodyConstructor.flush(body);

    return this;
  }

  finalize(token: Dehydrated<minimal.Element>): RenderedElementNode;
  finalize(): FinalizedElement;
  finalize(
    token?: Dehydrated<minimal.Element>
  ): RenderedElementNode | FinalizedElement {
    if (token) {
      return RenderedElementNode.create(
        token.dom,
        this.#tag,
        this.#composite,
        this.#attributes,
        this.#content
      );
    } else {
      return {
        attributes: this.#attributes,
        content: this.#content,
      };
    }
  }
}

export class RenderedElementNode extends RenderedContent {
  static create(
    node: LazyDOM<minimal.Element>,
    tagName: Reactive<string>,
    composite: ReactiveInternals,
    attributes: readonly RenderedAttribute[],
    children: RenderedFragmentNode | null
  ): RenderedElementNode {
    return new RenderedElementNode(
      node,
      tagName,
      composite,
      attributes,
      children
    );
  }

  readonly #element: LazyDOM<minimal.Element>;
  readonly #tagName: Reactive<string>;
  readonly #composite: ReactiveInternals;
  #attributes: readonly RenderedAttribute[];
  #children: RenderedFragmentNode | null;

  private constructor(
    node: LazyDOM<minimal.Element>,
    tagName: Reactive<string>,
    composite: ReactiveInternals,
    attributes: readonly RenderedAttribute[],
    children: RenderedFragmentNode | null
  ) {
    super();
    this.#element = node;
    this.#tagName = tagName;
    this.#composite = composite;
    this.#attributes = attributes;
    this.#children = children;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#composite;
  }

  [RANGE_SNAPSHOT](inside: minimal.ParentNode): RangeSnapshot {
    return RangeSnapshot.create(
      this.#element.environment,
      this.#element.get(inside)
    );
  }

  initialize(inside: minimal.ParentNode): void {
    this.#element.get(inside);

    for (const attr of this.#attributes) {
      attr.initialize(inside);
    }

    if (this.#children) {
      this.#children.initialize(inside);
    }
  }

  poll(inside: minimal.ParentNode): void {
    if (Reactive.isDynamic(this.#tagName)) {
      throw new Error("Not yet supported: Dynamic tag name");
    }

    const element = this.#element.get(inside);

    this.#attributes = this.#attributes.filter((attr) =>
      Reactive.isDynamic(attr)
    );

    for (const attr of this.#attributes) {
      attr.poll(element);
    }

    if (this.#children !== null && Reactive.isConstant(this.#children)) {
      this.#children = null;
    }

    if (this.#children) {
      this.#children.poll(element);
    }
  }
}

export type AbstractAttributeName<
  Prefix extends string | undefined,
  LocalName extends string
> = Prefix extends undefined ? LocalName : `${Prefix}:${LocalName}`;

export type AttributeName<
  Prefix extends string | undefined = string | undefined,
  LocalName extends string = string
> = AbstractAttributeName<Prefix, LocalName>;

export interface BuildAttribute {
  name: AttributeName;
  value: Reactive<string | null>;
}

export type ReactiveElementBuilderCallback = (
  builder: ElementProgramNodeBuilder
) => void;

export class ElementProgramNodeBuilder {
  static build(
    tagName: Reactive<string>,
    build: (builder: ElementProgramNodeBuilder) => void
  ): ElementProgramNode {
    let builder = new ElementProgramNodeBuilder(tagName);
    build(builder);
    return builder.finalize();
  }

  readonly #tagName: Reactive<string>;
  readonly #children: ContentProgramNode[] = [];
  readonly #attributes: BuildAttribute[] = [];

  constructor(tagName: Reactive<string>) {
    this.#tagName = tagName;
  }

  append(output: string | ContentProgramNode): this {
    if (typeof output === "string") {
      this.#children.push(TextProgramNode.of(Static(output)));
    } else {
      this.#children.push(output);
    }
    return this;
  }

  attribute(attribute: BuildAttribute): this {
    this.#attributes.push(attribute);
    return this;
  }

  finalize(): ElementProgramNode {
    return ElementProgramNode.create(
      this.#tagName,
      this.#attributes,
      this.#children
    );
  }
}
