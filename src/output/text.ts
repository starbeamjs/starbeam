import type { DomImplementation } from "../dom/implementation";
import type { DomTypes } from "../dom/types";
import type { ChildNodeCursor } from "../index";
import type { Reactive } from "../reactive/core";
import type { BuildMetadata, Output, Rendered, RenderMetadata } from "./output";

export class ReactiveDataNode<T extends DomTypes> implements Output<T> {
  static text<T extends DomTypes>(
    reactive: Reactive<string>
  ): ReactiveDataNode<T> {
    return new ReactiveTextNode(reactive);
  }

  static comment<T extends DomTypes>(
    reactive: Reactive<string>
  ): ReactiveDataNode<T> {
    return new ReactiveCommentNode(reactive);
  }

  declare readonly NODE: T["text" | "comment"];

  readonly #reactive: Reactive<string>;
  readonly #node: DataNode;

  constructor(reactive: Reactive<string>, node: DataNode) {
    this.#reactive = reactive;
    this.#node = node;
  }

  get metadata(): BuildMetadata {
    return {
      isStatic: this.#reactive.metadata.isStatic,
    };
  }

  render(
    dom: DomImplementation<T>,
    cursor: ChildNodeCursor<T>
  ): RenderedDataNode<T> {
    let data = this.#node.create(dom, this.#reactive.current);
    cursor.insert(data);
    return new RenderedDataNode(this.#reactive, data, this.#node.update);
  }
}

export class ReactiveTextNode<T extends DomTypes> extends ReactiveDataNode<T> {
  static readonly #node: DataNode = {
    create: (dom, data) => dom.createTextNode(data),
    update: (dom, node, data) => dom.updateTextNode(node, data),
  };

  declare readonly NODE: T["text"];

  constructor(reactive: Reactive<string>) {
    super(reactive, ReactiveTextNode.#node);
  }
}

export class ReactiveCommentNode<
  T extends DomTypes
> extends ReactiveDataNode<T> {
  static readonly #node: DataNode = {
    create: (dom, data) => dom.createTextNode(data),
    update: (dom, node, data) => dom.updateTextNode(node, data),
  };

  declare readonly NODE: T["comment"];

  constructor(reactive: Reactive<string>) {
    super(reactive, ReactiveCommentNode.#node);
  }
}

type CreateNode<N extends "text" | "comment"> = <T extends DomTypes>(
  dom: DomImplementation<T>,
  data: string
) => T[N];
type UpdateNode<N extends "text" | "comment"> = <T extends DomTypes>(
  dom: DomImplementation<T>,
  node: T[N],
  data: string
) => T[N];

interface DataNode {
  create: CreateNode<"text" | "comment">;
  update: UpdateNode<"text" | "comment">;
}

export class RenderedDataNode<T extends DomTypes> implements Rendered<T> {
  readonly #reactive: Reactive<string>;
  readonly #node: T["text" | "comment"];
  readonly #update: UpdateNode<"text" | "comment">;

  readonly NODE!: T["text" | "comment"];

  constructor(
    reactive: Reactive<string>,
    node: T["text" | "comment"],
    update: UpdateNode<"text" | "comment">
  ) {
    this.#reactive = reactive;
    this.#node = node;
    this.#update = update;
  }

  get metadata(): RenderMetadata {
    return {
      isConstant: this.#reactive.metadata.isStatic,
      isStable: {
        firstNode: true,
        lastNode: true,
      },
    };
  }

  get node(): T["text" | "comment"] {
    return this.#node;
  }

  poll(dom: DomImplementation<T>): void {
    this.#update(dom, this.#node, this.#reactive.current);
  }

  move(_dom: DomImplementation<T>, _cursor: ChildNodeCursor<T>): void {
    throw new Error("Method not implemented.");
  }
}
