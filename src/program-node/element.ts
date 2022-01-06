import type * as minimal from "@domtree/minimal";
import type { ElementBody } from "../dom/buffer/body";
import { Dehydrated, LazyDOM } from "../dom/streaming/token";
import {
  ElementBodyConstructor,
  ElementHeadConstructor,
  TreeConstructor,
} from "../dom/streaming/tree-constructor";
import { Reactive } from "../reactive/core";
import { AttributeProgramNode, RenderedAttribute } from "./attribute";
import {
  AbstractContentProgramNode,
  BuildMetadata,
  ContentProgramNode,
  ProgramNode,
} from "./interfaces/program-node";
import {
  RenderedContent,
  RenderedContentMetadata,
} from "./interfaces/rendered-content";

export class ElementProgramNode
  implements AbstractContentProgramNode<RenderedElementNode>
{
  static create(
    tagName: Reactive<string>,
    buildAttributes: readonly BuildAttribute[],
    content: readonly ContentProgramNode[]
  ): ElementProgramNode {
    let attributes = buildAttributes.map(AttributeProgramNode.create);

    let metadata = {
      isStatic:
        Reactive.isStatic(tagName) &&
        content.every(ProgramNode.isStatic) &&
        attributes.every((a) => a.metadata.isStatic),
    };

    return new ElementProgramNode(tagName, attributes, content, metadata);
  }

  readonly #tagName: Reactive<string>;
  readonly #attributes: readonly AttributeProgramNode[];
  readonly #children: readonly ContentProgramNode[];

  private constructor(
    tagName: Reactive<string>,
    attributes: readonly AttributeProgramNode[],
    children: readonly ContentProgramNode[],
    readonly metadata: BuildMetadata
  ) {
    this.#tagName = tagName;
    this.#attributes = attributes;
    this.#children = children;
  }

  render(buffer: TreeConstructor): RenderedElementNode {
    return buffer.element(
      this.#tagName.current,
      (head) =>
        DehydratedElementBuilder.create(this.#tagName, head)
          .attrs(this.#attributes)
          .body(this.#children),
      (token, builder) => builder.finalize(token)
    );
  }
}

class DehydratedElementBuilder {
  static create(
    tag: Reactive<string>,
    head: ElementHeadConstructor
  ): DehydratedElementBuilder {
    return new DehydratedElementBuilder(tag, head, [], []);
  }

  readonly #tag: Reactive<string>;
  readonly #head: ElementHeadConstructor;
  readonly #attributes: RenderedAttribute[];
  readonly #content: RenderedContent[];

  private constructor(
    tag: Reactive<string>,
    head: ElementHeadConstructor,
    attributes: RenderedAttribute[],
    content: RenderedContent[]
  ) {
    this.#tag = tag;
    this.#head = head;
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

  body(children: readonly ContentProgramNode[]): this {
    let body = this.#head.body();

    for (let content of children) {
      let child = content.render(body);

      if (child) {
        this.#content.push(child);
      }
    }

    ElementBodyConstructor.flush(body);

    return this;
  }

  finalize(token: Dehydrated<minimal.Element>): RenderedElementNode {
    return RenderedElementNode.create(
      LazyDOM.create(token),
      this.#tag,
      this.#attributes,
      this.#content
    );
  }
}

export class RenderedElementNode implements RenderedContent {
  static create(
    node: LazyDOM<minimal.Element>,
    tagName: Reactive<string>,
    attributes: readonly RenderedAttribute[],
    children: readonly RenderedContent[]
  ): RenderedElementNode {
    let metadata = {
      isConstant:
        Reactive.isStatic(tagName) &&
        children.every(RenderedContent.isConstant),
      isStable: {
        firstNode: true,
        lastNode: true,
      },
    };

    return new RenderedElementNode(
      node,
      tagName,
      attributes,
      children,
      metadata
    );
  }

  readonly #element: LazyDOM<minimal.Element>;
  readonly #tagName: Reactive<string>;
  readonly #attributes: readonly RenderedAttribute[];
  readonly #children: readonly RenderedContent[];

  private constructor(
    node: LazyDOM<minimal.Element>,
    tagName: Reactive<string>,
    attributes: readonly RenderedAttribute[],
    children: readonly RenderedContent[],
    readonly metadata: RenderedContentMetadata
  ) {
    this.#element = node;
    this.#tagName = tagName;
    this.#attributes = attributes;
    this.#children = children;
  }

  poll(inside: minimal.Element): void {
    if (Reactive.isDynamic(this.#tagName)) {
      throw new Error("Dynamic tag name");
    }

    let element = this.#element.get(inside);

    for (let attr of this.#attributes) {
      attr.poll(element);
    }

    for (let child of this.#children) {
      child.poll(element);
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

  append(output: ContentProgramNode): this {
    this.#children.push(output);
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
