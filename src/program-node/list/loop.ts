import type { minimal } from "@domtree/flavors";
import type { ContentRange } from "../../dom/streaming/compatible-dom";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../../dom/streaming/cursor";
import type { LazyDOM } from "../../dom/streaming/token";
import type {
  ContentConstructor,
  TreeConstructor,
} from "../../dom/streaming/tree-constructor";
import { Reactive } from "../../reactive/core";
import { ReactiveParameter } from "../../reactive/parameter";
import { NonemptyList } from "../../utils";
import { OrderedIndex } from "../../utils/index-map";
import type { Component } from "../component";
import {
  AbstractContentProgramNode,
  BuildMetadata,
  ContentProgramNode,
  DYNAMIC_BUILD_METADATA,
  ProgramNode,
  STATIC_BUILD_METADATA,
} from "../interfaces/program-node";
import {
  RenderedContent,
  type RenderedContentMetadata,
} from "../interfaces/rendered-content";
import { ListArtifacts } from "./diff";
import { KeyedContent, RenderSnapshot } from "./snapshot";

export type ListProgramNode = StaticListProgramNode | DynamicListProgramNode;

export class StaticLoop {
  static create<P extends ReactiveParameter>(
    iterable: Iterable<P>,
    component: Component<P>,
    key: Key<P>
  ): StaticLoop {
    let list = [...iterable];
    let isStatic = list.every(ReactiveParameter.isStatic);
    return new StaticLoop(
      [...iterable],
      key as Key<ReactiveParameter>,
      component as Component,
      {
        isStatic,
      }
    );
  }

  readonly #list: readonly ReactiveParameter[];
  readonly #key: Key<ReactiveParameter>;
  readonly #component: Component;

  private constructor(
    list: readonly ReactiveParameter[],
    key: Key<ReactiveParameter>,
    component: Component,
    readonly metadata: BuildMetadata
  ) {
    this.#list = list;
    this.#key = key;
    this.#component = component;
  }

  *[Symbol.iterator](): IterableIterator<KeyedProgramNode> {
    for (let item of this.#list) {
      yield KeyedProgramNode.component(this.#component, item, this.#key);
    }
  }

  list(): StaticListProgramNode {
    return StaticListProgramNode.of(this);
  }
}

export type Key<P extends ReactiveParameter> = (input: P) => unknown;
export type AnyKey = Key<ReactiveParameter>;

export class KeyedProgramNode
  implements AbstractContentProgramNode<RenderedContent>
{
  static component<P extends ReactiveParameter>(
    component: Component<P>,
    arg: P,
    key: unknown
  ): KeyedProgramNode {
    let node = component(arg);
    return new KeyedProgramNode(node, key, {
      isStatic: ProgramNode.isStatic(node),
    });
  }

  static render(
    node: KeyedProgramNode,
    buffer: ContentConstructor
  ): KeyedContent {
    let content = node.render(buffer);
    return KeyedContent.create(node.key, content);
  }

  readonly #node: ContentProgramNode;

  private constructor(
    node: ContentProgramNode,
    readonly key: unknown,
    readonly metadata: BuildMetadata
  ) {
    this.#node = node;
  }

  render(buffer: ContentConstructor): RenderedContent {
    return this.#node.render(buffer);
  }
}

export class CurrentLoop implements Iterable<KeyedProgramNode> {
  static create(
    list: Iterable<ReactiveParameter>,
    component: Component,
    key: AnyKey
  ): CurrentLoop {
    let index = OrderedIndex.create([...list], key);
    return new CurrentLoop(index, component);
  }

  readonly #index: OrderedIndex<unknown, ReactiveParameter>;
  readonly #component: Component;

  constructor(
    index: OrderedIndex<unknown, ReactiveParameter>,
    component: Component
  ) {
    this.#index = index;
    this.#component = component;
  }

  *[Symbol.iterator](): IterableIterator<KeyedProgramNode> {
    for (let [key, arg] of this.#index.entries()) {
      yield KeyedProgramNode.component(this.#component, arg, key);
    }
  }

  get keys(): readonly unknown[] {
    return this.#index.keys;
  }

  get(key: unknown): KeyedProgramNode | null {
    let arg = this.#index.get(key);

    if (arg === null) {
      return null;
    }

    return KeyedProgramNode.component(this.#component, arg, key);
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

  get(parameter: ReactiveParameter): KeyedProgramNode {
    return KeyedProgramNode.component(this.#component, parameter, this.#key);
  }

  get current(): CurrentLoop {
    return CurrentLoop.create(
      this.#iterable.current,
      this.#component,
      this.#key
    );
  }

  list(): DynamicListProgramNode {
    return DynamicListProgramNode.of(this);
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
      return StaticLoop.create(iterable.current, component, key);
    } else {
      return DynamicLoop.create(iterable, component, key);
    }
  },
} as const;

/**
 * The input for a `StaticListProgramNode` is a static iterable. It is static if all
 * of the elements of the iterable are also static.
 */
export class StaticListProgramNode
  implements AbstractContentProgramNode<RenderedStaticList>
{
  static of(loop: StaticLoop) {
    return new StaticListProgramNode([...loop], loop.metadata);
  }

  readonly #components: readonly KeyedProgramNode[];
  readonly metadata: BuildMetadata;

  constructor(
    components: readonly KeyedProgramNode[],
    metadata: BuildMetadata
  ) {
    this.#components = components;
    this.metadata = metadata;
  }

  render(buffer: TreeConstructor): RenderedStaticList {
    let content: KeyedContent[] = [];
    let isConstant = true;

    for (let component of this.#components) {
      let rendered = component.render(buffer);

      isConstant &&= rendered.metadata.isConstant;
      content.push(KeyedContent.create(component.key, rendered));
    }

    if (content.length === 0) {
      throw Error("todo: Empty list");
    } else {
      return RenderedStaticList.create(
        RenderSnapshot.of(NonemptyList.verify(content)),
        { isConstant }
      );
    }
  }
}

export type ContentsIndex = OrderedIndex<unknown, KeyedContent>;

export class RenderedStaticList extends RenderedContent {
  static create(
    artifacts: RenderSnapshot,
    metadata: RenderedContentMetadata
  ): RenderedStaticList {
    return new RenderedStaticList(artifacts, metadata);
  }

  readonly metadata: RenderedContentMetadata;
  readonly #artifacts: RenderSnapshot;

  constructor(artifacts: RenderSnapshot, metadata: RenderedContentMetadata) {
    super();
    this.#artifacts = artifacts;
    this.metadata = metadata;
  }

  [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot {
    return this.#artifacts.range(parent);
  }

  poll(inside: minimal.ParentNode): void {
    this.#artifacts.poll(inside);
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

  render(buffer: TreeConstructor): RenderedDynamicList {
    let contents: KeyedContent[] = [];
    let isConstant = true;

    let fragment = buffer.fragment((buffer) => {
      for (let content of this.#loop.current) {
        let rendered = content.render(buffer);

        isConstant &&= rendered.metadata.isConstant;
        contents.push(KeyedContent.create(content.key, content.render(buffer)));
      }
    });

    return RenderedDynamicList.create(
      this.#loop,
      ListArtifacts.create(
        { isStatic: false },
        RenderSnapshot.verified(contents)
      ),
      fragment.dom,
      { isConstant }
    );
  }
}

export class RenderedDynamicList extends RenderedContent {
  static create(
    loop: DynamicLoop,
    artifacts: ListArtifacts,
    fragment: LazyDOM<ContentRange>,
    metadata: RenderedContentMetadata
  ): RenderedDynamicList {
    return new RenderedDynamicList(loop, artifacts, fragment, metadata);
  }

  readonly #loop: DynamicLoop;
  readonly #artifacts: ListArtifacts;
  readonly #fragment: LazyDOM<ContentRange>;

  private constructor(
    loop: DynamicLoop,
    artifacts: ListArtifacts,
    fragment: LazyDOM<ContentRange>,
    readonly metadata: RenderedContentMetadata
  ) {
    super();
    this.#loop = loop;
    this.#artifacts = artifacts;
    this.#fragment = fragment;
  }

  [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot {
    return this.#fragment.get(parent).snapshot();
  }

  poll(inside: minimal.ParentNode): void {
    this.#artifacts.poll(this.#loop.current, inside);
  }
}
