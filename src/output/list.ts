import type { ChildNodeCursor } from "../dom/cursor";
import type { DomImplementation } from "../dom/implementation";
import type { DomTypes } from "../dom/types";
import type { Reactive } from "../reactive/core";
import { ReactiveParameter } from "../reactive/parameter";
import type { Component } from "./component";
import type { BuildMetadata, Output, Rendered, RenderMetadata } from "./output";

export type ReactiveListNode<T extends DomTypes, P extends ReactiveParameter> =
  | StaticListNode<T, P>
  | DynamicListNode<T, P>;

export const ReactiveListNode = {
  create<T extends DomTypes, P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P, T>,
    key: (arg: P) => unknown
  ) {
    if (ReactiveParameter.isStatic(iterable)) {
      return StaticListNode.create(iterable.current, component, key);
    } else {
      return DynamicListNode.create(iterable, component);
    }
  },
};

/**
 * The input for a `StaticListOutput` is a static iterable. It is static if all
 * of the elements of the iterable are also static.
 */
export class StaticListNode<T extends DomTypes, P extends ReactiveParameter>
  implements Output<T>
{
  static create<T extends DomTypes, P extends ReactiveParameter>(
    iterable: Iterable<P>,
    component: Component<P, T>,
    key: (arg: P) => unknown
  ) {
    let list = [...iterable];
    let isStatic = list.every(ReactiveParameter.isStatic);

    return new StaticListNode(list, key, component, { isStatic });
  }

  declare readonly NODE: T["fragment"];

  readonly #list: readonly P[];
  readonly #key: (arg: P) => unknown;
  readonly #component: Component<P, T>;
  readonly metadata: BuildMetadata;

  constructor(
    list: readonly P[],
    key: (arg: P) => unknown,
    component: Component<P, T>,
    metadata: BuildMetadata
  ) {
    this.#list = list;
    this.#key = key;
    this.#component = component;
    this.metadata = metadata;
  }

  render(dom: DomImplementation<T>, cursor: ChildNodeCursor<T>): Rendered<T> {
    if (this.#list.length === 0) {
      throw Error("todo: empty static list");
    }

    let { key, rendered: first } = this.#renderItem(this.#list[0], dom, cursor);
    let last = first;
    let map: Map<unknown, Rendered<T>> = new Map([[key, first]]);

    let isConstant = first.metadata.isConstant;

    for (let item of this.#list.slice(1)) {
      let { key, rendered } = this.#renderItem(item, dom, cursor);
      map.set(key, rendered);

      isConstant &&= rendered.metadata.isConstant;
      last = rendered;

      map.set(key, rendered);
    }

    return RenderedStaticList.create(map, {
      isConstant,
      isStable: {
        firstNode: first.metadata.isStable.firstNode,
        lastNode: last.metadata.isStable.lastNode,
      },
    });
  }

  #renderItem(
    item: P,
    dom: DomImplementation<T>,
    cursor: ChildNodeCursor<T>
  ): { rendered: Rendered<T>; key: unknown } {
    let key = this.#key(item);
    let rendered = this.#component(item).render(dom, cursor);
    return { rendered, key };
  }
}

export class RenderedStaticList<T extends DomTypes> implements Rendered<T> {
  static create<T extends DomTypes>(
    map: Map<unknown, Rendered<T>>,
    metadata: RenderMetadata
  ): RenderedStaticList<T> {
    return new RenderedStaticList(map, metadata);
  }

  declare readonly NODE: T["fragment"];

  readonly metadata: RenderMetadata;
  readonly #map: Map<unknown, Rendered<T>>;

  constructor(map: Map<unknown, Rendered<T>>, metadata: RenderMetadata) {
    this.#map = map;
    this.metadata = metadata;
  }

  poll(dom: DomImplementation<T>): void {
    for (let item of this.#map.values()) {
      item.poll(dom);
    }
  }

  move(dom: DomImplementation<T>, cursor: ChildNodeCursor<T>): void {
    throw new Error("Method not implemented.");
  }
}

export class DynamicListNode<T extends DomTypes, P extends ReactiveParameter>
  implements Output<T>
{
  static create<T extends DomTypes, P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P, T>
  ) {
    return new DynamicListNode(iterable, component);
  }

  readonly #iterable: Reactive<Iterable<P>>;
  readonly #component: Component<P, T>;
  readonly metadata: BuildMetadata = {
    isStatic: false,
  };

  declare readonly NODE: T["fragment"];

  constructor(iterable: Reactive<Iterable<P>>, component: Component<P, T>) {
    this.#iterable = iterable;
    this.#component = component;
  }

  render(dom: DomImplementation<T>, cursor: ChildNodeCursor<T>): Rendered<T> {
    throw new Error("Method not implemented.");
  }
}
