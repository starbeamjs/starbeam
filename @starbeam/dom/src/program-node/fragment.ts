import type { ParentNode } from "@domtree/minimal";
import { has, NonemptyList } from "@starbeam/core";
import { Composite } from "@starbeam/reactive";
import { REACTIVE, ReactiveInternals } from "@starbeam/timeline";
import { verify } from "@starbeam/verify";
import { RangeSnapshot, RANGE_SNAPSHOT } from "../dom/streaming/cursor.js";
import type { ContentConstructor } from "../dom/streaming/tree-constructor.js";
import type { ContentProgramNode } from "./content.js";
import { RenderedContent } from "./interfaces/rendered-content.js";

export class FragmentProgramNode implements ContentProgramNode {
  static of(children: NonemptyList<ContentProgramNode>): FragmentProgramNode {
    return new FragmentProgramNode(
      children,
      Composite("Fragment").set(children.asArray().map(ReactiveInternals.get))
    );
  }

  readonly #children: NonemptyList<ContentProgramNode>;
  readonly #composite: Composite;

  constructor(
    children: NonemptyList<ContentProgramNode>,
    composite: Composite
  ) {
    this.#children = children;
    this.#composite = composite;
  }

  get [REACTIVE](): ReactiveInternals {
    return ReactiveInternals.get(this.#composite);
  }

  render(buffer: ContentConstructor): RenderedFragmentNode {
    let children = this.#children
      .asArray()
      .map((child) => child.render(buffer));

    return RenderedFragmentNode.create(children, this.#composite);
  }
}

export class RenderedFragmentNode extends RenderedContent {
  static create(
    children: readonly RenderedContent[],
    composite: Composite
  ): RenderedFragmentNode {
    return new RenderedFragmentNode(children, composite);
  }

  #content: readonly RenderedContent[];
  #composite: Composite;

  private constructor(
    content: readonly RenderedContent[],
    composite: Composite
  ) {
    super();
    this.#content = content;
    this.#composite = composite;
  }

  get [REACTIVE](): ReactiveInternals {
    return ReactiveInternals.get(this.#composite);
  }

  [RANGE_SNAPSHOT](inside: ParentNode): RangeSnapshot {
    verify(this.#content, has.items);

    let first = this.#content[0];
    let last = this.#content[this.#content.length - 1];
    return first[RANGE_SNAPSHOT](inside).join(last[RANGE_SNAPSHOT](inside));
  }

  poll(inside: ParentNode): void {
    for (let content of this.#content) {
      content.poll(inside);
    }
  }

  initialize(inside: ParentNode): void {
    for (let content of this.#content) {
      content.initialize(inside);
    }
  }
}

export class FragmentProgramNodeBuilder {
  static build(
    build: (builder: FragmentProgramNodeBuilder) => void
  ): FragmentProgramNode {
    let builder = new FragmentProgramNodeBuilder();
    build(builder);
    return builder.finalize();
  }

  readonly #children: ContentProgramNode[] = [];

  append(output: ContentProgramNode): this {
    this.#children.push(output);
    return this;
  }

  finalize(): FragmentProgramNode {
    return FragmentProgramNode.of(NonemptyList.verified(this.#children));
  }
}
