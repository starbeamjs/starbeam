import type { minimal } from "@domtree/flavors";
import type { HtmlBuffer } from "../dom/buffer/body";
import type { TreeConstructor } from "../dom/streaming/tree-constructor";
import { Reactive } from "../reactive/core";
import { ReactiveParameter } from "../reactive/parameter";
import { Component, ComponentInvocation } from "./component";
import {
  AbstractContentProgramNode,
  BuildMetadata,
  DYNAMIC_BUILD_METADATA,
  STATIC_BUILD_METADATA,
} from "./interfaces/program-node";
import type {
  RenderedContent,
  RenderedContentMetadata,
} from "./interfaces/rendered-content";
import type { InitialListArtifacts, ListArtifacts } from "./list/diff";

export type ListProgramNode = StaticListProgramNode | DynamicListProgramNode;

export class StaticLoop {
  static create<P extends ReactiveParameter>(
    iterable: Iterable<P>,
    component: Component<P>
  ): StaticLoop {
    let list = [...iterable];
    let isStatic = list.every(ReactiveParameter.isStatic);
    return new StaticLoop([...iterable], component as Component, {
      isStatic,
    });
  }

  readonly #list: readonly ReactiveParameter[];
  readonly #component: Component;

  constructor(
    list: readonly ReactiveParameter[],
    component: Component,
    readonly metadata: BuildMetadata
  ) {
    this.#list = list;
    this.#component = component;
  }

  *[Symbol.iterator](): IterableIterator<ComponentInvocation> {
    for (let item of this.#list) {
      yield ComponentInvocation.invoke(this.#component, item);
    }
  }

  list(): StaticListProgramNode {
    return StaticListProgramNode.of(this);
  }
}

export type Key<P extends ReactiveParameter> = (input: P) => unknown;
export type AnyKey = Key<ReactiveParameter>;

export class KeyedComponentInvocation {
  static invoke<P extends ReactiveParameter>(
    component: Component<P>,
    arg: P,
    key: unknown
  ): KeyedComponentInvocation {
    return new KeyedComponentInvocation(component as Component, arg, key);
  }

  #component: Component;
  #arg: ReactiveParameter;

  private constructor(
    component: Component,
    arg: ReactiveParameter,
    readonly key: unknown
  ) {
    this.#component = component;
    this.#arg = arg;
  }

  render(_cursor: HtmlBuffer): {
    rendered: RenderedContent;
    key: unknown;
  } {
    throw Error("todo: KeyedComponentInvocation");

    // let component = this.#component(this.#arg);
    // let key = this.key;
    // let rendered = RenderedComponent.of(component.render(dom, cursor));
    // return { rendered, key };
  }
}

export class DynamicLoop {
  static create<P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P>,
    key: Key<P>
  ): DynamicLoop {
    return new DynamicLoop(iterable, component as Component, key as AnyKey);
  }

  readonly metadata: BuildMetadata = DYNAMIC_BUILD_METADATA;
  readonly #iterable: Reactive<Iterable<ReactiveParameter>>;
  readonly #component: Component;
  readonly #key: AnyKey;

  constructor(
    iterable: Reactive<Iterable<ReactiveParameter>>,
    component: Component,
    key: AnyKey
  ) {
    this.#iterable = iterable;
    this.#component = component;
    this.#key = key;
  }

  get current(): IterableIterator<KeyedComponentInvocation> {
    return this.#current();
  }

  *#current(): IterableIterator<KeyedComponentInvocation> {
    for (let item of this.#iterable.current) {
      yield KeyedComponentInvocation.invoke(this.#component, item, this.#key);
    }
  }

  list(): DynamicListProgramNode {
    return DynamicListProgramNode.of(this);
  }

  rendered(artifacts: InitialListArtifacts, metadata: RenderedContentMetadata) {
    return RenderedDynamicList.create(
      this,
      artifacts.finalize(this.#iterable.metadata),
      metadata
    );
  }
}

export type Loop = StaticLoop | DynamicLoop;

export const Loop = {
  from: <P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P>,
    key: (input: P) => unknown
  ): Loop => {
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
export class StaticListProgramNode
  implements AbstractContentProgramNode<RenderedStaticList>
{
  static of(loop: StaticLoop) {
    return new StaticListProgramNode([...loop], loop.metadata);
  }

  readonly #components: readonly ComponentInvocation[];
  readonly metadata: BuildMetadata;

  constructor(
    components: readonly ComponentInvocation[],
    metadata: BuildMetadata
  ) {
    this.#components = components;
    this.metadata = metadata;
  }

  render(_buffer: TreeConstructor): RenderedStaticList {
    if (this.#components.length === 0) {
      throw Error("todo: empty static list");
    }

    throw Error("todo: StaticListProgramNode#render");

    // let output: AnyRendered<T>[] = [];

    // let first = this.#components[0].render(dom, cursor);
    // let last = first;
    // let isConstant = first.metadata.isConstant;

    // for (let component of this.#components.slice(1)) {
    //   let rendered = (last = component.render(dom, cursor));
    //   isConstant &&= rendered.metadata.isConstant;
    //   output.push(rendered);
    // }

    // return RenderedStaticList.create(output, {
    //   isConstant,
    //   isStable: {
    //     firstNode: first.metadata.isStable.firstNode,
    //     lastNode: last.metadata.isStable.lastNode,
    //   },
    // });
  }
}

export class RenderedStaticList implements RenderedContent {
  static create(
    artifacts: readonly RenderedContent[],
    metadata: RenderedContentMetadata
  ): RenderedStaticList {
    return new RenderedStaticList(artifacts, metadata);
  }

  readonly metadata: RenderedContentMetadata;
  readonly #artifacts: readonly RenderedContent[];

  constructor(
    artifacts: readonly RenderedContent[],
    metadata: RenderedContentMetadata
  ) {
    this.#artifacts = artifacts;
    this.metadata = metadata;
  }

  poll(inside: minimal.ParentNode): void {
    for (let artifact of this.#artifacts) {
      artifact.poll(inside);
    }
  }
}

export class DynamicListProgramNode
  implements AbstractContentProgramNode<RenderedDynamicList>
{
  static of(loop: DynamicLoop) {
    return new DynamicListProgramNode(loop);
  }

  readonly metadata: BuildMetadata = STATIC_BUILD_METADATA;

  readonly #loop: DynamicLoop;

  constructor(loop: DynamicLoop) {
    this.#loop = loop;
  }

  render(_buffer: TreeConstructor): RenderedDynamicList {
    throw Error("todo: DynamicProgramListNode#render");

    // let components = this.#loop.current;

    // let firstComponent = components.next();

    // if (firstComponent.done) {
    //   throw Error("todo: empty static list");
    // }

    // let { key, rendered } = firstComponent.value.render(dom, cursor);

    // let first = rendered;
    // let last = rendered;
    // let artifacts = InitialListArtifacts.initialize<T>(key, rendered);

    // let isConstant = rendered.metadata.isConstant;

    // for (let component of components) {
    //   let { key, rendered } = component.render(dom, cursor);
    //   artifacts.add(key, rendered);

    //   isConstant &&= rendered.metadata.isConstant;
    //   last = rendered;
    // }

    // return this.#loop.rendered(artifacts, {
    //   isConstant,
    //   isStable: {
    //     firstNode: first.metadata.isStable.firstNode,
    //     lastNode: last.metadata.isStable.lastNode,
    //   },
    // });
  }
}

export class RenderedDynamicList implements RenderedContent {
  static create(
    loop: DynamicLoop,
    artifacts: ListArtifacts,
    metadata: RenderedContentMetadata
  ): RenderedDynamicList {
    return new RenderedDynamicList(loop, artifacts, metadata);
  }

  readonly #loop: DynamicLoop;
  readonly #artifacts: ListArtifacts;

  constructor(
    loop: DynamicLoop,
    artifacts: ListArtifacts,
    readonly metadata: RenderedContentMetadata
  ) {
    this.#loop = loop;
    this.#artifacts = artifacts;
  }

  poll(inside: minimal.ParentNode): void {
    this.#artifacts.poll(this.#loop, inside);
  }
}
