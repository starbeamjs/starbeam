import { DYNAMIC_BUILD_METADATA, STATIC_BUILD_METADATA } from ".";
import type { UpdatingContentCursor } from "../dom/cursor/updating";
import type { DomImplementation } from "../dom/implementation";
import type { AnyNode, DomTypes } from "../dom/types";
import { Reactive } from "../reactive/core";
import { ReactiveParameter } from "../reactive/parameter";
import {
  AnyComponent,
  AnyComponentInvocation,
  AnyRenderedComponent,
  Component,
  ComponentInvocation,
  RenderedComponent,
} from "./component";
import { InitialListArtifacts, ListArtifacts } from "./list/diff";
import type {
  AnyRendered,
  BuildMetadata,
  AbstractProgramNode,
  Rendered,
  RenderMetadata,
} from "./program-node";

export type ReactiveListNode<T extends DomTypes> =
  | StaticListNode<T>
  | DynamicListNode<T>;

export class StaticLoop<T extends DomTypes> {
  static create<T extends DomTypes, P extends ReactiveParameter>(
    iterable: Iterable<P>,
    component: Component<P, T, AnyNode<T>>
  ): StaticLoop<T> {
    let list = [...iterable];
    let isStatic = list.every(ReactiveParameter.isStatic);
    return new StaticLoop([...iterable], component as AnyComponent<T>, {
      isStatic,
    });
  }

  readonly #list: readonly ReactiveParameter[];
  readonly #component: AnyComponent<T>;

  constructor(
    list: readonly ReactiveParameter[],
    component: AnyComponent<T>,
    readonly metadata: BuildMetadata
  ) {
    this.#list = list;
    this.#component = component;
  }

  *[Symbol.iterator](): IterableIterator<AnyComponentInvocation<T>> {
    for (let item of this.#list) {
      yield ComponentInvocation.invoke(this.#component, item);
    }
  }

  list(): StaticListNode<T> {
    return StaticListNode.of(this);
  }
}

export type Key<P extends ReactiveParameter> = (input: P) => unknown;
export type AnyKey = Key<ReactiveParameter>;

export class KeyedComponentInvocation<T extends DomTypes> {
  static invoke<T extends DomTypes, P extends ReactiveParameter>(
    component: Component<P, T, AnyNode<T>>,
    arg: P,
    key: unknown
  ): KeyedComponentInvocation<T> {
    return new KeyedComponentInvocation(component as AnyComponent<T>, arg, key);
  }

  #component: AnyComponent<T>;
  #arg: ReactiveParameter;

  constructor(
    component: AnyComponent<T>,
    arg: ReactiveParameter,
    readonly key: unknown
  ) {
    this.#component = component;
    this.#arg = arg;
  }

  render(
    dom: DomImplementation<T>,
    cursor: UpdatingContentCursor<T>
  ): { rendered: AnyRenderedComponent<T>; key: unknown } {
    let component = this.#component(this.#arg);
    let key = this.key;

    let rendered = RenderedComponent.of(component.render(dom, cursor));
    return { rendered, key };
  }
}

export class DynamicLoop<T extends DomTypes> {
  static create<T extends DomTypes, P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P, T, AnyNode<T>>,
    key: Key<P>
  ): DynamicLoop<T> {
    return new DynamicLoop(
      iterable,
      component as AnyComponent<T>,
      key as AnyKey
    );
  }

  readonly metadata: BuildMetadata = DYNAMIC_BUILD_METADATA;
  readonly #iterable: Reactive<Iterable<ReactiveParameter>>;
  readonly #component: AnyComponent<T>;
  readonly #key: AnyKey;

  constructor(
    iterable: Reactive<Iterable<ReactiveParameter>>,
    component: AnyComponent<T>,
    key: AnyKey
  ) {
    this.#iterable = iterable;
    this.#component = component;
    this.#key = key;
  }

  get current(): IterableIterator<KeyedComponentInvocation<T>> {
    return this.#current();
  }

  *#current(): IterableIterator<KeyedComponentInvocation<T>> {
    for (let item of this.#iterable.current) {
      yield KeyedComponentInvocation.invoke(this.#component, item, this.#key);
    }
  }

  list(): DynamicListNode<T> {
    return DynamicListNode.of(this);
  }

  rendered(artifacts: InitialListArtifacts<T>, metadata: RenderMetadata) {
    return RenderedDynamicList.create(
      this,
      artifacts.finalize(this.#iterable.metadata),
      metadata
    );
  }
}

export type Loop<T extends DomTypes> = StaticLoop<T> | DynamicLoop<T>;

export const Loop = {
  from: <T extends DomTypes, P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P, T, AnyNode<T>>,
    key: (input: P) => unknown
  ): Loop<T> => {
    if (Reactive.isStatic(iterable)) {
      return StaticLoop.create(iterable.current, component);
    } else {
      return DynamicLoop.create(iterable, component, key);
    }
  },
} as const;

/**
 * The input for a `StaticListOutput` is a static iterable. It is static if all
 * of the elements of the iterable are also static.
 */
export class StaticListNode<T extends DomTypes>
  implements AbstractProgramNode<T, T["fragment"]>
{
  static of<T extends DomTypes>(loop: StaticLoop<T>) {
    return new StaticListNode([...loop], loop.metadata);
  }

  declare readonly NODE: T["fragment"];

  readonly #components: readonly AnyComponentInvocation<T>[];
  readonly metadata: BuildMetadata;

  constructor(
    components: readonly AnyComponentInvocation<T>[],
    metadata: BuildMetadata
  ) {
    this.#components = components;
    this.metadata = metadata;
  }

  render(
    dom: DomImplementation<T>,
    cursor: UpdatingContentCursor<T>
  ): Rendered<T, T["fragment"]> {
    if (this.#components.length === 0) {
      throw Error("todo: empty static list");
    }

    let output: AnyRendered<T>[] = [];

    let first = this.#components[0].render(dom, cursor);
    let last = first;
    let isConstant = first.metadata.isConstant;

    for (let component of this.#components.slice(1)) {
      let rendered = (last = component.render(dom, cursor));
      isConstant &&= rendered.metadata.isConstant;
      output.push(rendered);
    }

    return RenderedStaticList.create(output, {
      isConstant,
      isStable: {
        firstNode: first.metadata.isStable.firstNode,
        lastNode: last.metadata.isStable.lastNode,
      },
    });
  }
}

export class RenderedStaticList<T extends DomTypes> implements AnyRendered<T> {
  static create<T extends DomTypes>(
    artifacts: readonly AnyRendered<T>[],
    metadata: RenderMetadata
  ): RenderedStaticList<T> {
    return new RenderedStaticList(artifacts, metadata);
  }

  declare readonly NODE: T["fragment"];

  readonly metadata: RenderMetadata;
  readonly #artifacts: readonly AnyRendered<T>[];

  constructor(artifacts: readonly AnyRendered<T>[], metadata: RenderMetadata) {
    this.#artifacts = artifacts;
    this.metadata = metadata;
  }

  poll(dom: DomImplementation<T>): void {
    for (let artifact of this.#artifacts) {
      artifact.poll(dom);
    }
  }

  move(_dom: DomImplementation<T>, _cursor: UpdatingContentCursor<T>): void {
    throw new Error("Method not implemented.");
  }
}

export class DynamicListNode<T extends DomTypes>
  implements AbstractProgramNode<T, T["fragment"]>
{
  static of<T extends DomTypes>(loop: DynamicLoop<T>) {
    return new DynamicListNode(loop);
  }

  declare readonly NODE: T["fragment"];
  readonly metadata: BuildMetadata = STATIC_BUILD_METADATA;

  readonly #loop: DynamicLoop<T>;

  constructor(loop: DynamicLoop<T>) {
    this.#loop = loop;
  }

  render(
    dom: DomImplementation<T>,
    cursor: UpdatingContentCursor<T>
  ): RenderedDynamicList<T> {
    let components = this.#loop.current;

    let firstComponent = components.next();

    if (firstComponent.done) {
      throw Error("todo: empty static list");
    }

    let { key, rendered } = firstComponent.value.render(dom, cursor);

    let first = rendered;
    let last = rendered;
    let artifacts = InitialListArtifacts.initialize<T>(key, rendered);

    let isConstant = rendered.metadata.isConstant;

    for (let component of components) {
      let { key, rendered } = component.render(dom, cursor);
      artifacts.add(key, rendered);

      isConstant &&= rendered.metadata.isConstant;
      last = rendered;
    }

    return this.#loop.rendered(artifacts, {
      isConstant,
      isStable: {
        firstNode: first.metadata.isStable.firstNode,
        lastNode: last.metadata.isStable.lastNode,
      },
    });
  }
}

export class RenderedDynamicList<T extends DomTypes>
  implements Rendered<T, T["fragment"]>
{
  static create<T extends DomTypes>(
    loop: DynamicLoop<T>,
    artifacts: ListArtifacts<T>,
    metadata: RenderMetadata
  ): RenderedDynamicList<T> {
    return new RenderedDynamicList(loop, artifacts, metadata);
  }

  declare readonly NODE: T["fragment"];

  readonly #loop: DynamicLoop<T>;
  readonly #artifacts: ListArtifacts<T>;

  constructor(
    loop: DynamicLoop<T>,
    artifacts: ListArtifacts<T>,
    readonly metadata: RenderMetadata
  ) {
    this.#loop = loop;
    this.#artifacts = artifacts;
  }

  poll(dom: DomImplementation<T>): void {
    let components = [...this.#loop.current];
    let keys = components.map((c) => c.key);
    this.#artifacts.poll(dom, keys);
  }

  move(dom: DomImplementation<T>, cursor: UpdatingContentCursor<T>): void {
    throw new Error("Method not implemented.");
  }
}
