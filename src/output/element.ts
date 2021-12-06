import { DomImplementation, DomTypes } from "../dom/implementation";
import { ChildNodeCursor } from "../index";
import { Reactive } from "../reactive/core";
import {
  AnyOutput,
  AnyRendered,
  BuildMetadata,
  Output,
  Rendered,
  RenderMetadata,
} from "./output";

export class ReactiveElementNode<T extends DomTypes>
  implements Output<T, T["text"]>
{
  static create<T extends DomTypes>(
    tagName: Reactive<string>,
    children: readonly AnyOutput<T>[]
  ): ReactiveElementNode<T> {
    let metadata = {
      isStatic: Reactive.isStatic(tagName) && children.every(Output.isStatic),
    };

    return new ReactiveElementNode(tagName, children, metadata);
  }

  readonly #tagName: Reactive<string>;
  readonly #children: readonly AnyOutput<T>[];

  private constructor(
    tagName: Reactive<string>,
    children: readonly AnyOutput<T>[],
    readonly metadata: BuildMetadata
  ) {
    this.#tagName = tagName;
    this.#children = children;
  }

  render(
    dom: DomImplementation<T>,
    cursor: ChildNodeCursor<T>
  ): RenderedElementNode<T> {
    let element = dom.createElement(this.#tagName.current);
    let childNodeCursor = dom.createAppendingCursor(element, null);

    let children = this.#children.map((output) => {
      let rendered = output.render(dom, childNodeCursor);
      dom.insertChild(rendered.node, element, null);
      return rendered;
    });

    cursor.insert(element);
    return RenderedElementNode.create(element, this.#tagName, children);
  }
}

export class RenderedElementNode<T extends DomTypes>
  implements Rendered<T, T["element"]>
{
  static create<T extends DomTypes>(
    node: T["element"],
    tagName: Reactive<string>,
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

    return new RenderedElementNode(node, tagName, children, metadata);
  }

  readonly #node: T["element"];
  readonly #tagName: Reactive<string>;
  readonly #children: readonly AnyRendered<T>[];

  private constructor(
    node: T["element"],
    tagName: Reactive<string>,
    children: readonly AnyRendered<T>[],
    readonly metadata: RenderMetadata
  ) {
    this.#node = node;
    this.#tagName = tagName;
    this.#children = children;
  }

  get node(): T["element"] {
    return this.#node;
  }

  poll(dom: DomImplementation<T>): void {
    if (Reactive.isDynamic(this.#tagName)) {
      throw new Error("Dynamic tag name");
    }

    for (let child of this.#children) {
      child.poll(dom);
    }
  }
}

// https://html.spec.whatwg.org/multipage/parsing.html#insert-a-foreign-element
enum Prefix {
  Xlink,
  Xml,
  XmlNs,
}

interface ReactiveAttribute {
  name: string;
  prefix?: Prefix;
  value: Reactive<string | null>;
}

export class ReactiveElementBuilder<T extends DomTypes> {
  static build<T extends DomTypes>(
    tagName: Reactive<string>,
    build: (builder: ReactiveElementBuilder<T>) => void
  ): ReactiveElementNode<T> {
    let builder = new ReactiveElementBuilder<T>(tagName);
    build(builder);
    return builder.finalize();
  }

  readonly #tagName: Reactive<string>;
  readonly #children: AnyOutput<T>[] = [];
  readonly #attributes: ReactiveAttribute[] = [];

  constructor(tagName: Reactive<string>) {
    this.#tagName = tagName;
  }

  append(output: AnyOutput<T>): this {
    this.#children.push(output);
    return this;
  }

  attribute(attribute: ReactiveAttribute): this {
    this.#attributes.push(attribute);
    return this;
  }

  finalize(): ReactiveElementNode<T> {
    return ReactiveElementNode.create(this.#tagName, this.#children);
  }
}

export function ELEMENT<T extends DomTypes>(): ReactiveElementNode<T> {
  throw Error("unimplemented");
}
