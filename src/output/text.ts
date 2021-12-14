import type { DomImplementation, DomTypes } from "../dom/implementation";
import type { ChildNodeCursor } from "../index";
import type { Reactive } from "../reactive/core";
import type { BuildMetadata, Output, Rendered, RenderMetadata } from "./output";

export class ReactiveDataNode<T extends DomTypes, N extends "text" | "comment">
  implements Output<T, T[N]>
{
  static text<T extends DomTypes>(
    reactive: Reactive<string>
  ): ReactiveDataNode<T, "text"> {
    return new ReactiveTextNode(reactive);
  }

  static comment<T extends DomTypes>(
    reactive: Reactive<string>
  ): ReactiveDataNode<T, "comment"> {
    return new ReactiveCommentNode(reactive);
  }

  readonly #reactive: Reactive<string>;
  readonly #node: DataNode<N>;

  constructor(reactive: Reactive<string>, node: DataNode<N>) {
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
  ): RenderedDataNode<T, N> {
    let data = this.#node.create(dom, this.#reactive.current);
    cursor.insert(data);
    return new RenderedDataNode(this.#reactive, data, this.#node.update);
  }
}

export class ReactiveTextNode<T extends DomTypes> extends ReactiveDataNode<
  T,
  "text"
> {
  static readonly #node: DataNode<"text"> = {
    create: (dom, data) => dom.createTextNode(data),
    update: (dom, node, data) => dom.updateTextNode(node, data),
  };

  constructor(reactive: Reactive<string>) {
    super(reactive, ReactiveTextNode.#node);
  }
}

export class ReactiveCommentNode<T extends DomTypes> extends ReactiveDataNode<
  T,
  "comment"
> {
  static readonly #node: DataNode<"comment"> = {
    create: (dom, data) => dom.createTextNode(data),
    update: (dom, node, data) => dom.updateTextNode(node, data),
  };

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

interface DataNode<N extends "text" | "comment"> {
  create: CreateNode<N>;
  update: UpdateNode<N>;
}

export class RenderedDataNode<T extends DomTypes, N extends "text" | "comment">
  implements Rendered<T, T[N]>
{
  readonly #reactive: Reactive<string>;
  readonly #node: T[N];
  readonly #update: UpdateNode<N>;

  constructor(reactive: Reactive<string>, node: T[N], update: UpdateNode<N>) {
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

  get node(): T[N] {
    return this.#node;
  }

  poll(dom: DomImplementation<T>): void {
    this.#update(dom, this.#node, this.#reactive.current);
  }
}
