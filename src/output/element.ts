import type { UpdatingContentCursor } from "../dom/cursor/updating";
import type { DomImplementation } from "../dom/implementation";
import type { AnyAttributeName } from "../dom/tree-construction";
import type { DomTypes } from "../dom/types";
import { Reactive } from "../reactive/core";
import { AttributeProgramNode, RenderedAttributeNode } from "./attribute";
import {
  AbstractProgramNode,
  BuildMetadata,
  ProgramNode,
  Rendered,
  RenderMetadata,
} from "./program-node";
import type * as minimal from "@domtree/minimal";

export class ElementProgramNode
  implements AbstractProgramNode<minimal.Element>
{
  static create<T extends DomTypes>(
    tagName: Reactive<string>,
    buildAttributes: readonly BuildAttribute[],
    children: readonly ProgramNode[]
  ): ElementProgramNode {
    let attributes = buildAttributes.map((a) =>
      AttributeProgramNode.create<T>(a)
    );

    let metadata = {
      isStatic:
        Reactive.isStatic(tagName) &&
        children.every(ProgramNode.isStatic) &&
        attributes.every((a) => a.metadata.isStatic),
    };

    return new ElementProgramNode(tagName, attributes, children, metadata);
  }

  readonly #tagName: Reactive<string>;
  readonly #attributes: readonly AttributeProgramNode<T>[];
  readonly #children: readonly ProgramNode[];

  private constructor(
    tagName: Reactive<string>,
    attributes: readonly AttributeProgramNode<T>[],
    children: readonly ProgramNode[],
    readonly metadata: BuildMetadata
  ) {
    this.#tagName = tagName;
    this.#attributes = attributes;
    this.#children = children;
  }

  render(
    dom: DomImplementation<T>,
    cursor: UpdatingContentCursor<T>
  ): RenderedElementNode<T> {
    let element = dom.createElement(this.#tagName.current);
    let childNodeCursor = dom.createAppendingCursor(element, null);
    let attributeCursor = dom.createAttributeCursor(element);

    let attributes = this.#attributes.map((attr) =>
      attr.render(dom, attributeCursor)
    );

    let children = this.#children.map((output) =>
      output.render(dom, childNodeCursor)
    );

    cursor.insert(element);
    return RenderedElementNode.create(
      element,
      this.#tagName,
      attributes,
      children
    );
  }
}

export class RenderedElementNode<T extends DomTypes>
  implements Rendered<T, T["element"]>
{
  static create<T extends DomTypes>(
    node: T["element"],
    tagName: Reactive<string>,
    attributes: readonly RenderedAttributeNode<T>[],
    children: readonly AnyRendered<T>[]
  ): RenderedElementNode<T> {
    let metadata = {
      isConstant:
        Reactive.isStatic(tagName) && children.every(Rendered.isConstant),
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

  readonly NODE!: T["element"];

  readonly #node: T["element"];
  readonly #tagName: Reactive<string>;
  readonly #attributes: readonly RenderedAttributeNode<T>[];
  readonly #children: readonly AnyRendered<T>[];

  private constructor(
    node: T["element"],
    tagName: Reactive<string>,
    attributes: readonly RenderedAttributeNode<T>[],
    children: readonly AnyRendered<T>[],
    readonly metadata: RenderMetadata
  ) {
    this.#node = node;
    this.#tagName = tagName;
    this.#attributes = attributes;
    this.#children = children;
  }

  get cursor(): UpdatingContentCursor<T> {}

  move(_dom: DomImplementation<T>, _cursor: UpdatingContentCursor<T>): void {
    throw new Error("Method not implemented.");
  }

  get node(): T["element"] {
    return this.#node;
  }

  poll(dom: DomImplementation<T>): void {
    if (Reactive.isDynamic(this.#tagName)) {
      throw new Error("Dynamic tag name");
    }

    for (let attr of this.#attributes) {
      attr.poll(dom);
    }

    for (let child of this.#children) {
      child.poll(dom);
    }
  }
}

// TODO: extract AttributeName
export interface BuildAttribute {
  name: AnyAttributeName;
  value: Reactive<string | null>;
}

export type ReactiveElementBuilderCallback<T extends DomTypes> = (
  builder: ElementProgramNodeBuilder<T>
) => void;

export class ElementProgramNodeBuilder<T extends DomTypes> {
  static build<T extends DomTypes>(
    tagName: Reactive<string>,
    build: (builder: ElementProgramNodeBuilder<T>) => void
  ): ElementProgramNode<T> {
    let builder = new ElementProgramNodeBuilder<T>(tagName);
    build(builder);
    return builder.finalize();
  }

  readonly #tagName: Reactive<string>;
  readonly #children: AnyOutput<T>[] = [];
  readonly #attributes: BuildAttribute[] = [];

  constructor(tagName: Reactive<string>) {
    this.#tagName = tagName;
  }

  append(output: AnyOutput<T>): this {
    this.#children.push(output);
    return this;
  }

  attribute(attribute: BuildAttribute): this {
    this.#attributes.push(attribute);
    return this;
  }

  finalize(): ElementProgramNode<T> {
    return ElementProgramNode.create(
      this.#tagName,
      this.#attributes,
      this.#children
    );
  }
}

export function ELEMENT<T extends DomTypes>(): ElementProgramNode<T> {
  throw Error("unimplemented");
}
