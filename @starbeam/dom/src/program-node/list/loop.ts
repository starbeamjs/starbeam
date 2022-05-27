import type { minimal } from "@domtree/flavors";
import { NonemptyList, OrderedIndex } from "@starbeam/core";
import { CompositeInternals, Reactive, Static } from "@starbeam/reactive";
import {
  REACTIVE,
  type ReactiveInternals,
  type ReactiveProtocol,
} from "@starbeam/timeline";
import { expected, isPresent, verified } from "@starbeam/verify";
import type { DomEnvironment } from "../../dom.js";
import type { ContentRange } from "../../dom/streaming/compatible-dom.js";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../../dom/streaming/cursor.js";
import type { LazyDOM } from "../../dom/streaming/token.js";
import {
  ContentConstructor,
  TOKEN,
  TreeConstructor,
} from "../../dom/streaming/tree-constructor.js";
import { isComment } from "../../verify.js";
import type { Component } from "../component.js";
import { ContentProgramNode } from "../content.js";
import { RenderedCharacterData } from "../data.js";
import { RenderedContent } from "../interfaces/rendered-content.js";
import { ListArtifacts } from "./diff.js";
import { KeyedContent, RenderSnapshot } from "./snapshot.js";

export type ListProgramNode = StaticListProgramNode | DynamicListProgramNode;

export class StaticLoop {
  static create<P>(
    iterable: Iterable<P>,
    component: Component<P>,
    key: Key<P>
  ): StaticLoop {
    return new StaticLoop(
      [...iterable],
      key as Key<unknown>,
      component as Component
    );
  }

  readonly #list: readonly unknown[];
  readonly #key: Key<unknown>;
  readonly #component: Component;

  private constructor(
    list: readonly unknown[],
    key: Key<unknown>,
    component: Component
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

export type Key<P> = (input: P) => unknown;
export type AnyKey = Key<unknown>;

export class KeyedProgramNode extends ContentProgramNode {
  static component<P>(
    component: Component<P>,
    arg: P,
    key: unknown
  ): KeyedProgramNode {
    let node = component(arg);
    return new KeyedProgramNode(node, key);
  }

  static render(
    node: KeyedProgramNode,
    buffer: ContentConstructor
  ): KeyedContent {
    let content = node.render(buffer);
    return KeyedContent.create(node.key, content);
  }

  readonly #node: ContentProgramNode;

  private constructor(node: ContentProgramNode, readonly key: unknown) {
    super();
    this.#node = node;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#node[REACTIVE];
  }

  render(buffer: ContentConstructor): RenderedContent {
    return this.#node.render(buffer);
  }
}

export class CurrentLoop implements Iterable<KeyedProgramNode> {
  static create(
    list: Iterable<unknown>,
    component: Component,
    key: AnyKey
  ): CurrentLoop {
    let index = OrderedIndex.create([...list], key);
    return new CurrentLoop(index, component);
  }

  readonly #index: OrderedIndex<unknown, unknown>;
  readonly #component: Component;

  constructor(index: OrderedIndex<unknown, unknown>, component: Component) {
    this.#index = index;
    this.#component = component;
  }

  *[Symbol.iterator](): IterableIterator<KeyedProgramNode> {
    for (let [key, arg] of this.#index.entries()) {
      yield KeyedProgramNode.component(this.#component, arg, key);
    }
  }

  isEmpty(): boolean {
    return this.#index.list.length === 0;
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
  static create<P>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P>,
    key: Key<P>
  ): DynamicLoop {
    return new DynamicLoop(iterable, component as Component, key as AnyKey);
  }

  readonly #iterable: Reactive<Iterable<unknown>>;
  readonly #component: Component;
  readonly #key: AnyKey;

  constructor(
    iterable: Reactive<Iterable<unknown>>,
    component: Component,
    key: AnyKey
  ) {
    this.#iterable = iterable;
    this.#component = component;
    this.#key = key;
  }

  get reactive(): ReactiveProtocol {
    return this.#iterable;
  }

  get internals(): ReactiveInternals {
    return this.#iterable[REACTIVE];
  }

  get(parameter: unknown): KeyedProgramNode {
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
  from: <P>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P>,
    key: (input: P) => unknown
  ): Loop => {
    if (Reactive.isConstant(iterable)) {
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
export class StaticListProgramNode extends ContentProgramNode {
  static of(loop: StaticLoop) {
    return new StaticListProgramNode(
      [...loop],
      loop,
      // TODO: Make this initializable
      CompositeInternals([], "loop")
    );
  }

  readonly #components: readonly KeyedProgramNode[];
  readonly #loop: StaticLoop;
  #composite: ReactiveInternals;

  constructor(
    components: readonly KeyedProgramNode[],
    loop: StaticLoop,
    composite: ReactiveInternals
  ) {
    super();
    this.#components = components;
    this.#loop = loop;
    this.#composite = composite;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#composite;
  }

  render(buffer: TreeConstructor): RenderedContent {
    const content: KeyedContent[] = [];
    let isConstant = true;

    for (const component of this.#components) {
      const rendered = component.render(buffer);

      isConstant = isConstant && RenderedContent.isConstant(rendered);
      content.push(KeyedContent.create(component.key, rendered));
    }

    if (content.length === 0) {
      return RenderedCharacterData.create(
        Static(""),
        buffer.comment("", TOKEN).dom
      );
    } else {
      this.#composite = CompositeInternals(
        content.map((c) => c.content),
        "loop"
      );
      return RenderedStaticList.create(
        RenderSnapshot.of(NonemptyList.verified(content)),
        this.#composite
      );
    }
  }
}

export type ContentsIndex = OrderedIndex<unknown, KeyedContent>;

export class RenderedStaticList extends RenderedContent {
  static create(
    artifacts: RenderSnapshot,
    composite: ReactiveInternals
  ): RenderedStaticList {
    return new RenderedStaticList(artifacts, composite);
  }

  readonly #artifacts: RenderSnapshot;
  readonly #composite: ReactiveInternals;

  constructor(artifacts: RenderSnapshot, composite: ReactiveInternals) {
    super();
    this.#artifacts = artifacts;
    this.#composite = composite;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#composite;
  }

  [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot {
    let [start, end] = verified(
      this.#artifacts.boundaries,
      isPresent,
      expected
        .as(`artifact boundaries`)
        .when(`the list is a RenderedStaticList`)
    );

    return RangeSnapshot.forContent(parent, start.content, end.content);
  }

  initialize(inside: minimal.ParentNode): void {
    this.#artifacts.initialize(inside);
  }

  poll(inside: minimal.ParentNode): void {
    this.#artifacts.poll(inside);
  }
}

export class DynamicListProgramNode extends ContentProgramNode {
  static of(loop: DynamicLoop) {
    return new DynamicListProgramNode(loop);
  }

  readonly #loop: DynamicLoop;

  constructor(loop: DynamicLoop) {
    super();
    this.#loop = loop;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#loop.internals;
  }

  render(buffer: TreeConstructor): RenderedDynamicList {
    let { range, result: contents } = buffer.fragment((buffer) => {
      return [...this.#loop.current].map((keyed) => {
        let rendered = keyed.render(buffer);

        return KeyedContent.create(keyed.key, rendered);
      });
    });

    return RenderedDynamicList.create(
      this.#loop,
      ListArtifacts.create(this.#loop.reactive, RenderSnapshot.from(contents)),
      range.dom
    );
  }
}

class Fragment {
  static of(lazy: LazyDOM<ContentRange>): Fragment {
    return new Fragment(lazy, undefined);
  }

  readonly #lazy: LazyDOM<ContentRange>;
  #placeholder: minimal.ChildNode | null | undefined;

  constructor(
    lazy: LazyDOM<ContentRange>,
    placeholder: minimal.ChildNode | null | undefined
  ) {
    this.#lazy = lazy;
    this.#placeholder = placeholder;
  }

  get environment(): DomEnvironment {
    return this.#lazy.environment;
  }

  initialize(inside: minimal.ParentNode): void {
    this.#lazy.get(inside);
  }

  get(inside: minimal.ParentNode): minimal.ChildNode {
    if (this.#placeholder === undefined) {
      this.#placeholder = verified(
        this.#lazy.get(inside).asNode(),
        isComment,
        expected
          .as(`the ContentRange for a rendered list`)
          .when(`the list was empty`)
      );
    }

    return verified(
      this.#placeholder,
      isPresent,
      expected
        .as(`The ContentRange for a rendered list`)
        .when(`the list was empty`)
    );
  }

  set(placeholder: minimal.ChildNode | null): void {
    this.#placeholder = placeholder;
  }
}

export class RenderedDynamicList extends RenderedContent {
  static create(
    loop: DynamicLoop,
    artifacts: ListArtifacts,
    fragment: LazyDOM<ContentRange>
  ): RenderedDynamicList {
    return new RenderedDynamicList(loop, artifacts, Fragment.of(fragment));
  }

  readonly #loop: DynamicLoop;
  readonly #artifacts: ListArtifacts;
  readonly #fragment: Fragment;

  private constructor(
    loop: DynamicLoop,
    artifacts: ListArtifacts,
    fragment: Fragment
  ) {
    super();
    this.#loop = loop;
    this.#artifacts = artifacts;
    this.#fragment = fragment;
  }

  get [REACTIVE](): ReactiveInternals {
    return this.#artifacts.reactive[REACTIVE];
  }

  [RANGE_SNAPSHOT](parent: minimal.ParentNode): RangeSnapshot {
    let boundaries = this.#artifacts.boundaries;

    if (boundaries) {
      let [start, end] = boundaries;
      return RangeSnapshot.forContent(parent, start.content, end.content);
    } else {
      let placeholder = this.#fragment.get(parent);
      return RangeSnapshot.create(this.#fragment.environment, placeholder);
    }
  }

  initialize(inside: minimal.ParentNode): void {
    this.#fragment.initialize(inside);
    this.#artifacts.initialize(inside);
  }

  poll(inside: minimal.ParentNode): void {
    let placeholder = this.#artifacts.poll(
      this.#loop.current,
      inside,
      this[RANGE_SNAPSHOT](inside)
    );

    if (placeholder === undefined) {
      return;
    } else {
      this.#fragment.set(placeholder);
    }
  }
}
